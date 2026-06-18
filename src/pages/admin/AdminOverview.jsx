import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useStatsCache } from '../../context/StatsCache';
import { fetchReports } from '../../lib/firestore/reports';
import { fetchForumSuggestions } from '../../lib/firestore/forumSuggestions';
import { timeAgo } from '../../utils/timeAgo';
import Card from '../../components/ui/Card';

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Добро утро';
  if (h < 18) return 'Добар ден';
  return 'Добра вечер';
}

function fmt(n) {
  return (n ?? 0).toLocaleString('mk-MK');
}

// ── KpiCard ───────────────────────────────────────────────────────────────────

function KpiCard({ label, value, delta, loading }) {
  if (loading) return <div className="shimmer rounded-2xl" style={{ height: 90 }} />;
  return (
    <Card style={{ padding: '16px 20px' }}>
      <p
        style={{
          fontSize: 9,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: 'var(--color-muted-dimmer)',
          margin: '0 0 6px',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: 'var(--color-ink)',
          margin: '0 0 4px',
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}
      >
        {value != null ? fmt(value) : '—'}
      </p>
      {delta != null && delta !== 0 && (
        <span style={{ fontSize: 10, fontWeight: 700, color: delta > 0 ? '#22D3EE' : 'var(--color-muted)' }}>
          {delta > 0 ? '+' : ''}
          {fmt(delta)} (7 дена)
        </span>
      )}
    </Card>
  );
}

// ── PendingReportsCard ────────────────────────────────────────────────────────

function PendingReportsCard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports({ status: 'pending', pageSize: 3 })
      .then((res) => setReports(res.reports))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const REASON_LABEL = {
    spam: 'Спам',
    offensive: 'Навредливо',
    misinformation: 'Дезинформ.',
    inappropriate_age: 'Несоодветно',
    other: 'Друго',
  };
  const REASON_COLOR = {
    spam: 'var(--color-muted-dim)',
    offensive: 'var(--color-coral)',
    misinformation: '#F59E0B',
    inappropriate_age: 'var(--color-coral)',
    other: 'var(--color-muted)',
  };

  return (
    <Card style={{ padding: '20px 22px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>Чекаат пријави</span>
          {!loading && reports.length > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: 'monospace',
                padding: '1px 7px',
                borderRadius: 999,
                background: 'rgba(248,113,113,0.12)',
                color: 'var(--color-coral)',
                border: '1px solid rgba(248,113,113,0.2)',
              }}
            >
              {reports.length}+
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="shimmer rounded-xl" style={{ height: 52 }} />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p style={{ fontSize: 13, color: 'var(--color-muted-dim)', margin: 0 }}>Нема пријави кои чекаат.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {reports.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 0',
                borderBottom: i < reports.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  padding: '2px 7px',
                  borderRadius: 999,
                  flexShrink: 0,
                  background: `${REASON_COLOR[r.reason] ?? 'var(--color-muted)'}18`,
                  color: REASON_COLOR[r.reason] ?? 'var(--color-muted)',
                  border: `1px solid ${REASON_COLOR[r.reason] ?? 'var(--color-muted)'}30`,
                }}
              >
                {REASON_LABEL[r.reason] ?? 'Друго'}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  color: 'var(--color-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                @{r.reporterUsername}
              </span>
              <span
                style={{ fontSize: 10.5, color: 'var(--color-muted-dimmer)', fontFamily: 'monospace', flexShrink: 0 }}
              >
                {timeAgo(r.createdAt?.toDate?.() ?? r.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
        <Link
          to="/admin/reports"
          style={{ fontSize: 12, color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
        >
          Прегледај ги сите →
        </Link>
      </div>
    </Card>
  );
}

// ── PendingSuggestionsCard ────────────────────────────────────────────────────

function PendingSuggestionsCard() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForumSuggestions({ status: 'pending', pageSize: 3 })
      .then((res) => setSuggestions(res.suggestions))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card style={{ padding: '20px 22px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>Чекаат предлози</span>
          {!loading && suggestions.length > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                fontFamily: 'monospace',
                padding: '1px 7px',
                borderRadius: 999,
                background: 'rgba(124,92,255,0.1)',
                color: 'var(--color-accent)',
                border: '1px solid rgba(124,92,255,0.2)',
              }}
            >
              {suggestions.length}+
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="shimmer rounded-xl" style={{ height: 48 }} />
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p style={{ fontSize: 13, color: 'var(--color-muted-dim)', margin: 0 }}>Нема предлози кои чекаат.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {suggestions.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 0',
                borderBottom:
                  i < suggestions.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--color-ink)',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.title}
                </p>
                <p style={{ fontSize: 11, color: 'var(--color-muted-dim)', margin: '1px 0 0' }}>
                  @{s.suggestedByUsername}
                </p>
              </div>
              <span
                style={{ fontSize: 10.5, color: 'var(--color-muted-dimmer)', fontFamily: 'monospace', flexShrink: 0 }}
              >
                {timeAgo(s.createdAt?.toDate?.() ?? s.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
        <Link
          to="/admin/suggestions"
          style={{ fontSize: 12, color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
        >
          Прегледај ги сите →
        </Link>
      </div>
    </Card>
  );
}

// ── RecentActivityCard ────────────────────────────────────────────────────────

function RecentActivityCard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Fetch recent moderation log entries
        const modSnap = await getDocs(
          query(collection(db, 'moderationLog'), orderBy('createdAt', 'desc'), limit(6)),
        );
        const modItems = modSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          _type: 'mod',
          _time: d.data().createdAt?.toDate?.() ?? d.data().createdAt,
        }));

        // Fetch recent threads
        const threadSnap = await getDocs(
          query(collection(db, 'threads'), orderBy('createdAt', 'desc'), limit(5)),
        );
        const threadItems = threadSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          _type: 'thread',
          _time: d.data().createdAt?.toDate?.() ?? d.data().createdAt,
        }));

        // Merge + sort by time, take top 8
        const all = [...modItems, ...threadItems]
          .filter((x) => x._time)
          .sort((a, b) => b._time - a._time)
          .slice(0, 8);

        setItems(all);
      } catch { /* intentional */ }
      setLoading(false);
    }
    load();
  }, []);

  const ACTION_COLORS = {
    warn: '#F59E0B',
    warned: '#F59E0B',
    ban: 'var(--color-coral)',
    banned: 'var(--color-coral)',
    banned_permanent: 'var(--color-coral)',
    unban: '#4ADE80',
    unbanned: '#4ADE80',
    removed: 'var(--color-ink-dim)',
    ignored: 'var(--color-muted-dim)',
  };

  const renderItem = (item) => {
    if (item._type === 'thread') {
      return (
        <div
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 0',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(124,92,255,0.1)',
              border: '1px solid rgba(124,92,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="12" height="12" fill="none" stroke="var(--color-accent)" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p
            style={{
              flex: 1,
              fontSize: 12,
              color: 'var(--color-ink-dim)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>@{item.authorUsername}</span>{' '}
            постави дискусија <span style={{ color: 'var(--color-muted)' }}>{item.title}</span>
          </p>
          <span style={{ fontSize: 10, color: 'var(--color-muted-dimmer)', fontFamily: 'monospace', flexShrink: 0 }}>
            {timeAgo(item._time)}
          </span>
        </div>
      );
    }

    // Moderation action
    const actionColor = ACTION_COLORS[item.action] ?? 'var(--color-muted)';
    return (
      <div
        key={item.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 0',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: `${actionColor}18`,
            border: `1px solid ${actionColor}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" fill="none" stroke={actionColor} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <p
          style={{
            flex: 1,
            fontSize: 12,
            color: 'var(--color-ink-dim)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          Модерација: <span style={{ color: actionColor, fontWeight: 600 }}>{item.action}</span>
          {item.targetUsername && (
            <>
              {' '}
              на <span style={{ color: 'var(--color-ink)' }}>@{item.targetUsername}</span>
            </>
          )}
          {item.moderatorUsername && (
            <span style={{ color: 'var(--color-muted-dim)' }}> · @{item.moderatorUsername}</span>
          )}
        </p>
        <span style={{ fontSize: 10, color: 'var(--color-muted-dimmer)', fontFamily: 'monospace', flexShrink: 0 }}>
          {timeAgo(item._time)}
        </span>
      </div>
    );
  };

  return (
    <Card style={{ padding: '20px 22px' }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>Скорешна активност</span>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shimmer rounded-xl" style={{ height: 44 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-muted-dim)',
            textAlign: 'center',
            padding: '20px 0',
            margin: 0,
          }}
        >
          Нема скорешна активност.
        </p>
      ) : (
        <div>{items.map((item) => renderItem(item))}</div>
      )}
    </Card>
  );
}

// ── AdminOverview default export ──────────────────────────────────────────────

export default function AdminOverview() {
  const { userProfile } = useAuth();
  const { slots, load } = useStatsCache();

  useEffect(() => {
    load('global');
    load('daily');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const g = slots.global;
  const d = slots.daily;
  const last7 = d.data ? d.data.slice(-7) : [];
  const delta = (key) => last7.reduce((s, row) => s + (row[key] ?? 0), 0);

  const KPI_DEFS = [
    { label: 'Корисници', valueKey: 'totalUsers', deltaKey: 'newUsers' },
    { label: 'Дискусии', valueKey: 'totalThreads', deltaKey: 'newThreads' },
    { label: 'Коментари', valueKey: 'totalComments', deltaKey: 'newComments' },
    { label: 'Upvotes', valueKey: 'totalUpvotes', deltaKey: 'newUpvotes' },
    { label: 'Пријави', valueKey: 'totalReports', deltaKey: 'newReports' },
  ];

  return (
    <div
      style={{ padding: '0 24px 32px', animation: 'fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      {/* Welcome strip */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "'Outfit', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: 22,
            color: 'var(--color-ink)',
            letterSpacing: '-0.03em',
            margin: '0 0 4px',
            lineHeight: 1.2,
          }}
        >
          {greeting()}, {userProfile?.username ?? 'Админ'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-muted-dim)', margin: 0 }}>
          Добредојде назад во контролниот панел.
        </p>
      </div>

      {/* KPI grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {KPI_DEFS.map(({ label, valueKey, deltaKey }) => (
          <KpiCard
            key={valueKey}
            label={label}
            value={g.data?.[valueKey]}
            delta={d.data ? delta(deltaKey) : null}
            loading={g.loading && !g.data}
          />
        ))}
      </div>

      {/* Two-column actionable work */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <PendingReportsCard />
        <PendingSuggestionsCard />
      </div>

      {/* Recent activity */}
      <RecentActivityCard />
    </div>
  );
}
