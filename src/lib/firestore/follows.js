import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// Deterministic doc ID: lets us use getDoc to check follow status in O(1)
function followDocId(userId, forumId) {
  return `${userId}_${forumId}`;
}

export async function followForum(userId, forumId) {
  await setDoc(doc(db, 'follows', followDocId(userId, forumId)), {
    userId,
    forumId,
    createdAt: serverTimestamp(),
  });
}

export async function unfollowForum(userId, forumId) {
  await deleteDoc(doc(db, 'follows', followDocId(userId, forumId)));
}

export async function isFollowingForum(userId, forumId) {
  const snap = await getDoc(doc(db, 'follows', followDocId(userId, forumId)));
  return snap.exists();
}

/** Returns array of userIds who follow the given forum. Used for notification fan-out. */
export async function getForumFollowerIds(forumId) {
  const snap = await getDocs(query(collection(db, 'follows'), where('forumId', '==', forumId)));
  return snap.docs.map((d) => d.data().userId);
}

// ── Thread follows (separate collection) ─────────────────────────────────────

function threadFollowDocId(userId, threadId) {
  return `${userId}_${threadId}`;
}

export async function followThread(userId, threadId) {
  await setDoc(doc(db, 'threadFollows', threadFollowDocId(userId, threadId)), {
    userId,
    threadId,
    createdAt: serverTimestamp(),
  });
}

export async function unfollowThread(userId, threadId) {
  await deleteDoc(doc(db, 'threadFollows', threadFollowDocId(userId, threadId)));
}

export async function isFollowingThread(userId, threadId) {
  const snap = await getDoc(doc(db, 'threadFollows', threadFollowDocId(userId, threadId)));
  return snap.exists();
}

/** Returns array of userIds who follow the given thread. Used for notification fan-out. */
export async function getThreadFollowerIds(threadId) {
  const snap = await getDocs(
    query(collection(db, 'threadFollows'), where('threadId', '==', threadId)),
  );
  return snap.docs.map((d) => d.data().userId);
}
