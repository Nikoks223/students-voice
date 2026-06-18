import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  addDoc,
  updateDoc,
  writeBatch,
  doc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export async function createNotification({ userId, type, ...payload }) {
  await addDoc(collection(db, 'notifications'), {
    userId,
    type,
    read: false,
    createdAt: serverTimestamp(),
    ...payload,
  });
}

export async function fetchNotifications(userId, { pageSize = 30 } = {}) {
  const snap = await getDocs(
    query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchNotificationsPage(userId, { pageSize = 20, lastDoc = null } = {}) {
  const constraints = [
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    ...(lastDoc ? [startAfter(lastDoc)] : []),
    limit(pageSize),
  ];
  const snap = await getDocs(query(collection(db, 'notifications'), ...constraints));
  return {
    notifications: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === pageSize,
  };
}

export async function markAsRead(notificationId) {
  await updateDoc(doc(db, 'notifications', notificationId), {
    read: true,
    readAt: serverTimestamp(),
  });
}

export async function markAllAsRead(userId) {
  const snap = await getDocs(
    query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false),
      limit(450),
    ),
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true, readAt: serverTimestamp() }));
  await batch.commit();
}

export async function markThreadNotificationsRead(userId, threadId) {
  const snap = await getDocs(
    query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('threadId', '==', threadId),
      where('read', '==', false),
    ),
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true, readAt: serverTimestamp() }));
  await batch.commit();
}

/** Returns an unsubscribe function. Calls callback(count) on every change. */
export function subscribeToUnreadCount(userId, callback) {
  return onSnapshot(
    query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false),
    ),
    (snap) => callback(snap.size),
    () => callback(0),
  );
}
