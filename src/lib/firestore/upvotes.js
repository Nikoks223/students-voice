import {
  doc,
  getDoc,
  getDocs,
  addDoc,
  runTransaction,
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

  const targetRef =
    targetType === 'thread'
      ? doc(db, 'threads', targetId)
      : doc(db, 'threads', threadId, 'comments', targetId);

  const today = new Date().toISOString().split('T')[0];
  const globalRef = doc(db, 'stats', 'global');
  const dailyRef = doc(db, 'stats', 'daily', 'entries', today);

  // A transaction keeps the read of the upvote doc and the counter writes
  // atomic, so rapid double-toggles can't double-count or drift the counter.
  const voted = await runTransaction(db, async (txn) => {
    const snap = await txn.get(upvoteRef);
    const delta = snap.exists() ? -1 : 1;

    if (snap.exists()) {
      txn.delete(upvoteRef);
    } else {
      txn.set(upvoteRef, { userId, targetType, targetId, threadId, createdAt: serverTimestamp() });
    }
    txn.update(targetRef, { upvoteCount: increment(delta) });
    txn.set(
      globalRef,
      { totalUpvotes: increment(delta), updatedAt: serverTimestamp() },
      { merge: true },
    );
    txn.set(
      dailyRef,
      { date: today, newUpvotes: increment(delta), updatedAt: serverTimestamp() },
      { merge: true },
    );
    return delta === 1;
  });

  // Fire-and-forget: notify the author (skip if upvoter is the author)
  if (voted && actorUsername) {
    getDoc(targetRef)
      .then(async (targetSnap) => {
        if (!targetSnap.exists()) return;
        const authorId = targetSnap.data().authorId;
        if (!authorId || authorId === userId) return;
        await addDoc(collection(db, 'notifications'), {
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
        });
      })
      .catch(() => {});
  }

  return { voted };
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
