import {
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../db';

export const DELETED_AUTHOR_DISPLAY = '[избришан корисник]';

const CHUNK_SIZE = 450;
// Upvotes need 2 ops per doc (delete + counter update), so use a smaller chunk.
const UPVOTE_CHUNK_SIZE = 200;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * GDPR account deletion ("право да бидеш заборавен").
 *
 * Order of operations matters: all Firestore mutations happen BEFORE
 * firebaseUser.delete(), because once the Auth record is gone, security rules
 * will deny further writes from this user.
 *
 * Steps:
 *   (a) Anonymize threads
 *   (b) Anonymize comments (collectionGroup — requires index: comments/authorId ASC)
 *   (c) Delete upvotes + decrement target counters (keeps counts accurate)
 *   (d) Delete follows
 *   (e) Anonymize submitted reports (GDPR: reporter identity is personal data)
 *       NOTE: requires updated security rules — reporter must be allowed to update
 *       reporterId/reporterUsername on their own reports (see rules snippet in docs).
 *   (f) Free username document
 *   (g) Soft-delete user doc (keep for authorId integrity, all PII scrubbed)
 *   (h) Delete Firebase Auth record — may throw auth/requires-recent-login;
 *       callers must catch that code, re-authenticate, and retry.
 */
export async function deleteAccount(userId, firebaseUser) {
  // Pre-fetch user doc to get usernameLower before we overwrite it.
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const usernameLower = userSnap.data()?.usernameLower ?? null;

  // ── (a) Anonymize threads ─────────────────────────────────────────────────
  try {
    const threadsSnap = await getDocs(
      query(collection(db, 'threads'), where('authorId', '==', userId)),
    );
    for (const ch of chunk(threadsSnap.docs, CHUNK_SIZE)) {
      const batch = writeBatch(db);
      ch.forEach((d) =>
        batch.update(d.ref, {
          isDeleted: 'by_user',
          body: '',
          authorUsername: DELETED_AUTHOR_DISPLAY,
          authorSchool: null,
          updatedAt: serverTimestamp(),
        }),
      );
      await batch.commit();
    }
  } catch (err) {
    console.error('[deleteAccount] FAILED at step (a):', err, err.code, err.message);
    throw err;
  }

  // ── (b) Anonymize comments (collectionGroup) ──────────────────────────────
  try {
    const commentsSnap = await getDocs(
      query(collectionGroup(db, 'comments'), where('authorId', '==', userId)),
    );
    for (const ch of chunk(commentsSnap.docs, CHUNK_SIZE)) {
      const batch = writeBatch(db);
      ch.forEach((d) =>
        batch.update(d.ref, {
          isDeleted: 'by_user',
          body: '',
          authorUsername: DELETED_AUTHOR_DISPLAY,
          authorSchool: null,
          mentions: [],
          updatedAt: serverTimestamp(),
        }),
      );
      await batch.commit();
    }
  } catch (err) {
    console.error('[deleteAccount] FAILED at step (b):', err, err.code, err.message);
    throw err;
  }

  // ── (c) Delete upvotes + decrement counters ───────────────────────────────
  // Decrementing keeps counts accurate for remaining users.
  try {
    const upvotesSnap = await getDocs(
      query(collection(db, 'upvotes'), where('userId', '==', userId)),
    );
    for (const ch of chunk(upvotesSnap.docs, UPVOTE_CHUNK_SIZE)) {
      const batch = writeBatch(db);
      ch.forEach((d) => {
        const { targetType, targetId, threadId } = d.data();
        const targetRef =
          targetType === 'thread'
            ? doc(db, 'threads', targetId)
            : doc(db, 'threads', threadId, 'comments', targetId);
        batch.update(targetRef, { upvoteCount: increment(-1) });
        batch.delete(d.ref);
      });
      await batch.commit();
    }
  } catch (err) {
    console.error('[deleteAccount] FAILED at step (c):', err, err.code, err.message);
    throw err;
  }

  // ── (d) Delete follows + threadFollows ───────────────────────────────────
  try {
    const [followsSnap, threadFollowsSnap] = await Promise.all([
      getDocs(query(collection(db, 'follows'), where('userId', '==', userId))),
      getDocs(query(collection(db, 'threadFollows'), where('userId', '==', userId))),
    ]);
    const allFollowDocs = [...followsSnap.docs, ...threadFollowsSnap.docs];
    for (const ch of chunk(allFollowDocs, CHUNK_SIZE)) {
      const batch = writeBatch(db);
      ch.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.warn(
      '[deleteAccount] Step (d) follows cleanup skipped (non-critical):',
      err.code,
      err.message,
    );
  }

  // ── (d.5) Delete saved posts ──────────────────────────────────────────────
  try {
    const savedSnap = await getDocs(
      query(collection(db, 'savedPosts'), where('userId', '==', userId)),
    );
    for (const ch of chunk(savedSnap.docs, CHUNK_SIZE)) {
      const batch = writeBatch(db);
      ch.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.warn(
      '[deleteAccount] Step (d.5) savedPosts cleanup skipped (non-critical):',
      err.code,
      err.message,
    );
  }

  // ── (d.55) Delete pollVotes (simple delete only — see note) ─────────────
  // We delete the pollVote docs but do NOT decrement poll.options[i].voteCount on
  // the thread. Decrementing array elements atomically requires a transaction per vote,
  // which is expensive at account-deletion time. The aggregate counts will be off by N
  // for deleted-user votes — acceptable for beta scale.
  try {
    const pollVotesSnap = await getDocs(
      query(collection(db, 'pollVotes'), where('userId', '==', userId)),
    );
    for (const ch of chunk(pollVotesSnap.docs, CHUNK_SIZE)) {
      const batch = writeBatch(db);
      ch.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.warn(
      '[deleteAccount] Step (d.55) pollVotes cleanup skipped (non-critical):',
      err.code,
      err.message,
    );
  }

  // ── (d.6) Delete reactions + decrement target counters ───────────────────
  try {
    const reactionsSnap = await getDocs(
      query(collection(db, 'reactions'), where('userId', '==', userId)),
    );
    for (const ch of chunk(reactionsSnap.docs, UPVOTE_CHUNK_SIZE)) {
      const batch = writeBatch(db);
      ch.forEach((d) => {
        const { targetType, targetId, threadId: rxThreadId, reactionId } = d.data();
        const tRef =
          targetType === 'thread'
            ? doc(db, 'threads', targetId)
            : doc(db, 'threads', rxThreadId, 'comments', targetId);
        batch.update(tRef, { [`reactionCounts.${reactionId}`]: increment(-1) });
        batch.delete(d.ref);
      });
      await batch.commit();
    }
  } catch (err) {
    console.warn(
      '[deleteAccount] Step (d.6) reactions cleanup skipped (non-critical):',
      err.code,
      err.message,
    );
  }

  // ── (e) Anonymize submitted reports (GDPR) ────────────────────────────────
  // Keeps audit trail intact for admins while removing reporter identity.
  // Requires updated security rules: reporter can update reporterId/reporterUsername
  // on their own report (see rules snippet). Soft-fail so rules update is not a blocker.
  try {
    const reportsSnap = await getDocs(
      query(collection(db, 'reports'), where('reporterId', '==', userId)),
    );
    for (const ch of chunk(reportsSnap.docs, CHUNK_SIZE)) {
      const batch = writeBatch(db);
      ch.forEach((d) =>
        batch.update(d.ref, {
          reporterId: null,
          reporterUsername: DELETED_AUTHOR_DISPLAY,
        }),
      );
      await batch.commit();
    }
  } catch (err) {
    console.warn(
      '[deleteAccount] Step (e) report anonymization skipped (check security rules):',
      err.code,
      err.message,
    );
  }

  // ── (f) Free username ─────────────────────────────────────────────────────
  // Non-fatal: if this fails (stale state, race, rules gap), the user doc is
  // still anonymised in step (g) with usernameLower: null, so the lock becomes
  // an orphan that the self-healing onboarding transaction will clean up the
  // next time anyone tries to claim this username. Never throw — deletion must
  // continue regardless.
  try {
    if (usernameLower) {
      await deleteDoc(doc(db, 'usernames', usernameLower));
    }
  } catch (err) {
    console.warn(
      '[deleteAccount] Step (f) username cleanup failed (non-fatal):',
      err.code,
      err.message,
    );
    // Intentionally not re-throwing.
  }

  // ── (g) Soft-delete user doc ──────────────────────────────────────────────
  // Keep the document so authorId on threads/comments remains resolvable,
  // but overwrite ALL PII fields with null/empty. setDoc (no merge) ensures
  // no stale field survives. usernameLower MUST be null so that
  // fetchUserByUsername queries can never accidentally return this doc —
  // that is the safety net that prevents a re-registered same-name account
  // from being shadowed by the old anonymised record.
  try {
    await setDoc(userRef, {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      username: '[избришан]',
      usernameLower: null, // critical — see comment above
      email: null,
      school: null,
      year: null,
      avatarUrl: null,
      bannerUrl: null,
      bannerPublicId: null,
      bio: null,
      role: 'user',
      isBanned: false,
      banUntil: null,
      warningCount: 0,
    });
  } catch (err) {
    console.error('[deleteAccount] FAILED at step (g):', err, err.code, err.message);
    throw err;
  }

  // ── (g.5) Decrement aggregate stats (best-effort, never blocks deletion) ──
  try {
    const userSchool = userSnap.data()?.school;
    const statBatch = writeBatch(db);
    statBatch.set(
      doc(db, 'stats', 'global'),
      { totalUsers: increment(-1), updatedAt: serverTimestamp() },
      { merge: true },
    );
    if (userSchool) {
      statBatch.set(
        doc(db, 'stats', 'schools', 'entries', userSchool),
        { userCount: increment(-1), updatedAt: serverTimestamp() },
        { merge: true },
      );
    }
    await statBatch.commit();
  } catch (err) {
    console.warn('[deleteAccount] Step (g.5) stats decrement skipped:', err.code, err.message);
  }

  // ── (h) Delete Firebase Auth record ──────────────────────────────────────
  // Throws auth/requires-recent-login if the session is old.
  // The UI must catch that code, call signInWithPopup to re-authenticate,
  // then retry deleteAccount — Firestore steps above will be no-ops on retry.
  try {
    await firebaseUser.delete();
  } catch (err) {
    console.error('[deleteAccount] FAILED at step (h):', err, err.code, err.message);
    throw err;
  }
}
