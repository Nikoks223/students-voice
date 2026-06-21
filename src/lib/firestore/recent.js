import { collectionGroup, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { db } from '../db';

const PAGE_SIZE = 20;

/**
 * Fetch recent comments across all threads via a collection-group query.
 *
 * Required Firestore index (single-field on collectionGroup "comments"):
 *   Collection group: comments | Field: createdAt | Order: Descending
 *   Create via the console link that appears on first error.
 */
export async function fetchRecentComments({ pageSize = PAGE_SIZE, lastDoc = null } = {}) {
  const constraints = [orderBy('createdAt', 'desc'), limit(pageSize)];
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(collectionGroup(db, 'comments'), ...constraints));
  const comments = snap.docs.map((snap) => ({
    id: snap.id,
    // threadId is the parent document ID in the path: threads/{threadId}/comments/{commentId}
    threadId: snap.ref.parent.parent.id,
    ...snap.data(),
  }));
  const newLastDoc = snap.docs[snap.docs.length - 1] ?? null;
  return { comments, lastDoc: newLastDoc, hasMore: snap.docs.length === pageSize };
}
