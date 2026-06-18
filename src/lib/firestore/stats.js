import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  where,
  collectionGroup,
} from 'firebase/firestore';
import { db } from '../firebase';
import { SCHOOLS } from '../../data/schools';

// Firestore path helpers — all live under the 'stats' top-level collection
// so the security rule `match /stats/{document=**}` covers every write.
export const statRefs = {
  global: () => doc(db, 'stats', 'global'),
  daily: (date) => doc(db, 'stats', 'daily', 'entries', date),
  school: (id) => doc(db, 'stats', 'schools', 'entries', id),
  forum: (id) => doc(db, 'stats', 'forums', 'entries', id),
};

export function todayKey() {
  return new Date().toISOString().split('T')[0];
}

const ZEROS_GLOBAL = {
  totalUsers: 0,
  totalThreads: 0,
  totalComments: 0,
  totalUpvotes: 0,
  totalReports: 0,
};

export async function fetchGlobalStats() {
  const snap = await getDoc(statRefs.global());
  return snap.exists() ? snap.data() : ZEROS_GLOBAL;
}

export async function fetchDailyStats(days = 30) {
  const snap = await getDocs(
    query(collection(db, 'stats', 'daily', 'entries'), orderBy('date', 'desc'), limit(days)),
  );

  const byDate = {};
  snap.docs.forEach((d) => {
    byDate[d.data().date] = d.data();
  });

  // Fill missing dates client-side so the chart x-axis is contiguous
  const result = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    result.push(
      byDate[dateStr] ?? {
        date: dateStr,
        newUsers: 0,
        newThreads: 0,
        newComments: 0,
        newUpvotes: 0,
        newReports: 0,
      },
    );
  }
  return result;
}

export async function fetchSchoolStats() {
  const snap = await getDocs(
    query(
      collection(db, 'stats', 'schools', 'entries'),
      where('userCount', '>', 0),
      orderBy('userCount', 'desc'),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Module-level cache shared between Leaderboard page and SchoolLeaderboardWidget.
// TTL: 2 minutes — live enough for a launch event, cheap enough to avoid repeat reads.
const _lbCache = { data: null, fetchedAt: 0 };
const LB_TTL = 120_000;

// Called by createThread / createComment so the next leaderboard render re-fetches.
export function invalidateLeaderboardCache() {
  _lbCache.fetchedAt = 0;
}

export async function fetchSchoolLeaderboard({ sortBy = 'activity', limit: topN = null } = {}) {
  const now = Date.now();

  if (!_lbCache.data || now - _lbCache.fetchedAt >= LB_TTL) {
    const snap = await getDocs(collection(db, 'stats', 'schools', 'entries'));

    // Build a lookup map from Firestore docs (keyed by school ID)
    const statsMap = {};
    snap.docs.forEach((d) => {
      statsMap[d.id] = d.data();
    });

    // Merge the full static school list with whatever stats exist.
    // Schools with no Firestore doc yet get zeros — all schools always appear.
    _lbCache.data = SCHOOLS.map((school) => ({
      id: school.id,
      schoolId: school.id,
      schoolName: school.name,
      city: school.city,
      userCount: statsMap[school.id]?.userCount ?? 0,
      threadCount: statsMap[school.id]?.threadCount ?? 0,
      commentCount: statsMap[school.id]?.commentCount ?? 0,
    }));
    _lbCache.fetchedAt = now;
  }

  const withScore = _lbCache.data.map((s) => ({
    ...s,
    activityScore: (s.threadCount ?? 0) + (s.commentCount ?? 0) * 0.5,
  }));

  const getSortVal = (s) =>
    sortBy === 'users'
      ? (s.userCount ?? 0)
      : sortBy === 'threads'
        ? (s.threadCount ?? 0)
        : sortBy === 'comments'
          ? (s.commentCount ?? 0)
          : s.activityScore;

  const sorted = [...withScore].sort((a, b) => getSortVal(b) - getSortVal(a));

  // Dense ranking — tied schools share the same rank number
  let prevVal = null,
    rank = 0;
  const ranked = sorted.map((s) => {
    const val = getSortVal(s);
    if (val !== prevVal) {
      rank++;
      prevVal = val;
    }
    return { ...s, rank };
  });

  return topN !== null ? ranked.slice(0, topN) : ranked;
}

export async function fetchForumStats() {
  const snap = await getDocs(
    query(collection(db, 'stats', 'forums', 'entries'), orderBy('threadCount', 'desc'), limit(20)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// EXPENSIVE — reads potentially thousands of docs.
// Called only on explicit user action, never on tab open.
export async function fetchTopContributors({ days = 30, cap = 10 } = {}) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const [commentsSnap, threadsSnap] = await Promise.all([
    getDocs(query(collectionGroup(db, 'comments'), where('createdAt', '>=', cutoff), limit(2000))),
    getDocs(query(collection(db, 'threads'), where('createdAt', '>=', cutoff), limit(2000))),
  ]);

  const map = {};
  const tally = (snap, type) => {
    snap.docs.forEach((d) => {
      const { authorId, authorUsername, authorSchool } = d.data();
      if (!authorId || !authorUsername || authorUsername === '[избришан корисник]') return;
      if (!map[authorId]) {
        map[authorId] = { authorId, authorUsername, authorSchool, threads: 0, comments: 0 };
      }
      map[authorId][type]++;
    });
  };
  tally(threadsSnap, 'threads');
  tally(commentsSnap, 'comments');

  return Object.values(map)
    .map((u) => ({ ...u, total: u.threads + u.comments }))
    .sort((a, b) => b.total - a.total)
    .slice(0, cap);
}
