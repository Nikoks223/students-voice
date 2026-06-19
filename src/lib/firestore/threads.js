import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  increment,
  writeBatch,
  serverTimestamp,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { getForumById } from '../../data/forums';
import { invalidateLeaderboardCache } from './stats';
import { validatePoll, generateOptionId } from './polls';
import { checkAndIncrement } from './rateLimit';
import { sanitizeForFirestore } from './_utils';

const PAGE_SIZE = 10;

function mapThread(snap) {
  const data = snap.data();
  // Enrich with static forum metadata (forumName/forumColor were not seeded on thread docs)
  const forum = getForumById(data.forumId);
  return {
    id: snap.id,
    ...data,
    forumName: data.forumName ?? forum?.name ?? data.forumId,
    forumColor: data.forumColor ?? forum?.color ?? '#716B7E',
    forumIcon: data.forumIcon ?? forum?.icon ?? '💬',
  };
}

/**
 * Fetch a paginated page of threads from the home feed.
 * sortBy: 'new' | 'popular' | 'trending' | 'featured'
 *
 * Required Firestore indexes (create via console link on first error):
 *   - featured: isFeatured ASC + createdAt DESC
 */
export async function fetchThreads({ sortBy = 'new', pageSize = PAGE_SIZE, lastDoc = null } = {}) {
  const ref = collection(db, 'threads');
  const constraints = [];

  if (sortBy === 'featured') {
    // Index needed: isFeatured ASC, createdAt DESC
    constraints.push(where('isFeatured', '==', true));
    constraints.push(orderBy('createdAt', 'desc'));
  } else if (sortBy === 'popular' || sortBy === 'trending') {
    constraints.push(orderBy('upvoteCount', 'desc'));
  } else {
    constraints.push(orderBy('createdAt', 'desc'));
  }

  constraints.push(limit(pageSize));
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(ref, ...constraints));
  const threads = snap.docs.map(mapThread);
  const newLastDoc = snap.docs[snap.docs.length - 1] ?? null;
  return { threads, lastDoc: newLastDoc, hasMore: snap.docs.length === pageSize };
}

/**
 * Fetch threads for a specific forum.
 * Required Firestore indexes:
 *   - forumId ASC + createdAt DESC
 *   - forumId ASC + upvoteCount DESC
 */
export async function fetchThreadsByForum({
  forumId,
  sortBy = 'new',
  pageSize = PAGE_SIZE,
  lastDoc = null,
}) {
  const ref = collection(db, 'threads');
  const constraints = [where('forumId', '==', forumId)];

  if (sortBy === 'popular' || sortBy === 'trending') {
    // Index needed: forumId ASC + upvoteCount DESC
    constraints.push(orderBy('upvoteCount', 'desc'));
  } else {
    // Index needed: forumId ASC + createdAt DESC
    constraints.push(orderBy('createdAt', 'desc'));
  }

  constraints.push(limit(pageSize));
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(ref, ...constraints));
  const threads = snap.docs.map(mapThread);
  const newLastDoc = snap.docs[snap.docs.length - 1] ?? null;
  return { threads, lastDoc: newLastDoc, hasMore: snap.docs.length === pageSize };
}

export async function fetchThreadById(threadId) {
  const snap = await getDoc(doc(db, 'threads', threadId));
  if (!snap.exists()) return null;
  return mapThread(snap);
}

/** Fire-and-forget view counter increment. */
export function incrementThreadViews(threadId) {
  updateDoc(doc(db, 'threads', threadId), { viewCount: increment(1) }).catch(() => {});
}

export async function createThread({
  forumId,
  title,
  body,
  attachments = [],
  authorId,
  authorUsername,
  authorSchool,
  schoolId,
  poll = null,
}) {
  await checkAndIncrement(authorId, 'thread', 5, 3600);

  const threadRef = doc(collection(db, 'threads'));
  const today = new Date().toISOString().split('T')[0];

  // Build poll object if provided — validate defensively at write time.
  let pollData = null;
  if (poll) {
    const { valid, error } = validatePoll(poll);
    if (!valid) throw new Error(`Invalid poll: ${error}`);
    pollData = {
      question: poll.question.trim(),
      options: poll.options.map((o, i) => ({
        id: generateOptionId(i),
        text: o.text.trim(),
        voteCount: 0,
      })),
      totalVotes: 0,
      expiresAt: poll.expiresAt ? Timestamp.fromDate(new Date(poll.expiresAt)) : null,
      hideResultsUntilVote: poll.hideResultsUntilVote ?? false,
      createdAt: serverTimestamp(),
    };
  }

  const batch = writeBatch(db);
  batch.set(
    threadRef,
    sanitizeForFirestore({
      forumId,
      authorId,
      authorUsername,
      authorSchool,
      title,
      body,
      attachments,
      ...(pollData ? { poll: pollData } : {}),
      upvoteCount: 0,
      commentCount: 0,
      viewCount: 0,
      isFeatured: false,
      isEdited: false,
      isDeleted: 'no',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  batch.set(
    doc(db, 'stats', 'global'),
    { totalThreads: increment(1), updatedAt: serverTimestamp() },
    { merge: true },
  );
  batch.set(
    doc(db, 'stats', 'daily', 'entries', today),
    { date: today, newThreads: increment(1), updatedAt: serverTimestamp() },
    { merge: true },
  );
  // School forum (school-<id>) → attribute to that school; topic forum → attribute to author's school.
  const statSchoolId = forumId?.startsWith('school-')
    ? forumId.slice('school-'.length)
    : schoolId || '';
  if (statSchoolId)
    batch.set(
      doc(db, 'stats', 'schools', 'entries', statSchoolId),
      { schoolId: statSchoolId, threadCount: increment(1), updatedAt: serverTimestamp() },
      { merge: true },
    );
  batch.set(
    doc(db, 'stats', 'forums', 'entries', forumId),
    { forumId, threadCount: increment(1), updatedAt: serverTimestamp() },
    { merge: true },
  );
  // Per-user counter — merge so the doc is auto-created if missing
  batch.set(
    doc(db, 'stats', 'users', 'entries', authorId),
    {
      userId: authorId,
      username: authorUsername,
      threadCount: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();
  invalidateLeaderboardCache();

  // Best-effort forum counter — silently ignored if security rules deny writes to forums
  updateDoc(doc(db, 'forums', forumId), {
    threadCount: increment(1),
    lastActivityAt: serverTimestamp(),
  }).catch(() => {});

  // Fan-out new_thread notifications to followers (capped at 100 for MVP;
  // for scale, move this to a server-side Cloud Function triggered on thread create).
  (async () => {
    try {
      const { fetchFollowers } = await import('./userFollows.js');
      const { followers } = await fetchFollowers(authorId, { pageSize: 100 });
      if (!followers.length) return;
      const threadId = threadRef.id;
      for (let i = 0; i < followers.length; i += 450) {
        const fanBatch = writeBatch(db);
        followers.slice(i, i + 450).forEach(({ followerId }) => {
          if (followerId === authorId) return;
          fanBatch.set(doc(collection(db, 'notifications')), {
            userId: followerId,
            type: 'new_thread',
            actorId: authorId,
            actorUsername: authorUsername,
            threadId,
            forumId,
            threadTitle: title,
            read: false,
            createdAt: serverTimestamp(),
          });
        });
        await fanBatch.commit();
      }
    } catch { /* intentional */ }
  })();

  return threadRef.id;
}

export async function updateThread(threadId, { title, body, attachments }) {
  const updates = { title, body, isEdited: true, editedAt: serverTimestamp(), updatedAt: serverTimestamp() };
  if (attachments !== undefined) updates.attachments = attachments;
  await updateDoc(doc(db, 'threads', threadId), updates);
}

export async function deleteThreadByUser(threadId) {
  await updateDoc(doc(db, 'threads', threadId), {
    isDeleted: 'by_user',
    body: '',
    updatedAt: serverTimestamp(),
  });
}

export async function deleteThreadByModerator(threadId) {
  await updateDoc(doc(db, 'threads', threadId), {
    isDeleted: 'by_moderator',
    body: '',
    updatedAt: serverTimestamp(),
  });
}

export async function setThreadFeatured(threadId, featured) {
  await updateDoc(doc(db, 'threads', threadId), { isFeatured: featured });
}

export async function removeThreadAttachment(threadId, adminId) {
  await updateDoc(doc(db, 'threads', threadId), {
    attachmentsRemoved: true,
    attachmentsRemovedAt: serverTimestamp(),
    attachmentsRemovedBy: adminId,
  });
  // Cloudinary asset is NOT auto-deleted — unsigned uploads cannot trigger signed deletion;
  // clean up via the Cloudinary media library if needed.
  await addDoc(collection(db, 'moderationLog'), {
    adminId,
    action: 'removed_attachment',
    targetType: 'thread',
    targetId: threadId,
    reason: 'attachment_removal',
    reportId: null,
    createdAt: serverTimestamp(),
  });
}
