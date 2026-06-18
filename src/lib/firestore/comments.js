import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { invalidateLeaderboardCache } from './stats';
import { createNotification } from './notifications';
import { getForumFollowerIds, getThreadFollowerIds } from './follows';
import { checkAndIncrement } from './rateLimit';
import { sanitizeForFirestore } from './_utils';

function mapComment(snap) {
  return { id: snap.id, ...snap.data() };
}

/**
 * Fetch all comments for a thread sorted client-side.
 * sortBy: 'best' | 'new' | 'old'
 */
export async function fetchComments(threadId, { sortBy = 'best' } = {}) {
  const snap = await getDocs(collection(db, 'threads', threadId, 'comments'));
  const comments = snap.docs.map(mapComment);

  return comments.sort((a, b) => {
    if (sortBy === 'best') return b.upvoteCount - a.upvoteCount;
    const at = a.createdAt?.toDate?.() ?? new Date(a.createdAt);
    const bt = b.createdAt?.toDate?.() ?? new Date(b.createdAt);
    return sortBy === 'old' ? at - bt : bt - at;
  });
}

export async function createComment(
  threadId,
  {
    body,
    parentCommentId = null,
    mentions = [],
    authorId,
    authorUsername,
    authorSchool,
    schoolId,
  },
) {
  await checkAndIncrement(authorId, 'comment', 30, 3600);

  const threadSnap = await getDoc(doc(db, 'threads', threadId));
  const threadData = threadSnap.data() ?? {};
  const forumId = threadData.forumId ?? null;
  const threadTitle = threadData.title ?? '';
  const forumName = threadData.forumName ?? forumId ?? '';

  const commentRef = doc(collection(db, 'threads', threadId, 'comments'));
  const today = new Date().toISOString().split('T')[0];

  const batch = writeBatch(db);
  batch.set(
    commentRef,
    sanitizeForFirestore({
      authorId,
      authorUsername,
      authorSchool,
      parentCommentId: parentCommentId ?? null,
      body,
      mentions,
      upvoteCount: 0,
      isEdited: false,
      isDeleted: 'no',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  batch.update(doc(db, 'threads', threadId), {
    commentCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  batch.set(
    doc(db, 'stats', 'global'),
    { totalComments: increment(1), updatedAt: serverTimestamp() },
    { merge: true },
  );
  batch.set(
    doc(db, 'stats', 'daily', 'entries', today),
    { date: today, newComments: increment(1), updatedAt: serverTimestamp() },
    { merge: true },
  );
  // School forum (school-<id>) → attribute to that school; topic forum → attribute to author's school.
  const statSchoolId = forumId?.startsWith('school-')
    ? forumId.slice('school-'.length)
    : schoolId || '';
  if (statSchoolId)
    batch.set(
      doc(db, 'stats', 'schools', 'entries', statSchoolId),
      { schoolId: statSchoolId, commentCount: increment(1), updatedAt: serverTimestamp() },
      { merge: true },
    );
  if (forumId)
    batch.set(
      doc(db, 'stats', 'forums', 'entries', forumId),
      { forumId, commentCount: increment(1), updatedAt: serverTimestamp() },
      { merge: true },
    );
  batch.set(
    doc(db, 'stats', 'users', 'entries', authorId),
    {
      userId: authorId,
      username: authorUsername,
      commentCount: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();
  invalidateLeaderboardCache();

  if (forumId) {
    updateDoc(doc(db, 'forums', forumId), { lastActivityAt: serverTimestamp() }).catch(() => {});
  }

  // ── Notifications (best-effort, never throw) ───────────────────────────────

  // 1. Mention notifications — resolve each username to a userId via usernames collection
  if (mentions.length > 0) {
    Promise.all(
      mentions.map(async (username) => {
        try {
          const snap = await getDoc(doc(db, 'usernames', username.toLowerCase()));
          if (!snap.exists()) return;
          const mentionedUserId = snap.data().userId;
          if (!mentionedUserId || mentionedUserId === authorId) return;
          await createNotification({
            userId: mentionedUserId,
            type: 'mention',
            fromUserId: authorId,
            fromUsername: authorUsername,
            threadId,
            threadTitle,
            forumId,
            forumName,
            commentId: commentRef.id,
          });
        } catch { /* intentional */ }
      }),
    ).catch(() => {});
  }

  // 2. Forum-follow notifications — notify all forum followers except the author
  if (forumId) {
    (async () => {
      try {
        const followerIds = await getForumFollowerIds(forumId);
        await Promise.all(
          followerIds
            .filter((uid) => uid !== authorId)
            .map((uid) =>
              createNotification({
                userId: uid,
                type: 'forum_comment',
                fromUserId: authorId,
                fromUsername: authorUsername,
                threadId,
                threadTitle,
                forumId,
                forumName,
                commentId: commentRef.id,
              }).catch(() => {}),
            ),
        );
      } catch { /* intentional */ }
    })();
  }

  // 3. Thread-follow notifications — notify all thread followers except the author
  (async () => {
    try {
      const threadFollowerIds = await getThreadFollowerIds(threadId);
      // Collect userIds already notified via forum follow to avoid duplicates
      const forumFollowers = forumId ? await getForumFollowerIds(forumId).catch(() => []) : [];
      const forumFollowerSet = new Set(forumFollowers);

      await Promise.all(
        threadFollowerIds
          .filter((uid) => uid !== authorId && !forumFollowerSet.has(uid))
          .map((uid) =>
            createNotification({
              userId: uid,
              type: 'thread_comment',
              fromUserId: authorId,
              fromUsername: authorUsername,
              threadId,
              threadTitle,
              forumId,
              forumName,
              commentId: commentRef.id,
            }).catch(() => {}),
          ),
      );
    } catch { /* intentional */ }
  })();

  return commentRef.id;
}

export async function updateComment(threadId, commentId, { body, mentions = [] }) {
  await updateDoc(doc(db, 'threads', threadId, 'comments', commentId), {
    body,
    mentions,
    isEdited: true,
    editedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCommentByUser(threadId, commentId) {
  await updateDoc(doc(db, 'threads', threadId, 'comments', commentId), {
    isDeleted: 'by_user',
    body: '',
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCommentByModerator(threadId, commentId) {
  await updateDoc(doc(db, 'threads', threadId, 'comments', commentId), {
    isDeleted: 'by_moderator',
    body: '',
    updatedAt: serverTimestamp(),
  });
}
