// NOTE: Requires a composite Firestore index:
//   Collection: reports  |  Fields: status ASC, createdAt DESC
// Create at: Firebase Console → Firestore Database → Indexes → Add index.

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  updateDoc,
  doc,
  writeBatch,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../db';
import { checkAndIncrement } from './rateLimit';

export async function createReport({
  targetType,
  targetId,
  threadId,
  reason,
  details = '',
  reporterId,
  reporterUsername,
}) {
  await checkAndIncrement(reporterId, 'report', 10, 3600);

  const reportRef = doc(collection(db, 'reports'));
  const today = new Date().toISOString().split('T')[0];
  const batch = writeBatch(db);
  batch.set(reportRef, {
    reporterId,
    reporterUsername,
    targetType,
    targetId,
    threadId,
    reason,
    details: details || '',
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  batch.set(
    doc(db, 'stats', 'global'),
    { totalReports: increment(1), updatedAt: serverTimestamp() },
    { merge: true },
  );
  batch.set(
    doc(db, 'stats', 'daily', 'entries', today),
    { date: today, newReports: increment(1), updatedAt: serverTimestamp() },
    { merge: true },
  );
  await batch.commit();
  return reportRef.id;
}

export async function fetchReports({ status = 'pending', pageSize = 20, lastDoc = null } = {}) {
  const constraints = [
    where('status', '==', status),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  ];
  if (lastDoc) constraints.push(startAfter(lastDoc));
  const snap = await getDocs(query(collection(db, 'reports'), ...constraints));
  const reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const newLastDoc = snap.docs[snap.docs.length - 1] ?? null;
  return { reports, lastDoc: newLastDoc, hasMore: snap.docs.length === pageSize };
}

export async function resolveReport(reportId, { action, moderatorId }) {
  await updateDoc(doc(db, 'reports', reportId), {
    status: 'resolved',
    action,
    resolvedBy: moderatorId,
    resolvedAt: serverTimestamp(),
  });
}

// Returns count up to 99 for the admin badge.
export async function fetchPendingCount() {
  const snap = await getDocs(
    query(collection(db, 'reports'), where('status', '==', 'pending'), limit(99)),
  );
  return snap.size;
}
