import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getForumById } from '../../data/forums';

// Full-text search is not supported natively by Firestore.
// This MVP approach fetches the latest N threads and filters client-side.
// Post-MVP upgrade: replace with Algolia or Typesense for real full-text search.
const SEARCH_BATCH = 150;

function mapThread(snap) {
  const data = snap.data();
  const forum = getForumById(data.forumId);
  return {
    id: snap.id,
    ...data,
    forumName: data.forumName ?? forum?.name ?? data.forumId,
    forumColor: data.forumColor ?? forum?.color ?? '#716B7E',
    forumIcon: data.forumIcon ?? forum?.icon ?? '💬',
  };
}

export async function searchThreads(queryText) {
  const snap = await getDocs(
    query(collection(db, 'threads'), orderBy('createdAt', 'desc'), limit(SEARCH_BATCH)),
  );
  const all = snap.docs.map(mapThread);

  if (!queryText.trim()) return all;

  const q = queryText.trim().toLowerCase();
  return all.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.body.toLowerCase().includes(q) ||
      (t.forumName ?? '').toLowerCase().includes(q) ||
      (t.authorUsername ?? '').toLowerCase().includes(q),
  );
}
