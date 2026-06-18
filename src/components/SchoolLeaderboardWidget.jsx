import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchSchoolLeaderboard } from '../lib/firestore/stats';

const RANK_STYLE = {
  1: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', text: '#F59E0B' },
  2: { bg: 'rgba(161,161,170,0.1)', border: 'rgba(161,161,170,0.2)', text: 'var(--color-ink-dim)' },
  3: { bg: 'rgba(194,133,92,0.1)', border: 'rgba(194,133,92,0.22)', text: '#C07A4A' },
};

function TrophyIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#F59E0B"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H3V6h3m15 3h-3V6h3M6 9c0 4 2 7 6 8.5C16 16 18 13 18 9V3H6v6z" />
      <path d="M9 22h6M12 17v5" />
    </svg>
  );
}

export default function SchoolLeaderboardWidget() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchoolLeaderboard({ sortBy: 'activity', limit: 3 })
      .then((data) => {
        setSchools(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 14,
        padding: '14px 16px',
        boxShadow: 'var(--shadow-card)',
        animation: 'fadeUp 0.35s cubic-bezier(0.23,1,0.32,1) both',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrophyIcon size={13} />
          <span className="font-display font-semibold" style={{ fontSize: 13, color: 'var(--color-ink)' }}>
            Топ Училишта
          </span>
        </div>
        <Link
          to="/leaderboard"
          className="font-medium"
          style={{
            fontSize: 12,
            color: 'var(--color-accent)',
            textDecoration: 'none',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.75')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          Сите →
        </Link>
      </div>

      {/* Rows */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <div className="shimmer w-7 h-7 rounded-lg shrink-0" />
              <div className="shimmer h-3 rounded flex-1" style={{ maxWidth: '60%' }} />
              <div className="shimmer h-3 w-10 rounded ml-auto" />
            </div>
          ))}
        </div>
      ) : schools.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--color-muted-dim)', textAlign: 'center', padding: '12px 0' }}>
          Сè уште нема активност — биди прв.
        </p>
      ) : (
        <div className="space-y-0.5">
          {schools.map((s, i) => {
            const rs = RANK_STYLE[s.rank] ?? {
              bg: 'var(--color-surface-hover)',
              border: 'var(--color-border)',
              text: 'var(--color-muted-dim)',
            };
            const score = Math.round((s.threadCount ?? 0) + (s.commentCount ?? 0) * 0.5);
            return (
              <Link
                key={s.id}
                to={`/p/school-${s.id}`}
                className="flex items-center gap-2.5 rounded-lg"
                style={{
                  padding: '6px 8px',
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                  animationDelay: `${i * 50}ms`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Rank badge */}
                <span
                  className="shrink-0 inline-flex items-center justify-center font-mono font-bold rounded-lg"
                  style={{
                    width: 26,
                    height: 26,
                    fontSize: 10,
                    background: rs.bg,
                    border: `1px solid ${rs.border}`,
                    color: rs.text,
                  }}
                >
                  {s.rank}
                </span>

                {/* School name */}
                <span
                  className="flex-1 truncate font-medium"
                  style={{ fontSize: 12.5, color: 'var(--color-ink-dim)' }}
                >
                  {s.schoolName ?? s.id}
                </span>

                {/* Score */}
                <span
                  className="font-mono font-semibold shrink-0"
                  style={{ fontSize: 12, color: 'var(--color-accent)' }}
                >
                  {score.toLocaleString('mk-MK')}
                </span>
              </Link>
            );
          })}

          {schools.length < 3 && (
            <p className="pt-1 text-center" style={{ fontSize: 11, color: 'var(--color-muted-dimmer)' }}>
              Уште малку и листата ќе биде полна
            </p>
          )}
        </div>
      )}
    </div>
  );
}
