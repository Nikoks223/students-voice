import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

function mapForum(snap) {
  return { id: snap.id, ...snap.data() };
}

/**
 * Fetch active topic forums sorted by most recent activity.
 * Required Firestore index: type ASC + isActive ASC + lastActivityAt DESC
 */
export async function fetchTopicForums() {
  const snap = await getDocs(
    query(
      collection(db, 'forums'),
      where('type', '==', 'topic'),
      where('isActive', '==', true),
      orderBy('lastActivityAt', 'desc'),
    ),
  );
  return snap.docs.map(mapForum);
}

/**
 * Fetch active school forums grouped by city, sorted alphabetically.
 * Falls back to static school data if Firestore is slow/empty.
 */
export async function fetchSchoolForums() {
  const snap = await getDocs(
    query(collection(db, 'forums'), where('type', '==', 'school'), where('isActive', '==', true)),
  );
  const forums = snap.docs.map(mapForum);

  // Group by city — city is stored on school forum docs
  const grouped = {};
  for (const f of forums) {
    const city = f.city ?? 'Друго';
    if (!grouped[city]) grouped[city] = [];
    grouped[city].push(f);
  }
  // Sort each city's schools alphabetically
  for (const list of Object.values(grouped)) {
    list.sort((a, b) => a.name.localeCompare(b.name, 'mk'));
  }
  return grouped; // { 'Скопје': [...], ... }
}

export async function fetchForumById(forumId) {
  const snap = await getDoc(doc(db, 'forums', forumId));
  if (!snap.exists()) return null;
  return mapForum(snap);
}

export async function fetchAllForums() {
  const snap = await getDocs(query(collection(db, 'forums'), orderBy('name')));
  return snap.docs.map(mapForum);
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function adminCreateForum({ name, description, icon, color, type = 'topic' }) {
  const forumId = slugify(name) || `forum-${Date.now()}`;
  await setDoc(doc(db, 'forums', forumId), {
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
  return forumId;
}

export async function deleteForumById(forumId) {
  await deleteDoc(doc(db, 'forums', forumId));
}
