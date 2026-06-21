import {
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from 'firebase/firestore';
import { db } from '../db';

// NOTE: fetchModeratedUsers uses two separate queries (Firestore doesn't support OR).
// warningCount > 0 may need an index: Firebase Console → Indexes → warningCount ASC.

// NOTE: Requires a single-field Firestore index on the 'users' collection:
//   Collection: users  |  Field: usernameLower  |  Order: Ascending
// Create at: Firebase Console → Firestore Database → Indexes → Add index.
// Without the index, the query falls back to a full scan and may fail in production.

/**
 * Prefix-search users by username (case-insensitive).
 * Returns up to `max` results as [{ id, username, school }].
 */
export async function fetchModeratedUsers() {
  const [warnedSnap, bannedSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, 'users'),
        where('warningCount', '>', 0),
        orderBy('warningCount', 'desc'),
        limit(50),
      ),
    ),
    getDocs(query(collection(db, 'users'), where('isBanned', '==', true), limit(50))),
  ]);
  const map = new Map();
  warnedSnap.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
  bannedSnap.docs.forEach((d) => {
    if (!map.has(d.id)) map.set(d.id, { id: d.id, ...d.data() });
  });
  return [...map.values()];
}

export async function searchUsernames(prefix, max = 6) {
  if (!prefix) return [];
  const lower = prefix.toLowerCase();
  const q = query(
    collection(db, 'users'),
    where('usernameLower', '>=', lower),
    where('usernameLower', '<=', lower + ''),
    orderBy('usernameLower'),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    username: d.data().username ?? '',
    school: d.data().school ?? '',
  }));
}

/**
 * Paginated all-users list for the admin Users tab.
 * filter: 'all' | 'warned' | 'banned' | 'admins'
 * For 'all', ordered by createdAt desc. For others, uses role/status indexes.
 */
export async function fetchUsersPage({ filter = 'all', lastDoc = null, pageSize = 20 } = {}) {
  let constraints;

  if (filter === 'warned') {
    constraints = [where('warningCount', '>', 0), orderBy('warningCount', 'desc')];
  } else if (filter === 'banned') {
    constraints = [where('isBanned', '==', true), orderBy('createdAt', 'desc')];
  } else if (filter === 'admins') {
    constraints = [where('role', 'in', ['admin', 'superadmin']), orderBy('createdAt', 'desc')];
  } else {
    constraints = [orderBy('createdAt', 'desc')];
  }

  constraints.push(limit(pageSize));
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(collection(db, 'users'), ...constraints));
  const users = snap.docs.map((d) => ({ id: d.id, ...d.data(), _snap: d }));
  const newLastDoc = snap.docs[snap.docs.length - 1] ?? null;
  return { users, lastDoc: newLastDoc, hasMore: snap.docs.length === pageSize };
}

/** Lookup a user by their usernameLower field. Returns { id, ...data } or null.
 *  Returns null for anonymised (isDeleted) accounts so that a re-registered
 *  account with the same username is never shadowed by the old record.
 *  Using a JS-level filter (Option 1) instead of a Firestore != query so that
 *  existing user docs without an isDeleted field at all are still returned. */
export async function fetchUserByUsername(usernameLower) {
  const normalized = usernameLower?.toLowerCase?.()?.trim();
  if (!normalized) return null;
  const snap = await getDocs(
    query(collection(db, 'users'), where('usernameLower', '==', normalized), limit(1)),
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();
  if (data.isDeleted === true) return null;
  return { id: d.id, ...data };
}

/**
 * Paginated threads for a specific author.
 * Requires composite index: threads / authorId ASC + createdAt DESC
 */
export async function fetchUserThreads(userId, { pageSize = 10, lastDoc = null } = {}) {
  const constraints = [
    where('authorId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  ];
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(collection(db, 'threads'), ...constraints));
  return {
    threads: snap.docs.map((d) => ({ id: d.id, ...d.data(), _snap: d })),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === pageSize,
  };
}

/**
 * Paginated collectionGroup comments for a specific author.
 * Each result includes the parsed threadId from the document path.
 * Requires composite collection-group index: comments / authorId ASC + createdAt DESC
 */
export async function fetchUserComments(userId, { pageSize = 10, lastDoc = null } = {}) {
  const constraints = [
    where('authorId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  ];
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(collectionGroup(db, 'comments'), ...constraints));
  return {
    comments: snap.docs.map((d) => {
      // Path: threads/{threadId}/comments/{commentId}
      const threadId = d.ref.path.split('/')[1];
      return { id: d.id, threadId, ...d.data(), _snap: d };
    }),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === pageSize,
  };
}

export async function fetchUsersByRole(roles) {
  const snap = await getDocs(query(collection(db, 'users'), where('role', 'in', roles), limit(50)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.username ?? '').localeCompare(b.username ?? '', 'mk'));
}
