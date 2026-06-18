import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchSchoolLeaderboard } from '../lib/firestore/stats';
import Card from '../components/ui/Card';

// ── Number formatter ──────────────────────────────────────────────────────────
const fmt = (n) => Math.round(n ?? 0).toLocaleString('mk-MK');
const fmtN = (n) => (n ?? 0).toLocaleString('mk-MK');

// ── Sort config ───────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: 'activity', label: 'Активност' },
  { key: 'users', label: 'Корисници' },
  { key: 'threads', label: 'Дискусии' },
  { key: 'comments', label: 'Коментари' },
];

// ── Rank colours ──────────────────────────────────────────────────────────────
const RANK_STYLE = {
  1: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.28)', text: '#F59E0B' },
  2: { bg: 'rgba(161,161,170,0.1)', border: 'rgba(161,161,170,0.22)', text: 'var(--color-ink-dim)' },
  3: { bg: 'rgba(194,133,92,0.1)', border: 'rgba(194,133,92,0.22)', text: '#C07A4A' },
};
const rankStyle = (rank) =>
  RANK_STYLE[rank] ?? {
    bg: 'var(--color-surface-hover)',
    border: 'var(--color-border)',
    text: 'var(--color-muted-dim)',
  };

// ── Icons ─────────────────────────────────────────────────────────────────────
function TrophyIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H3V6h3m15 3h-3V6h3M6 9c0 4 2 7 6 8.5C16 16 18 13 18 9V3H6v6z" />
      <path d="M9 22h6M12 17v5" />
    </svg>
  );
}
function UsersIcon({ size = 12 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function ThreadIcon({ size = 12 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}
function CommentIcon({ size = 12 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}
function ChevronDown({ size = 12 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 9l-7 7-7-7" />
    </svg>
  );
}
// ── Rank badge ────────────────────────────────────────────────────────────────
function RankBadge({ rank, size = 32, fontSize = 12 }) {
  const s = rankStyle(rank);
  return (
    <span
      className="shrink-0 inline-flex items-center justify-center font-mono font-bold rounded-lg"
      style={{
        width: size,
        height: size,
        fontSize,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
      }}
    >
      {String(rank).padStart(2, '0')}
    </span>
  );
}

// ── Podium card ───────────────────────────────────────────────────────────────
function PodiumCard({ school, isChampion, delay = 0 }) {
  if (!school)
    return (
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 14,
          padding: '16px',
          height: 160,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ fontSize: 12, color: 'var(--color-muted-dimmer)' }}>—</p>
      </div>
    );

  return (
    <Link
      to={`/p/school-${school.id}`}
      className="relative block overflow-hidden"
      style={{
        background: 'var(--color-surface)',
        border: isChampion ? '1px solid rgba(124,92,255,0.2)' : '1px solid var(--color-border)',
        borderRadius: 14,
        padding: isChampion ? '20px' : '16px',
        boxShadow: 'var(--shadow-card)',
        textDecoration: 'none',
        animation: `fadeUp 0.32s cubic-bezier(0.23,1,0.32,1) ${delay}ms both`,
        transition:
          'border-color 0.18s cubic-bezier(0.23,1,0.32,1), transform 0.18s cubic-bezier(0.23,1,0.32,1)',
        willChange: 'transform',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = isChampion
          ? 'rgba(124,92,255,0.35)'
          : 'var(--color-border-strong)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isChampion
          ? 'rgba(124,92,255,0.2)'
          : 'var(--color-border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Champion top accent */}
      {isChampion && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background:
              'linear-gradient(90deg, transparent, rgba(124,92,255,0.5) 50%, transparent)',
          }}
        />
      )}

      {/* Rank + trophy */}
      <div className="flex items-start justify-between mb-3">
        <RankBadge rank={school.rank} size={isChampion ? 38 : 30} fontSize={isChampion ? 14 : 11} />
        {isChampion && <TrophyIcon size={15} color="#F59E0B" />}
      </div>

      <p
        className="font-display font-bold leading-snug tracking-tight mb-0.5"
        style={{ fontSize: isChampion ? 15 : 13, color: 'var(--color-ink)', lineHeight: 1.25 }}
      >
        {school.schoolName ?? school.schoolId ?? school.id}
      </p>
      <p className="mb-3" style={{ fontSize: 10.5, color: 'var(--color-muted-dim)' }}>
        {school.city ?? '—'}
      </p>

      {/* Score */}
      <p
        className="font-display font-bold font-mono tracking-tight mb-3"
        style={{
          fontSize: isChampion ? 30 : 22,
          color: isChampion ? 'var(--color-ink)' : 'var(--color-ink-dim)',
          lineHeight: 1,
        }}
      >
        {fmt(school.activityScore)}
      </p>

      {/* Mini stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <StatPill icon={<UsersIcon />} value={fmtN(school.userCount)} />
        <StatPill icon={<ThreadIcon />} value={fmtN(school.threadCount)} />
        <StatPill icon={<CommentIcon />} value={fmtN(school.commentCount)} />
      </div>
    </Link>
  );
}

function StatPill({ icon, value }) {
  return (
    <span
      className="inline-flex items-center gap-1 font-mono"
      style={{ fontSize: 10.5, color: 'var(--color-muted-dim)' }}
    >
      {icon}
      {value}
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function PodiumSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {[1, 0, 2].map((i) => (
        <div
          key={i}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            padding: 18,
            marginTop: i === 0 ? 0 : 'md:16px',
          }}
        >
          <div className="shimmer w-9 h-9 rounded-lg mb-3" />
          <div className="shimmer h-4 w-3/4 rounded mb-2" />
          <div className="shimmer h-3 w-1/3 rounded mb-3" />
          <div className="shimmer h-7 w-1/2 rounded mb-3" />
          <div className="flex gap-3">
            <div className="shimmer h-2.5 w-10 rounded" />
            <div className="shimmer h-2.5 w-10 rounded" />
            <div className="shimmer h-2.5 w-10 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="shimmer w-7 h-5 rounded" />
          <div className="shimmer h-3.5 rounded" style={{ width: `${60 + (i % 3) * 15}px` }} />
          <div className="shimmer h-3 w-14 rounded ml-2" />
          <div className="shimmer h-3 w-10 rounded ml-auto" />
          <div className="shimmer h-3 w-10 rounded" />
          <div className="shimmer h-3 w-10 rounded" />
          <div className="shimmer h-3 w-10 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Leaderboard() {
  const [schools, setSchools] = useState([]);
  const [sortBy, setSortBy] = useState('activity');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchSchoolLeaderboard({ sortBy })
      .then((data) => {
        setSchools(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? 'Грешка');
        setLoading(false);
      });
  }, [sortBy]);

  const top3 = schools.slice(0, 3);
  const [s2, s1, s3] = [top3[1], top3[0], top3[2]]; // podium order: 2-1-3

  return (
    <div className="space-y-6">
      {/* ── Masthead ── */}
      <div className="flex items-end justify-between gap-6 pb-1">
        <div className="flex items-center gap-3.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.2)',
              color: '#F59E0B',
            }}
          >
            <TrophyIcon size={17} color="#F59E0B" />
          </div>
          <div>
            <p
              className="text-[9px] font-bold uppercase tracking-[0.18em] mb-0.5"
              style={{ color: 'var(--color-muted-dimmer)' }}
            >
              Средношколски Глас
            </p>
            <h1 className="font-display font-bold text-[22px] text-ink tracking-tight leading-none">
              Топ Училишта
            </h1>
          </div>
        </div>
        <p className="text-[11.5px] shrink-0" style={{ color: 'var(--color-muted-dimmer)' }}>
          Се ажурира во реално време
        </p>
      </div>

      <div aria-hidden style={{ height: 1, background: 'var(--color-surface-hover)' }} />

      {error ? (
        <Card className="p-8 text-center">
          <p style={{ fontSize: 13.5, color: 'var(--color-coral)' }}>{error}</p>
        </Card>
      ) : (
        <>
          {/* ── Podium ── */}
          {loading ? (
            <PodiumSkeleton />
          ) : schools.length >= 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:items-end">
              {/* Rank 2 — left on desktop */}
              <div className="order-2 md:order-1 md:mb-4">
                <PodiumCard school={s2} isChampion={false} delay={60} />
              </div>
              {/* Rank 1 — center on desktop */}
              <div className="order-1 md:order-2">
                <PodiumCard school={s1} isChampion={true} delay={0} />
              </div>
              {/* Rank 3 — right on desktop */}
              <div className="order-3 md:order-3 md:mb-4">
                <PodiumCard school={s3} isChampion={false} delay={120} />
              </div>
            </div>
          ) : null}

          {/* ── Sort chips + table ── */}
          <div
            className="overflow-hidden"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 14,
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {/* Table header row */}
            <div
              className="flex items-center justify-between gap-3 px-4 py-3"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <p className="font-display font-semibold text-ink" style={{ fontSize: 14 }}>
                Сите училишта
              </p>

              {/* Sort chips */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSortBy(opt.key)}
                    className="shrink-0 font-medium"
                    style={{
                      fontSize: 11.5,
                      padding: '4px 10px',
                      borderRadius: 7,
                      border: `1px solid ${sortBy === opt.key ? 'rgba(124,92,255,0.25)' : 'var(--color-border)'}`,
                      background: sortBy === opt.key ? 'rgba(124,92,255,0.1)' : 'transparent',
                      color: sortBy === opt.key ? 'var(--color-accent)' : 'var(--color-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.15s cubic-bezier(0.16,1,0.3,1)',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      if (sortBy !== opt.key) e.currentTarget.style.color = 'var(--color-ink-dim)';
                    }}
                    onMouseLeave={(e) => {
                      if (sortBy !== opt.key) e.currentTarget.style.color = 'var(--color-muted)';
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <TableSkeleton />
            ) : schools.length === 0 ? (
              <div className="py-16 text-center">
                <TrophyIcon size={28} color="var(--color-muted-dimmer)" />
                <p className="mt-3" style={{ fontSize: 14, color: 'var(--color-muted-dim)' }}>
                  Сè уште нема активност. Биди прв ученик од твоето училиште.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 520 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--color-surface-hover)' }}>
                      {[
                        { key: null, label: '#', align: 'left', w: 48 },
                        { key: null, label: 'Училиште', align: 'left', w: null },
                        { key: null, label: 'Град', align: 'left', w: 80 },
                        { key: 'users', label: 'Корисници', align: 'right', w: 90 },
                        { key: 'threads', label: 'Дискусии', align: 'right', w: 90 },
                        { key: 'comments', label: 'Коментари', align: 'right', w: 90 },
                        { key: 'activity', label: 'Скор', align: 'right', w: 80 },
                      ].map((col, ci) => {
                        const active = col.key && sortBy === col.key;
                        return (
                          <th
                            key={ci}
                            onClick={() => col.key && setSortBy(col.key)}
                            style={{
                              padding: '10px 16px',
                              fontSize: 9.5,
                              fontWeight: 700,
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                              textAlign: col.align,
                              color: active ? 'var(--color-accent)' : 'var(--color-muted-dimmer)',
                              borderBottom: '1px solid var(--color-border)',
                              cursor: col.key ? 'pointer' : 'default',
                              userSelect: 'none',
                              whiteSpace: 'nowrap',
                              width: col.w ?? undefined,
                            }}
                          >
                            <span className="inline-flex items-center gap-1">
                              {col.label}
                              {active && (sortBy === col.key ? <ChevronDown size={9} /> : null)}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {schools.map((s) => {
                      const rs = rankStyle(s.rank);
                      return (
                        <tr
                          key={s.id}
                          style={{
                            borderBottom: '1px solid var(--color-border)',
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')
                          }
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          {/* Rank */}
                          <td style={{ padding: '10px 16px', width: 48 }}>
                            <span
                              className="font-mono font-bold"
                              style={{ fontSize: 12, color: rs.text }}
                            >
                              {s.rank}
                            </span>
                          </td>

                          {/* School name */}
                          <td style={{ padding: '10px 16px' }}>
                            <Link
                              to={`/p/school-${s.id}`}
                              className="font-medium hover:text-iris transition-colors"
                              style={{ fontSize: 13, color: 'var(--color-ink)', textDecoration: 'none' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {s.schoolName ?? s.schoolId ?? s.id}
                            </Link>
                          </td>

                          {/* City */}
                          <td
                            style={{
                              padding: '10px 16px',
                              fontSize: 12,
                              color: 'var(--color-muted-dim)',
                              width: 80,
                            }}
                          >
                            {s.city ?? '—'}
                          </td>

                          {/* Users */}
                          <td style={{ padding: '10px 16px', textAlign: 'right', width: 90 }}>
                            <span
                              className="font-mono"
                              style={{
                                fontSize: 12.5,
                                fontWeight: sortBy === 'users' ? 700 : 400,
                                color: sortBy === 'users' ? 'var(--color-ink)' : 'var(--color-muted)',
                              }}
                            >
                              {fmtN(s.userCount)}
                            </span>
                          </td>

                          {/* Threads */}
                          <td style={{ padding: '10px 16px', textAlign: 'right', width: 90 }}>
                            <span
                              className="font-mono"
                              style={{
                                fontSize: 12.5,
                                fontWeight: sortBy === 'threads' ? 700 : 400,
                                color: sortBy === 'threads' ? 'var(--color-ink)' : 'var(--color-muted)',
                              }}
                            >
                              {fmtN(s.threadCount)}
                            </span>
                          </td>

                          {/* Comments */}
                          <td style={{ padding: '10px 16px', textAlign: 'right', width: 90 }}>
                            <span
                              className="font-mono"
                              style={{
                                fontSize: 12.5,
                                fontWeight: sortBy === 'comments' ? 700 : 400,
                                color: sortBy === 'comments' ? 'var(--color-ink)' : 'var(--color-muted)',
                              }}
                            >
                              {fmtN(s.commentCount)}
                            </span>
                          </td>

                          {/* Score */}
                          <td style={{ padding: '10px 16px', textAlign: 'right', width: 80 }}>
                            <span
                              className="font-mono"
                              style={{
                                fontSize: 12.5,
                                fontWeight: sortBy === 'activity' ? 700 : 400,
                                color: sortBy === 'activity' ? 'var(--color-accent)' : 'var(--color-muted-dim)',
                              }}
                            >
                              {fmt(s.activityScore)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
