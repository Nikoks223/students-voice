import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './db';
import { getForumById } from '../data/forums';

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

function score(thread, nowMs) {
  const engagement = (thread.upvoteCount || 0) + (thread.commentCount || 0) * 2;
  const createdMs =
    thread.createdAt?.toMillis?.() ??
    (thread.createdAt?.seconds != null ? thread.createdAt.seconds * 1000 : nowMs);
  const ageHours = (nowMs - createdMs) / 3_600_000;
  return engagement / Math.pow(ageHours + 2, 1.5);
}

export async function fetchTrendingThreads({ hoursBack = 168, limit: topN = 5 } = {}) {
  const cutoff = Timestamp.fromDate(new Date(Date.now() - hoursBack * 3_600_000));
  const snap = await getDocs(
    query(
      collection(db, 'threads'),
      where('createdAt', '>=', cutoff),
      orderBy('createdAt', 'desc'),
      limit(100),
    ),
  );

  const nowMs = Date.now();
  return snap.docs
    .map((d) => mapThread(d))
    .sort((a, b) => score(b, nowMs) - score(a, nowMs))
    .slice(0, topN);
}
