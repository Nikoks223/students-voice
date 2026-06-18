import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  documentId,
} from 'firebase/firestore';
// getDoc is used only by isSaved (initial load check), not by toggleSavedPost.
import { db } from '../firebase';

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Deterministic ID prevents duplicate saves structurally — no extra uniqueness check needed.
export const savedPostId = (userId, threadId) => `${userId}_${threadId}`;

export async function isSaved(userId, threadId) {
  const snap = await getDoc(doc(db, 'savedPosts', savedPostId(userId, threadId)));
  return snap.exists();
}

/**
 * Batch-check which of the given threadIds are saved by userId.
 * Returns Set<threadId> — 1 query per 30 threads instead of N individual reads.
 */
export async function getUserSavedBatch(userId, threadIds) {
  if (!threadIds.length) return new Set();
  const docIds = threadIds.map((id) => savedPostId(userId, id));
  const chunks = chunkArray(docIds, 30);
  const snapshots = await Promise.all(
    chunks.map((ids) =>
      getDocs(query(collection(db, 'savedPosts'), where(documentId(), 'in', ids))),
    ),
  );
  const saved = new Set();
  snapshots.forEach((snap) => {
    snap.docs.forEach((d) => saved.add(d.data().threadId));
  });
  return saved;
}

/**
 * Toggle save/unsave for a thread.
 * Pass currentlySaved (the state BEFORE the toggle) so we skip the getDoc
 * existence check — the caller (SaveButton) already holds that state.
 *
 * Denormalization trade-off: if the original thread is later edited or deleted,
 * the savedPost row keeps the snapshot from save time. This is intentional —
 * saves are "moments in time," and it avoids N+1 reads on the /saved page.
 *
 * Returns { saved: boolean }.
 */
export async function toggleSavedPost({ userId, thread, currentlySaved }) {
  const ref = doc(db, 'savedPosts', savedPostId(userId, thread.id));

  if (currentlySaved) {
    await deleteDoc(ref);
    return { saved: false };
  }

  await setDoc(ref, {
    userId,
    threadId: thread.id,
    threadTitle: thread.title,
    forumId: thread.forumId,
    forumName: thread.forumName ?? '',
    forumIcon: thread.forumIcon ?? '',
    forumColor: thread.forumColor ?? '#716B7E',
    authorUsername: thread.authorUsername ?? '',
    savedAt: serverTimestamp(),
  });
  return { saved: true };
}

export async function fetchSavedPosts(userId, { pageSize = 20, lastDoc = null } = {}) {
  const constraints = [where('userId', '==', userId), orderBy('savedAt', 'desc'), limit(pageSize)];
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(collection(db, 'savedPosts'), ...constraints));
  return {
    posts: snap.docs.map((d) => ({ id: d.id, ...d.data(), _snap: d })),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === pageSize,
  };
}
