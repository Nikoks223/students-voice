import {
  doc,
  getDoc,
  getDocs,
  addDoc,
  writeBatch,
  increment,
  serverTimestamp,
  collection,
  query,
  where,
  documentId,
} from 'firebase/firestore';
import { db } from '../db';

function upvoteDocId(userId, targetType, targetId) {
  return `${userId}_${targetType}_${targetId}`;
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function toggleUpvote({ userId, targetType, targetId, threadId, actorUsername, forumId }) {
  const upvoteRef = doc(db, 'upvotes', upvoteDocId(userId, targetType, targetId));
  const snap = await getDoc(upvoteRef);

  const targetRef =
    targetType === 'thread'
      ? doc(db, 'threads', targetId)
      : doc(db, 'threads', threadId, 'comments', targetId);

  const today = new Date().toISOString().split('T')[0];
  const globalRef = doc(db, 'stats', 'global');
  const dailyRef = doc(db, 'stats', 'daily', 'entries', today);
  const batch = writeBatch(db);

  if (snap.exists()) {
    batch.delete(upvoteRef);
    batch.update(targetRef, { upvoteCount: increment(-1) });
    batch.set(
      globalRef,
      { totalUpvotes: increment(-1), updatedAt: serverTimestamp() },
      { merge: true },
    );
    batch.set(
      dailyRef,
      { date: today, newUpvotes: increment(-1), updatedAt: serverTimestamp() },
      { merge: true },
    );
    await batch.commit();
    return { voted: false };
  } else {
    batch.set(upvoteRef, { userId, targetType, targetId, threadId, createdAt: serverTimestamp() });
    batch.update(targetRef, { upvoteCount: increment(1) });
    batch.set(
      globalRef,
      { totalUpvotes: increment(1), updatedAt: serverTimestamp() },
      { merge: true },
    );
    batch.set(
      dailyRef,
      { date: today, newUpvotes: increment(1), updatedAt: serverTimestamp() },
      { merge: true },
    );
    await batch.commit();

    // Fire-and-forget: notify the author (skip if upvoter is the author)
    if (actorUsername) {
      getDoc(targetRef).then(async (targetSnap) => {
        if (!targetSnap.exists()) return;
        const authorId = targetSnap.data().authorId;
        console.log('[upvote-notif] authorId:', authorId, 'userId:', userId, 'targetType:', targetType, 'threadId:', threadId);
        if (!authorId || authorId === userId) return;
        const notifPayload = {
          userId: authorId,
          type: 'upvote',
          actorId: userId,
          actorUsername,
          threadId: threadId ?? targetId,
          forumId: forumId ?? null,
          targetType,
          targetId,
          read: false,
          createdAt: serverTimestamp(),
        };
        console.log('[upvote-notif] PAYLOAD:', JSON.stringify(notifPayload, null, 2));
        await addDoc(collection(db, 'notifications'), notifPayload);
      }).catch((err) => { console.log('[upvote-notif] CAUGHT ERROR:', err?.code, err?.message, err); });
    }

    return { voted: true };
  }
}

// One getDocs query per chunk of 30 instead of N individual getDoc calls.
// Firestore 'in' supports up to 30 values; chunks handle larger pages.
export async function getUserUpvotesForTargets(userId, targets) {
  if (!targets.length) return new Set();
  const docIds = targets.map(({ targetType, targetId }) =>
    upvoteDocId(userId, targetType, targetId),
  );
  const chunks = chunkArray(docIds, 30);
  const snapshots = await Promise.all(
    chunks.map((ids) =>
      getDocs(query(collection(db, 'upvotes'), where(documentId(), 'in', ids))),
    ),
  );
  const voted = new Set();
  snapshots.forEach((snap) => {
    snap.docs.forEach((d) => {
      const { targetType, targetId } = d.data();
      voted.add(`${targetType}_${targetId}`);
    });
  });
  return voted;
}
