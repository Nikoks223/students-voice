import {
  collection,
  query,
  where,
  orderBy,
  limit,
  doc,
  getDoc,
  getDocs,
  startAfter,
  writeBatch,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase';
import { createNotification } from './notifications';

function followDocId(followerId, followingId) {
  return `${followerId}_${followingId}`;
}

export async function followUser({ followerId, followingId, followerUsername, followingUsername }) {
  if (followerId === followingId) return { followed: false };

  const batch = writeBatch(db);

  batch.set(doc(db, 'userFollows', followDocId(followerId, followingId)), {
    followerId,
    followingId,
    createdAt: serverTimestamp(),
  });
  batch.set(
    doc(db, 'stats', 'users', 'entries', followingId),
    {
      userId: followingId,
      username: followingUsername,
      followerCount: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  batch.set(
    doc(db, 'stats', 'users', 'entries', followerId),
    {
      userId: followerId,
      username: followerUsername,
      followingCount: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();

  // Notification for the followed user — outside the batch so a notification
  // failure never rolls back the follow itself.
  createNotification({
    userId: followingId,
    type: 'new_follower',
    actorId: followerId,
    actorUsername: followerUsername,
  }).catch(() => {});

  return { followed: true };
}

export async function unfollowUser({ followerId, followingId }) {
  const batch = writeBatch(db);

  batch.delete(doc(db, 'userFollows', followDocId(followerId, followingId)));
  batch.set(
    doc(db, 'stats', 'users', 'entries', followingId),
    {
      followerCount: increment(-1),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  batch.set(
    doc(db, 'stats', 'users', 'entries', followerId),
    {
      followingCount: increment(-1),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
  return { followed: false };
}

export async function isFollowing(followerId, followingId) {
  const snap = await getDoc(doc(db, 'userFollows', followDocId(followerId, followingId)));
  return snap.exists();
}

export async function fetchFollowers(userId, { pageSize = 20, lastDoc = null } = {}) {
  const constraints = [
    where('followingId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  ];
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(collection(db, 'userFollows'), ...constraints));
  return {
    followers: snap.docs.map((d) => ({ ...d.data(), _snap: d })),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === pageSize,
  };
}

export async function fetchFollowing(userId, { pageSize = 20, lastDoc = null } = {}) {
  const constraints = [
    where('followerId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  ];
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(collection(db, 'userFollows'), ...constraints));
  return {
    following: snap.docs.map((d) => ({ ...d.data(), _snap: d })),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === pageSize,
  };
}
