import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { searchThreads } from '../lib/firestore/search';
import { searchUsernames } from '../lib/firestore/users';
import Avatar from '../components/Avatar';
import { timeAgo } from '../utils/timeAgo';
import { transliterateQuery } from '../lib/transliterate';

const RELEVANCE_OPTIONS = [
  { key: 'recent', label: 'Поскоро' },
  { key: 'popular', label: 'Популарни' },
  { key: 'featured', label: 'Истакнати' },
  { key: 'new', label: 'Нови' },
];

const TIME_OPTIONS = [
  { key: 'all', label: 'Секогаш' },
  { key: 'today', label: 'Денес' },
  { key: 'week', label: 'Неделава' },
  { key: 'month', label: 'Месецов' },
  { key: 'year', label: 'Годинава' },
];

function getMs(createdAt) {
  if (createdAt?.toDate) return createdAt.toDate().getTime();
  return createdAt instanceof Date ? createdAt.getTime() : Number(createdAt);
}

function inWindow(createdAt, key) {
  const diff = Date.now() - getMs(createdAt);
  if (key === 'today') return diff < 86_400_000;
  if (key === 'week') return diff < 604_800_000;
  if (key === 'month') return diff < 2_592_000_000;
  if (key === 'year') return diff < 31_536_000_000;
  return true;
}

function filterAndSort(threads, query, relevance, timeKey) {
  const q = query.trim().toLowerCase();

  let list = threads;
  if (q) {
    const variants = transliterateQuery(q);
    list = list.filter((t) => {
      const title = t.title.toLowerCase();
      const body = t.body.toLowerCase();
      const forum = (t.forumName ?? '').toLowerCase();
      const author = (t.authorUsername ?? '').toLowerCase();
      return variants.some(
        (v) => title.includes(v) || body.includes(v) || forum.includes(v) || author.includes(v),
      );
    });
  }
  if (timeKey !== 'all') {
    list = list.filter((t) => inWindow(t.createdAt, timeKey));
  }

  list = [...list];
  if (relevance === 'featured') {
    list = list.filter((t) => t.isFeatured).sort((a, b) => b.upvoteCount - a.upvoteCount);
  } else if (relevance === 'popular') {
    list.sort((a, b) => b.upvoteCount - a.upvoteCount);
  } else if (relevance === 'new') {
    const cutoff = Date.now() - 86_400_000;
    list = list
      .filter((t) => getMs(t.createdAt) > cutoff)
      .sort((a, b) => getMs(b.createdAt) - getMs(a.createdAt));
  } else {
    list.sort((a, b) => getMs(b.createdAt) - getMs(a.createdAt));
  }
  return list;
}

function highlight(text, query) {
  if (!query.trim()) return text;
  const variants = transliterateQuery(query);
  const escaped = variants.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = escaped.join('|');
  const splitRx = new RegExp(`(${pattern})`, 'gi');
  return text.split(splitRx).map((part, i) =>
    i % 2 === 1 ? (
      <mark
        key={i}
        style={{
          background: 'rgba(250,204,21,0.5)',
          color: 'var(--color-ink)',
          borderRadius: 2,
          padding: '0 1px',
        }}
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function FilterPills({ options, value, onChange }) {
  return (
    <div
      className="flex items-center gap-[3px] p-[3px] rounded-xl w-fit"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {options.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className="px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap"
          style={{
            ...(value === key
              ? {
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-ink)',
                  boxShadow: 'var(--shadow-card)',
                }
              : { color: 'var(--color-muted)' }),
            transition: 'background 0.18s cubic-bezier(0.23,1,0.32,1), color 0.18s',
          }}
          onMouseEnter={(e) => {
            if (value !== key) e.currentTarget.style.color = 'var(--color-ink-dim)';
          }}
          onMouseLeave={(e) => {
            if (value !== key) e.currentTarget.style.color = 'var(--color-muted)';
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function SearchCard({ thread, query }) {
  const cardRef = useRef(null);

  const onMouseMove = (e) => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty('--mx', `${e.clientX - r.left}px`);
    cardRef.current.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  const onMouseLeave = () => {
    cardRef.current?.style.setProperty('--mx', '-999px');
    cardRef.current?.style.setProperty('--my', '-999px');
  };

  const bodyPreview = stripHtml(thread.body).split('\n\n')[0].slice(0, 180);
  const createdAt = thread.createdAt?.toDate?.() ?? thread.createdAt;

  return (
    <Link
      to={`/p/${thread.forumId}/${thread.id}`}
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="block rounded-2xl p-4"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        position: 'relative',
        overflow: 'hidden',
        textDecoration: 'none',
        transition: 'border-color 0.18s',
      }}
      onMouseEnterCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)')}
      onMouseLeaveCapture={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(300px circle at var(--mx, -999px) var(--my, -999px), rgba(255,255,255,0.03), transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div className="relative">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: thread.forumColor }}
          />
          <span
            className="text-[10.5px] font-semibold uppercase tracking-[0.06em]"
            style={{ color: thread.forumColor }}
          >
            {thread.forumName}
          </span>
          {thread.isFeatured && (
            <span
              className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full"
              style={{
                color: '#F59E0B',
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.18)',
              }}
            >
              Истакнато
            </span>
          )}
          <span className="ml-auto text-[11px] font-mono shrink-0" style={{ color: 'var(--color-muted-dim)' }}>
            {timeAgo(createdAt)}
          </span>
        </div>

        <h3 className="font-display font-bold text-[15px] text-ink leading-snug tracking-tight mb-1.5">
          {highlight(thread.title, query)}
        </h3>

        <p
          className="text-[12.5px] leading-relaxed mb-3"
          style={{
            color: 'var(--color-muted)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {highlight(bodyPreview, query)}
          {thread.body.length > 180 && '…'}
        </p>

        <div className="flex items-center gap-4 text-[11px] font-mono" style={{ color: 'var(--color-muted-dim)' }}>
          <span className="flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
            {thread.upvoteCount}
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {thread.commentCount}
          </span>
          <span>{thread.authorUsername}</span>
        </div>
      </div>
    </Link>
  );
}

function SearchCardSkeleton() {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '16px' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="shimmer w-1.5 h-1.5 rounded-full shrink-0" />
        <div className="shimmer h-2.5 w-20 rounded" />
        <div className="shimmer h-2.5 w-12 rounded ml-auto" />
      </div>
      <div className="shimmer h-4 w-3/4 rounded mb-1.5" />
      <div className="shimmer h-3.5 w-full rounded mb-1" />
      <div className="shimmer h-3.5 w-2/3 rounded mb-3" />
      <div className="flex gap-4">
        <div className="shimmer h-2.5 w-8 rounded" />
        <div className="shimmer h-2.5 w-8 rounded" />
        <div className="shimmer h-2.5 w-16 rounded" />
      </div>
    </div>
  );
}

function EmptyState({ hasQuery, query }) {
  return (
    <div
      className="rounded-2xl p-12 flex flex-col items-center gap-3 text-center"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}
      >
        <svg
          className="w-5 h-5"
          style={{ color: 'var(--color-muted-dim)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {hasQuery ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          )}
        </svg>
      </div>
      <div>
        <p className="font-display font-bold text-ink text-[15px]">
          {hasQuery ? `Нема резултати за „${query}"` : 'Што бараш? 🔍'}
        </p>
        <p className="text-[13px] mt-1" style={{ color: 'var(--color-muted)' }}>
          {hasQuery
            ? 'Пробај со други зборови или прошири ги филтрите.'
            : 'Внеси збор за пребарување на дискусии, теми или автори.'}
        </p>
      </div>
    </div>
  );
}

// ── Mode toggle (Threads ⇄ Users) ───────────────────────────────────────────
function ModeToggle({ mode, onChange }) {
  const TABS = [
    {
      key: 'threads',
      label: 'Дискусии',
      icon: 'M4 6h16M4 12h16M4 18h10',
    },
    {
      key: 'users',
      label: 'Корисници',
      icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 00-1.5-3.12',
    },
  ];
  return (
    <div
      className="grid grid-cols-2 gap-[3px] p-[3px] rounded-xl"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      role="tablist"
      aria-label="Тип на пребарување"
    >
      {TABS.map(({ key, label, icon }) => {
        const active = mode === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold"
            style={{
              ...(active
                ? {
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-ink)',
                    boxShadow: 'var(--shadow-card)',
                  }
                : { color: 'var(--color-muted)' }),
              transition: 'background 0.18s cubic-bezier(0.23,1,0.32,1), color 0.18s',
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.color = 'var(--color-ink-dim)';
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.color = 'var(--color-muted)';
            }}
          >
            <svg
              className="w-3.5 h-3.5 shrink-0"
              style={active ? { color: 'var(--color-accent)' } : undefined}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function UserCard({ user, query }) {
  const cardRef = useRef(null);

  const onMouseMove = (e) => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty('--mx', `${e.clientX - r.left}px`);
    cardRef.current.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  const onMouseLeave = () => {
    cardRef.current?.style.setProperty('--mx', '-999px');
    cardRef.current?.style.setProperty('--my', '-999px');
  };

  return (
    <Link
      to={`/u/${user.username?.toLowerCase()}`}
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="flex items-center gap-3.5 rounded-2xl p-3.5"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        position: 'relative',
        overflow: 'hidden',
        textDecoration: 'none',
        transition: 'border-color 0.18s',
      }}
      onMouseEnterCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)')}
      onMouseLeaveCapture={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(300px circle at var(--mx, -999px) var(--my, -999px), rgba(255,255,255,0.03), transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <Avatar username={user.username} avatarUrl={user.avatarUrl ?? null} size="md" className="relative" />

      <div className="relative min-w-0 flex-1">
        <p className="font-display font-bold text-[14px] text-ink leading-snug truncate">
          {highlight(user.username, query)}
        </p>
        <p className="text-[12px] truncate" style={{ color: 'var(--color-muted)' }}>
          {user.school || 'Средношколец'}
        </p>
      </div>

      <svg
        className="relative w-4 h-4 shrink-0"
        style={{ color: 'var(--color-muted-dim)' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

function UserCardSkeleton() {
  return (
    <div
      className="flex items-center gap-3.5 rounded-2xl p-3.5"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="shimmer w-9 h-9 rounded-2xl shrink-0" />
      <div className="flex-1">
        <div className="shimmer h-3.5 w-1/3 rounded mb-1.5" />
        <div className="shimmer h-3 w-1/4 rounded" />
      </div>
    </div>
  );
}

function UserEmptyState({ hasQuery, query }) {
  return (
    <div
      className="rounded-2xl p-12 flex flex-col items-center gap-3 text-center"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}
      >
        <svg
          className="w-5 h-5"
          style={{ color: 'var(--color-muted-dim)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 00-1.5-3.12"
          />
        </svg>
      </div>
      <div>
        <p className="font-display font-bold text-ink text-[15px]">
          {hasQuery ? `Нема корисник „${query}"` : 'Најди корисник 👤'}
        </p>
        <p className="text-[13px] mt-1" style={{ color: 'var(--color-muted)' }}>
          {hasQuery
            ? 'Провери го корисничкото име и пробај повторно.'
            : 'Внеси корисничко име за да најдеш друг средношколец.'}
        </p>
      </div>
    </div>
  );
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [relevance, setRelevance] = useState('recent');
  const [timeFilter, setTimeFilter] = useState('all');

  // Corpus: fetched once, filtered client-side
  const [corpus, setCorpus] = useState([]);
  const [loading, setLoading] = useState(true);

  // User search
  const [userResults, setUserResults] = useState([]);
  const [userLoading, setUserLoading] = useState(false);

  const query = searchParams.get('q') ?? '';
  const mode = searchParams.get('type') === 'users' ? 'users' : 'threads';

  const updateParams = (next) => {
    const params = {};
    if (next.q ?? query) params.q = next.q ?? query;
    const nextMode = next.type ?? mode;
    if (nextMode === 'users') params.type = 'users';
    setSearchParams(params);
  };

  const setQuery = (val) => updateParams({ q: val });
  const setMode = (val) => updateParams({ type: val });

  useEffect(() => {
    setLoading(true);
    // searchThreads with no arg fetches the full recent batch
    searchThreads('')
      .then((threads) => setCorpus(threads))
      .catch(() => setCorpus([]))
      .finally(() => setLoading(false));
  }, []);

  // Debounced username search (server-side prefix query)
  useEffect(() => {
    if (mode !== 'users') return;
    const q = query.trim();
    if (!q) {
      setUserResults([]);
      setUserLoading(false);
      return;
    }
    setUserLoading(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      searchUsernames(q, 20)
        .then((users) => {
          if (!cancelled) setUserResults(users);
        })
        .catch(() => {
          if (!cancelled) setUserResults([]);
        })
        .finally(() => {
          if (!cancelled) setUserLoading(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, mode]);

  const results = useMemo(
    () => filterAndSort(corpus, query, relevance, timeFilter),
    [corpus, query, relevance, timeFilter],
  );

  return (
    <div className="space-y-5">
      {/* ── Masthead ── */}
      <div className="flex items-end justify-between gap-6 pb-1">
        <div className="flex items-center gap-3.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(124,92,255,0.1)', border: '1px solid rgba(124,92,255,0.2)' }}
          >
            <svg
              className="w-4 h-4"
              style={{ color: 'var(--color-accent)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div>
            <p
              className="text-[9px] font-bold uppercase tracking-[0.18em] mb-0.5"
              style={{ color: 'var(--color-muted-dimmer)' }}
            >
              Средношколски Глас
            </p>
            <h1 className="font-display font-bold text-[22px] text-ink tracking-tight leading-none">
              Пребарување
            </h1>
          </div>
        </div>
      </div>

      <div aria-hidden style={{ height: 1, background: 'var(--color-surface-hover)' }} />

      {/* ── Mode toggle: Threads ⇄ Users ── */}
      <ModeToggle mode={mode} onChange={setMode} />

      {/* ── Search input ── */}
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: 'var(--color-muted-dim)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            mode === 'users'
              ? 'Пребарај корисник по корисничко име...'
              : 'Пребарај дискусии... (латиница и кирилица)'
          }
          // eslint-disable-next-line jsx-a11y/no-autofocus -- intentional focus management: search input autofocuses on the dedicated search page
          autoFocus
          className="w-full pl-11 pr-10 py-3.5 rounded-2xl text-[14px]"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-ink)',
            outline: 'none',
            boxShadow: 'var(--shadow-card)',
            transition: 'border-color 0.18s',
            fontFamily: 'inherit',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(124,92,255,0.35)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--color-muted-dim)', transition: 'color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-ink-dim)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted-dim)')}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* ── Filters (threads only) ── */}
      {mode === 'threads' && (
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 pb-0.5">
            <FilterPills options={RELEVANCE_OPTIONS} value={relevance} onChange={setRelevance} />
            <FilterPills options={TIME_OPTIONS} value={timeFilter} onChange={setTimeFilter} />
          </div>
        </div>
      )}

      {mode === 'users' ? (
        <>
          {/* ── User results count ── */}
          {query && !userLoading && userResults.length > 0 && (
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-semibold text-ink">
                {userResults.length} корисник{userResults.length === 1 ? '' : 'и'}
              </span>
              <span className="text-[12px]" style={{ color: 'var(--color-muted-dim)' }}>
                за „{query}“
              </span>
            </div>
          )}

          {/* ── User results ── */}
          {userLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <UserCardSkeleton key={i} />
              ))}
            </div>
          ) : !query || userResults.length === 0 ? (
            <UserEmptyState hasQuery={!!query} query={query} />
          ) : (
            <div className="space-y-2">
              {userResults.map((u) => (
                <UserCard key={u.id} user={u} query={query} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* ── Results count ── */}
          {query && !loading && results.length > 0 && (
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-semibold text-ink">
                {results.length} резултат{results.length === 1 ? '' : 'и'}
              </span>
              <span className="text-[12px]" style={{ color: 'var(--color-muted-dim)' }}>
                за „{query}“
              </span>
            </div>
          )}

          {/* ── Results ── */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SearchCardSkeleton key={i} />
              ))}
            </div>
          ) : !query || results.length === 0 ? (
            <EmptyState hasQuery={!!query} query={query} />
          ) : (
            <div className="space-y-2">
              {results.map((t) => (
                <SearchCard key={t.id} thread={t} query={query} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
