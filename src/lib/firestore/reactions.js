import {
  doc,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  increment,
  collection,
  query,
  where,
  documentId,
} from 'firebase/firestore';
import { db } from '../db';
import { REACTION_IDS } from '../reactions';

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function reactionDocId(userId, targetType, targetId) {
  return `${userId}_${targetType}_${targetId}`;
}

function targetRef(targetType, targetId, threadId) {
  return targetType === 'thread'
    ? doc(db, 'threads', targetId)
    : doc(db, 'threads', threadId, 'comments', targetId);
}

/**
 * Create, switch, or toggle-off a reaction.
 * Returns { reaction: string|null, switched: bool }.
 */
export async function setReaction({ userId, targetType, targetId, threadId, reactionId }) {
  if (!REACTION_IDS.includes(reactionId)) throw new Error('Invalid reactionId');

  const rxRef = doc(db, 'reactions', reactionDocId(userId, targetType, targetId));
  const tRef = targetRef(targetType, targetId, threadId);

  const existing = await getDoc(rxRef);
  const batch = writeBatch(db);

  if (!existing.exists()) {
    batch.set(rxRef, {
      userId,
      targetType,
      targetId,
      threadId,
      reactionId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.update(tRef, { [`reactionCounts.${reactionId}`]: increment(1) });
    await batch.commit();
    return { reaction: reactionId, switched: false };
  }

  const prev = existing.data().reactionId;

  if (prev === reactionId) {
    batch.delete(rxRef);
    batch.update(tRef, { [`reactionCounts.${reactionId}`]: increment(-1) });
    await batch.commit();
    return { reaction: null, switched: false };
  }

  batch.update(rxRef, { reactionId, updatedAt: serverTimestamp() });
  batch.update(tRef, {
    [`reactionCounts.${prev}`]: increment(-1),
    [`reactionCounts.${reactionId}`]: increment(1),
  });
  await batch.commit();
  return { reaction: reactionId, switched: true };
}

/**
 * Batch-load the current user's reactions for a list of targets.
 * Returns Map<"targetType_targetId", reactionId>.
 * Uses getDocs + documentId() 'in' query — 1 request per 30 targets instead of N individual reads.
 */
export async function getUserReactionsForTargets(userId, targets) {
  if (!targets.length) return new Map();
  const docIds = targets.map(({ targetType, targetId }) =>
    reactionDocId(userId, targetType, targetId),
  );
  const chunks = chunkArray(docIds, 30);
  const snapshots = await Promise.all(
    chunks.map((ids) =>
      getDocs(query(collection(db, 'reactions'), where(documentId(), 'in', ids))),
    ),
  );
  const map = new Map();
  snapshots.forEach((snap) => {
    snap.docs.forEach((d) => {
      const { targetType, targetId, reactionId } = d.data();
      map.set(`${targetType}_${targetId}`, reactionId);
    });
  });
  return map;
}
