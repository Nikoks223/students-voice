import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../db';

export function generateOptionId(index) {
  return `opt_${index + 1}`;
}

export function validatePoll(draft) {
  const question = draft.question?.trim() ?? '';
  if (question.length < 5) return { valid: false, error: 'Прашањето мора да биде барем 5 знаци.' };
  if (question.length > 200)
    return { valid: false, error: 'Прашањето не може да надминува 200 знаци.' };

  const options = draft.options ?? [];
  if (options.length < 2) return { valid: false, error: 'Анкетата мора да има барем 2 опции.' };
  if (options.length > 6)
    return { valid: false, error: 'Анкетата не може да има повеќе од 6 опции.' };

  for (let i = 0; i < options.length; i++) {
    const text = options[i].text?.trim() ?? '';
    if (!text) return { valid: false, error: `Опција ${i + 1} е празна.` };
    if (text.length > 80)
      return { valid: false, error: `Опција ${i + 1} е предолга (макс. 80 знаци).` };
  }

  if (draft.expiresAt) {
    const d = draft.expiresAt instanceof Date ? draft.expiresAt : new Date(draft.expiresAt);
    if (isNaN(d.getTime())) return { valid: false, error: 'Невалиден датум за истекување.' };
    if (d <= new Date())
      return { valid: false, error: 'Датумот за истекување мора да биде во иднина.' };
  }

  return { valid: true, error: null };
}

export function hasPollEnded(poll, now = new Date()) {
  if (!poll?.expiresAt) return false;
  const exp = poll.expiresAt?.toDate?.() ?? new Date(poll.expiresAt);
  return exp <= now;
}

export const pollVoteDocId = (userId, threadId) => `${userId}_${threadId}`;

/**
 * Cast, switch, or retract a vote.
 *
 * Uses runTransaction (not writeBatch) because poll.options is a Firestore array —
 * Firestore has no atomic "update element at index N" operation. We read the thread
 * doc inside the transaction, rebuild the options array in JS, then write it back
 * as a single field update. This is the only correct atomic approach for array counters.
 *
 * Returns { votedOptionId: string | null }.
 *
 * NOTE: poll counter integrity trusts the client (same trust class as upvotes/reactions).
 * For production scale, move vote writes to a Cloud Function so the server is authoritative.
 */
export async function vote({ userId, thread, optionId }) {
  const threadId = thread.id;
  const poll = thread.poll;

  if (!poll) throw new Error('Thread has no poll.');
  if (hasPollEnded(poll)) throw new Error('Анкетата е завршена.');
  if (!poll.options.some((o) => o.id === optionId)) throw new Error('Невалидна опција.');

  const voteRef = doc(db, 'pollVotes', pollVoteDocId(userId, threadId));
  const threadRef = doc(db, 'threads', threadId);

  return await runTransaction(db, async (tx) => {
    const [voteSnap, threadSnap] = await Promise.all([tx.get(voteRef), tx.get(threadRef)]);

    if (!threadSnap.exists()) throw new Error('Thread not found.');
    const currentPoll = threadSnap.data().poll;
    if (!currentPoll) throw new Error('Poll not found on thread.');

    const options = currentPoll.options.map((o) => ({ ...o }));
    let totalVotes = currentPoll.totalVotes ?? 0;

    if (!voteSnap.exists()) {
      const idx = options.findIndex((o) => o.id === optionId);
      options[idx].voteCount = (options[idx].voteCount ?? 0) + 1;
      totalVotes += 1;
      tx.set(voteRef, { userId, threadId, optionId, votedAt: serverTimestamp() });
      tx.update(threadRef, { 'poll.options': options, 'poll.totalVotes': totalVotes });
      return { votedOptionId: optionId };
    }

    const prevOptionId = voteSnap.data().optionId;

    if (prevOptionId === optionId) {
      const idx = options.findIndex((o) => o.id === optionId);
      options[idx].voteCount = Math.max(0, (options[idx].voteCount ?? 0) - 1);
      totalVotes = Math.max(0, totalVotes - 1);
      tx.delete(voteRef);
      tx.update(threadRef, { 'poll.options': options, 'poll.totalVotes': totalVotes });
      return { votedOptionId: null };
    }

    const oldIdx = options.findIndex((o) => o.id === prevOptionId);
    const newIdx = options.findIndex((o) => o.id === optionId);
    if (oldIdx >= 0) options[oldIdx].voteCount = Math.max(0, (options[oldIdx].voteCount ?? 0) - 1);
    if (newIdx >= 0) options[newIdx].voteCount = (options[newIdx].voteCount ?? 0) + 1;
    tx.update(voteRef, { optionId, votedAt: serverTimestamp() });
    tx.update(threadRef, { 'poll.options': options, 'poll.totalVotes': totalVotes });
    return { votedOptionId: optionId };
  });
}

export async function fetchUserPollVote(userId, threadId) {
  const snap = await getDoc(doc(db, 'pollVotes', pollVoteDocId(userId, threadId)));
  return snap.exists() ? snap.data().optionId : null;
}

/** Used in account deletion — query all pollVotes for a user. */
export async function fetchAllPollVotesByUser(userId) {
  const snap = await getDocs(query(collection(db, 'pollVotes'), where('userId', '==', userId)));
  return snap.docs;
}
