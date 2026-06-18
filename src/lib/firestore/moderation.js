// NOTE: fetchUserModerationLog requires a composite Firestore index:
//   Collection: moderationLog  |  Fields: targetUserId ASC, createdAt DESC

import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { deleteThreadByModerator } from './threads';
import { deleteCommentByModerator } from './comments';
import { resolveReport } from './reports';

export async function logModerationAction({
  adminId,
  action,
  targetUserId,
  targetType,
  targetId,
  reason,
  reportId,
}) {
  await addDoc(collection(db, 'moderationLog'), {
    adminId,
    action,
    targetUserId: targetUserId ?? null,
    targetType: targetType ?? null,
    targetId: targetId ?? null,
    reason: reason ?? '',
    reportId: reportId ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function fetchUserModerationLog(userId) {
  const snap = await getDocs(
    query(
      collection(db, 'moderationLog'),
      where('targetUserId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getAuthorId(targetType, targetId, threadId) {
  try {
    if (targetType === 'thread') {
      const snap = await getDoc(doc(db, 'threads', targetId));
      return snap.data()?.authorId ?? null;
    }
    const snap = await getDoc(doc(db, 'threads', threadId, 'comments', targetId));
    return snap.data()?.authorId ?? null;
  } catch {
    return null;
  }
}

async function deleteTarget(targetType, targetId, threadId) {
  if (targetType === 'thread') {
    await deleteThreadByModerator(targetId);
  } else {
    await deleteCommentByModerator(threadId, targetId);
  }
}

// ── Moderation actions ─────────────────────────────────────────────────────────

export async function ignoreReport(report, adminId) {
  await resolveReport(report.id, { action: 'ignored', moderatorId: adminId });
  await logModerationAction({
    adminId,
    action: 'ignored',
    targetUserId: null,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
    reportId: report.id,
  });
}

export async function removeContent(report, adminId) {
  const authorId = await getAuthorId(report.targetType, report.targetId, report.threadId);
  await deleteTarget(report.targetType, report.targetId, report.threadId);
  await resolveReport(report.id, { action: 'removed', moderatorId: adminId });
  await logModerationAction({
    adminId,
    action: 'removed',
    targetUserId: authorId,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
    reportId: report.id,
  });
}

// Sanction ladder: 1st warn = warning only, 2nd = 7-day ban, 3rd+ = permanent ban.
export async function removeAndWarn(report, adminId) {
  const authorId = await getAuthorId(report.targetType, report.targetId, report.threadId);
  await deleteTarget(report.targetType, report.targetId, report.threadId);

  let autoBan = null;
  if (authorId) {
    const userSnap = await getDoc(doc(db, 'users', authorId));
    const currentCount = userSnap.data()?.warningCount ?? 0;
    const newCount = currentCount + 1;

    const userUpdate = { warningCount: increment(1) };
    if (newCount === 2) {
      userUpdate.isBanned = true;
      userUpdate.banUntil = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      autoBan = '7d';
    } else if (newCount >= 3) {
      userUpdate.isBanned = true;
      userUpdate.banUntil = null;
      autoBan = 'permanent';
    }
    await updateDoc(doc(db, 'users', authorId), userUpdate);
  }

  await resolveReport(report.id, { action: 'warned', moderatorId: adminId });
  await logModerationAction({
    adminId,
    action: 'warned',
    targetUserId: authorId,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: autoBan ? `${report.reason}_auto_${autoBan}_ban` : report.reason,
    reportId: report.id,
  });
}

// Direct warn (no content removal) — used from the Users tab.
// Returns { warningCount, isBanned, autoBan: null | '7d' | 'permanent' }
export async function warnUser(userId, adminId) {
  const userSnap = await getDoc(doc(db, 'users', userId));
  const currentCount = userSnap.data()?.warningCount ?? 0;
  const newCount = currentCount + 1;
  const userUpdate = { warningCount: increment(1) };
  let autoBan = null;
  if (newCount === 2) {
    userUpdate.isBanned = true;
    userUpdate.banUntil = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    autoBan = '7d';
  } else if (newCount >= 3) {
    userUpdate.isBanned = true;
    userUpdate.banUntil = null;
    autoBan = 'permanent';
  }
  await updateDoc(doc(db, 'users', userId), userUpdate);
  await logModerationAction({
    adminId,
    action: 'warned',
    targetUserId: userId,
    targetType: null,
    targetId: null,
    reason: autoBan ? `direct_warn_auto_${autoBan}_ban` : 'direct_warn',
    reportId: null,
  });
  return { warningCount: newCount, isBanned: !!userUpdate.isBanned, autoBan };
}

export async function banUser(authorId, adminId, { permanent = false } = {}) {
  const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await updateDoc(doc(db, 'users', authorId), {
    isBanned: true,
    banUntil: permanent ? null : Timestamp.fromDate(sevenDays),
  });
  await logModerationAction({
    adminId,
    action: permanent ? 'banned_permanent' : 'banned',
    targetUserId: authorId,
    targetType: null,
    targetId: null,
    reason: permanent ? 'permanent_ban' : '7day_ban',
    reportId: null,
  });
}

export async function unbanUser(authorId, adminId) {
  await updateDoc(doc(db, 'users', authorId), { isBanned: false, banUntil: null });
  await logModerationAction({
    adminId,
    action: 'unbanned',
    targetUserId: authorId,
    targetType: null,
    targetId: null,
    reason: 'manual_unban',
    reportId: null,
  });
}

// Admin removes content proactively (no report). Does NOT call resolveReport.
export async function proactiveRemove({ targetType, targetId, threadId, authorId, adminId }) {
  await deleteTarget(targetType, targetId, threadId);
  await logModerationAction({
    adminId,
    action: 'removed',
    targetUserId: authorId,
    targetType,
    targetId,
    reason: 'proactive_moderation',
    reportId: null,
  });
}
