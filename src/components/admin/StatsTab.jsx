// Reads per admin panel open (within 5-min cache window):
// ~75 (1 global + 30 daily + 15 schools + 20 forums). Re-opens during
// the cache window: 0. The top-contributors query (~thousands of reads)
// only fires on explicit click.
import { useEffect, useState, useCallback, useRef } from 'react';
import { useStatsCache } from '../../context/StatsCache';
import Card from '../ui/Card';
import Button from '../ui/Button';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n) {
  return (n ?? 0).toLocaleString('mk-MK');
}

function TrendChip({ value }) {
  if (!value || value === 0) return <span style={{ fontSize: 10, color: 'var(--color-muted-dim)' }}>—</span>;
  const pos = value > 0;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: pos ? '#22D3EE' : 'var(--color-muted)',
        letterSpacing: '0.02em',
      }}
    >
      {pos ? '+' : ''}
      {fmt(value)}
    </span>
  );
}

function Shimmer({ h = 80, rounded = 16 }) {
  return <div className="shimmer" style={{ height: h, borderRadius: rounded }} />;
}

// ── KPI cards ─────────────────────────────────────────────────────────────────

const KPI_DEFS = [
  { key: 'totalUsers', label: 'Корисници', deltaKey: 'newUsers' },
  { key: 'totalThreads', label: 'Дискусии', deltaKey: 'newThreads' },
  { key: 'totalComments', label: 'Коментари', deltaKey: 'newComments' },
  { key: 'totalUpvotes', label: 'Upvotes', deltaKey: 'newUpvotes' },
  { key: 'totalReports', label: 'Пријави', deltaKey: 'newReports' },
];

function KpiCards({ global: g, daily }) {
  const last7 = daily ? daily.slice(-7) : [];
  const delta = (key) => last7.reduce((s, d) => s + (d[key] ?? 0), 0);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: 10,
      }}
    >
      {KPI_DEFS.map(({ key, label, deltaKey }) => (
        <div
          key={key}
          style={{
            padding: '16px 18px',
            borderRadius: 14,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <p
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--color-muted-dimmer)',
              margin: '0 0 6px',
            }}
          >
            {label}
          </p>
          <p
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: 'var(--color-ink)',
              margin: '0 0 4px',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            {g ? fmt(g[key]) : '—'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 9, color: 'var(--color-muted-dimmer)' }}>7 дена</span>
            <TrendChip value={delta(deltaKey)} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Activity chart — pure SVG, zero dependencies ──────────────────────────────

const SERIES = [
  { key: 'newUsers', label: 'Корисници', color: 'var(--color-accent)' },
  { key: 'newThreads', label: 'Дискусии', color: '#22D3EE' },
  { key: 'newComments', label: 'Коментари', color: '#F59E0B' },
];

function SvgAreaChart({ daily }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(600);
  const [tooltip, setTooltip] = useState(null); // { x, y, idx }

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const data = daily ?? [];
  if (!data.length) return null;

  const H = 190,
    PAD = { t: 10, r: 8, b: 28, l: 36 };
  const W = Math.max(width, 200);
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const maxVal = Math.max(1, ...SERIES.flatMap((s) => data.map((d) => d[s.key] ?? 0)));
  const yMax = Math.ceil(maxVal * 1.15);

  const xPos = (i) => PAD.l + (i / (data.length - 1)) * innerW;
  const yPos = (v) => PAD.t + innerH - (v / yMax) * innerH;

  const makePath = (key) =>
    data
      .map((d, i) => `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yPos(d[key] ?? 0).toFixed(1)}`)
      .join(' ');

  const makeArea = (key) => {
    const line = makePath(key);
    const last = xPos(data.length - 1).toFixed(1);
    const base = (PAD.t + innerH).toFixed(1);
    return `${line} L${last},${base} L${PAD.l.toFixed(1)},${base} Z`;
  };

  // Y-axis ticks
  const yTicks = [0, Math.round(yMax * 0.5), yMax];

  // X-axis ticks — first, last, and a couple in between
  const xTickIdxs = [
    0,
    Math.floor(data.length * 0.33),
    Math.floor(data.length * 0.66),
    data.length - 1,
  ];

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left - PAD.l;
    const idx = Math.round((mx / innerW) * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    setTooltip({ x: xPos(clamped), idx: clamped });
  };

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg
        width={W}
        height={H}
        style={{ overflow: 'visible', display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          {SERIES.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        {/* Grid lines */}
        {yTicks.map((v) => (
          <line
            key={v}
            x1={PAD.l}
            y1={yPos(v)}
            x2={PAD.l + innerW}
            y2={yPos(v)}
            stroke="var(--color-surface-hover)"
            strokeWidth={1}
          />
        ))}

        {/* Area fills */}
        {SERIES.map((s) => (
          <path key={s.key} d={makeArea(s.key)} fill={`url(#grad-${s.key})`} />
        ))}

        {/* Lines */}
        {SERIES.map((s) => (
          <path
            key={s.key}
            d={makePath(s.key)}
            fill="none"
            stroke={s.color}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* Tooltip crosshair */}
        {tooltip && (
          <>
            <line
              x1={tooltip.x}
              y1={PAD.t}
              x2={tooltip.x}
              y2={PAD.t + innerH}
              stroke="var(--color-border-strong)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {SERIES.map((s) => (
              <circle
                key={s.key}
                cx={tooltip.x}
                cy={yPos(data[tooltip.idx]?.[s.key] ?? 0)}
                r={3}
                fill={s.color}
                stroke="var(--color-surface)"
                strokeWidth={1.5}
              />
            ))}
          </>
        )}

        {/* Y-axis labels */}
        {yTicks.map((v) => (
          <text key={v} x={PAD.l - 6} y={yPos(v) + 4} textAnchor="end" fontSize={10} fill="var(--color-muted-dim)">
            {v}
          </text>
        ))}

        {/* X-axis labels */}
        {xTickIdxs.map((i) => (
          <text key={i} x={xPos(i)} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--color-muted-dim)">
            {data[i]?.date?.slice(5) ?? ''}
          </text>
        ))}
      </svg>

      {/* Tooltip popup */}
      {tooltip && data[tooltip.idx] && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + PAD.l + 10,
            top: PAD.t + 10,
            padding: '8px 12px',
            borderRadius: 9,
            background: '#1C1C1F',
            border: '1px solid var(--color-border-strong)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            fontSize: 11.5,
            pointerEvents: 'none',
            zIndex: 10,
            minWidth: 120,
          }}
        >
          <p style={{ color: 'var(--color-muted)', margin: '0 0 5px', fontSize: 10.5 }}>
            {data[tooltip.idx].date}
          </p>
          {SERIES.map((s) => (
            <p key={s.key} style={{ color: s.color, margin: '2px 0', fontWeight: 600 }}>
              {s.label}: {fmt(data[tooltip.idx][s.key] ?? 0)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityChart({ daily }) {
  return (
    <Card style={{ padding: '20px 24px', position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--color-muted-dimmer)',
            margin: 0,
          }}
        >
          Активност (30 дена)
        </p>
        <div style={{ display: 'flex', gap: 14 }}>
          {SERIES.map((s) => (
            <span
              key={s.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                color: 'var(--color-muted)',
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 2,
                  background: s.color,
                  borderRadius: 99,
                  display: 'inline-block',
                }}
              />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <SvgAreaChart daily={daily} />
    </Card>
  );
}

// ── School comparison table ────────────────────────────────────────────────────

const SORT_COLS = [
  { key: 'userCount', label: 'Корисници' },
  { key: 'threadCount', label: 'Дискусии' },
  { key: 'commentCount', label: 'Коментари' },
  { key: 'score', label: 'Скор' },
];

function SchoolTable({ schools }) {
  const [sortKey, setSortKey] = useState('userCount');
  const [sortDir, setSortDir] = useState(-1); // -1=desc, 1=asc

  const toggle = (key) => {
    if (key === sortKey) setSortDir((d) => d * -1);
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  };

  const rows = [...(schools ?? [])]
    .map((s) => ({
      ...s,
      score: (s.threadCount ?? 0) + (s.commentCount ?? 0) * 0.5,
    }))
    .sort((a, b) => sortDir * ((b[sortKey] ?? 0) - (a[sortKey] ?? 0)));

  return (
    <Card style={{ padding: '20px 24px', overflowX: 'auto' }}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--color-muted-dimmer)',
          margin: '0 0 14px',
        }}
      >
        По училиште
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr>
            <th
              style={{
                textAlign: 'left',
                padding: '5px 8px 8px 0',
                color: 'var(--color-muted-dim)',
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                whiteSpace: 'nowrap',
              }}
            >
              Училиште
            </th>
            <th
              style={{
                textAlign: 'left',
                padding: '5px 8px 8px',
                color: 'var(--color-muted-dim)',
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                whiteSpace: 'nowrap',
              }}
            >
              Град
            </th>
            {SORT_COLS.map((col) => (
              <th
                key={col.key}
                onClick={() => toggle(col.key)}
                style={{
                  textAlign: 'right',
                  padding: '5px 0 8px 8px',
                  color: sortKey === col.key ? 'var(--color-accent)' : 'var(--color-muted-dim)',
                  fontSize: 10.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}
              >
                {col.label} {sortKey === col.key ? (sortDir === -1 ? '↓' : '↑') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={s.id ?? i} style={{ borderTop: '1px solid var(--color-border)' }}>
              <td style={{ padding: '9px 8px 9px 0', color: 'var(--color-ink)', fontWeight: 500 }}>
                {s.schoolName ?? s.id}
              </td>
              <td style={{ padding: '9px 8px', color: 'var(--color-muted)' }}>{s.city ?? '—'}</td>
              <td
                style={{
                  padding: '9px 0 9px 8px',
                  textAlign: 'right',
                  color: 'var(--color-ink-dim)',
                  fontFamily: 'monospace',
                }}
              >
                {fmt(s.userCount)}
              </td>
              <td
                style={{
                  padding: '9px 0 9px 8px',
                  textAlign: 'right',
                  color: 'var(--color-ink-dim)',
                  fontFamily: 'monospace',
                }}
              >
                {fmt(s.threadCount)}
              </td>
              <td
                style={{
                  padding: '9px 0 9px 8px',
                  textAlign: 'right',
                  color: 'var(--color-ink-dim)',
                  fontFamily: 'monospace',
                }}
              >
                {fmt(s.commentCount)}
              </td>
              <td
                style={{
                  padding: '9px 0 9px 8px',
                  textAlign: 'right',
                  color: '#22D3EE',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                }}
              >
                {s.score.toFixed(0)}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-muted-dimmer)', padding: '20px 0' }}>
                Нема податоци. Изврши backfill за да ги пополниш.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}

// ── Top forums ─────────────────────────────────────────────────────────────────

function TopForums({ forums }) {
  const sorted = [...(forums ?? [])]
    .map((f) => ({ ...f, total: (f.threadCount ?? 0) + (f.commentCount ?? 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <Card style={{ padding: '18px 20px' }}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--color-muted-dimmer)',
          margin: '0 0 12px',
        }}
      >
        Топ форуми
      </p>
      {sorted.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--color-muted-dim)', textAlign: 'center', padding: '12px 0' }}>
          Нема податоци.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {sorted.map((f, i) => (
            <div
              key={f.id ?? i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 0',
                borderBottom: i < sorted.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--color-muted-dimmer)',
                  width: 16,
                  textAlign: 'right',
                  flexShrink: 0,
                  fontFamily: 'monospace',
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--color-ink)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.forumName ?? f.id}
              </span>
              <span
                style={{ fontSize: 10.5, color: 'var(--color-muted-dim)', fontFamily: 'monospace', flexShrink: 0 }}
              >
                {fmt(f.threadCount)} дис · {fmt(f.commentCount)} ком
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Top contributors (lazy) ────────────────────────────────────────────────────

function TopContributors() {
  const { slots, load } = useStatsCache();
  const { data, loading, error } = slots.contributors;

  const handleLoad = useCallback(() => load('contributors'), [load]);

  if (!data && !loading) {
    return (
      <Card style={{ padding: '18px 20px' }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--color-muted-dimmer)',
            margin: '0 0 8px',
          }}
        >
          Топ контрибутори (30 дена)
        </p>
        <p style={{ fontSize: 12.5, color: 'var(--color-muted-dim)', margin: '0 0 14px' }}>
          Овој преглед чита повеќе податоци. Притисни за да го вчиташ.
        </p>
        {error && <p style={{ fontSize: 11.5, color: 'var(--color-coral)', margin: '0 0 10px' }}>{error}</p>}
        <Button variant="secondary" size="sm" onClick={handleLoad}>
          Вчитај топ контрибутори
        </Button>
      </Card>
    );
  }

  return (
    <Card style={{ padding: '18px 20px' }}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--color-muted-dimmer)',
          margin: '0 0 12px',
        }}
      >
        Топ контрибутори (30 дена)
      </p>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Shimmer key={i} h={42} rounded={10} />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--color-muted-dim)', textAlign: 'center', padding: '12px 0' }}>
          Нема активност во последните 30 дена.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {data.map((u, i) => (
            <div
              key={u.authorId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 0',
                borderBottom: i < data.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--color-muted-dimmer)',
                  width: 16,
                  textAlign: 'right',
                  flexShrink: 0,
                  fontFamily: 'monospace',
                }}
              >
                {i + 1}
              </span>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: 'rgba(124,92,255,0.15)',
                  border: '1px solid rgba(124,92,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--color-accent)',
                }}
              >
                {(u.authorUsername?.[0] ?? '?').toUpperCase()}
              </div>
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
                  @{u.authorUsername}
                </p>
                {u.authorSchool && (
                  <p
                    style={{
                      fontSize: 10.5,
                      color: 'var(--color-muted-dim)',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {u.authorSchool}
                  </p>
                )}
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontFamily: 'monospace',
                  flexShrink: 0,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(124,92,255,0.1)',
                  border: '1px solid rgba(124,92,255,0.2)',
                  color: 'var(--color-accent)',
                }}
              >
                {u.threads} дис · {u.comments} ком
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── StatsTab ──────────────────────────────────────────────────────────────────

export default function StatsTab() {
  const { slots, load, refreshAll, ageMinutes } = useStatsCache();
  const { global: g, daily: d, schools: sc, forums: fo } = slots;

  useEffect(() => {
    load('global');
    load('daily');
    load('schools');
    load('forums');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = g.loading || d.loading || sc.loading || fo.loading;
  const age = ageMinutes('global');

  return (
    <div className="space-y-5">
      {/* Cache status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 11.5, color: 'var(--color-muted-dim)', margin: 0, flex: 1 }}>
          {age === null
            ? 'Вчитување…'
            : age === 0
              ? 'Освежено штотуку · Кешот трае 5 мин'
              : `Освежено пред ${age} мин · Кешот трае 5 мин`}
        </p>
        <Button
          variant="secondary"
          size="sm"
          loading={isLoading}
          disabled={isLoading}
          onClick={refreshAll}
        >
          ↻ Освежи
        </Button>
      </div>

      {/* KPI cards */}
      {g.loading && !g.data ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))',
            gap: 10,
          }}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <Shimmer key={i} h={90} />
          ))}
        </div>
      ) : (
        <KpiCards global={g.data} daily={d.data} />
      )}

      {/* Activity chart */}
      {d.loading && !d.data ? <Shimmer h={240} /> : <ActivityChart daily={d.data} />}

      {/* School table */}
      {sc.loading && !sc.data ? <Shimmer h={180} /> : <SchoolTable schools={sc.data} />}

      {/* Top forums */}
      {fo.loading && !fo.data ? <Shimmer h={200} /> : <TopForums forums={fo.data} />}

      {/* Top contributors — lazy */}
      <TopContributors />
    </div>
  );
}
