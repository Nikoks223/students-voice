import { doc, getDoc, runTransaction, increment, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

const RATE_LIMITING_ENABLED = true;

/**
 * Sliding-window rate limiter backed by Firestore.
 * Throws a user-facing Macedonian error when the limit is exceeded.
 *
 * Doc path: rateLimits/{userId}/actions/{action}
 */
export async function checkAndIncrement(userId, action, maxCount, windowSeconds) {
  if (!RATE_LIMITING_ENABLED) return;

  // Admins and superadmins are exempt from rate limits.
  // Justified because: (a) they need to post moderator notices, pinned
  // announcements, or curated content without hitting limits during the
  // first weeks; (b) banning the platform from accidentally rate-limiting
  // its own moderators during active moderation sessions.
  const userSnap = await getDoc(doc(db, 'users', userId));
  if (userSnap.exists()) {
    const role = userSnap.data().role;
    if (role === 'admin' || role === 'superadmin') return;
  }

  const ref = doc(db, 'rateLimits', userId, 'actions', action);

  await runTransaction(db, async (txn) => {
    const snap = await txn.get(ref);
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    if (!snap.exists()) {
      txn.set(ref, { userId, action, count: 1, windowStart: Timestamp.fromMillis(now) });
      return;
    }

    const { count, windowStart } = snap.data();
    const windowStartMs = windowStart?.toMillis?.() ?? 0;

    if (now - windowStartMs > windowMs) {
      // Window expired — start a fresh one
      txn.set(ref, { userId, action, count: 1, windowStart: Timestamp.fromMillis(now) });
      return;
    }

    if (count >= maxCount) {
      const remainingMs = windowMs - (now - windowStartMs);
      throw new Error(rateLimitMessage(remainingMs, windowSeconds));
    }

    txn.update(ref, { count: increment(1) });
  });
}

function rateLimitMessage(remainingMs, windowSeconds) {
  if (windowSeconds >= 86400) {
    const hours = Math.ceil(remainingMs / 3_600_000);
    return `Премногу обиди. Обиди се повторно за ${hours === 1 ? '1 час' : `${hours} часа`}.`;
  }
  const minutes = Math.ceil(remainingMs / 60_000);
  return `Премногу обиди во краток период. Обиди се повторно за ${minutes === 1 ? '1 минута' : `${minutes} минути`}.`;
}
