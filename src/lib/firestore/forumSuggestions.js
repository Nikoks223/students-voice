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
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { createNotification } from './notifications';
import { checkAndIncrement } from './rateLimit';

export async function createForumSuggestion({
  title,
  description,
  reason,
  suggestedById,
  suggestedByUsername,
  suggestedBySchool,
}) {
  await checkAndIncrement(suggestedById, 'suggestion', 3, 86400);

  const ref = await addDoc(collection(db, 'forumSuggestions'), {
    title,
    description,
    reason,
    suggestedById,
    suggestedByUsername,
    suggestedBySchool: suggestedBySchool || '',
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function fetchForumSuggestions({
  status = 'pending',
  pageSize = 20,
  lastDoc = null,
} = {}) {
  const constraints = [
    where('status', '==', status),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  ];
  if (lastDoc) constraints.push(startAfter(lastDoc));
  const snap = await getDocs(query(collection(db, 'forumSuggestions'), ...constraints));
  const suggestions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const newLastDoc = snap.docs[snap.docs.length - 1] ?? null;
  return { suggestions, lastDoc: newLastDoc, hasMore: snap.docs.length === pageSize };
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function acceptForumSuggestion(
  suggestionId,
  adminId,
  { name, description, icon, color, type = 'topic', suggestedById },
) {
  const forumId = slugify(name) || `forum-${Date.now()}`;

  const batch = writeBatch(db);
  batch.set(doc(db, 'forums', forumId), {
    name,
    description,
    icon,
    color,
    type,
    isActive: true,
    threadCount: 0,
    lastActivityAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, 'forumSuggestions', suggestionId), {
    status: 'accepted',
    resolvedById: adminId,
    resolvedAt: serverTimestamp(),
    acceptedForumId: forumId,
  });
  await batch.commit();

  // Notify the suggester
  if (suggestedById) {
    createNotification({
      userId: suggestedById,
      type: 'suggestion_accepted',
      forumId,
      forumName: name,
    }).catch(() => {});
  }

  return forumId;
}

export async function rejectForumSuggestion(suggestionId, adminId, { adminNote = '' } = {}) {
  await updateDoc(doc(db, 'forumSuggestions', suggestionId), {
    status: 'rejected',
    resolvedById: adminId,
    resolvedAt: serverTimestamp(),
    adminNote: adminNote || '',
  });
}

export async function fetchPendingSuggestionsCount() {
  const snap = await getDocs(
    query(collection(db, 'forumSuggestions'), where('status', '==', 'pending'), limit(99)),
  );
  return snap.size;
}
