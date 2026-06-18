import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePaginatedThreads } from '../hooks/usePaginatedThreads';
import { useTrending } from '../hooks/useTrending';
import { getUserUpvotesForTargets } from '../lib/firestore/upvotes';
import { getUserReactionsForTargets } from '../lib/firestore/reactions';
import { getUserSavedBatch } from '../lib/firestore/savedPosts';
import PostCard from '../components/PostCard';
import { FeedSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import SchoolLeaderboardWidget from '../components/SchoolLeaderboardWidget';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Tabs from '../components/ui/Tabs';

const SORT_OPTIONS = [
  { key: 'trending', label: 'Трендинг' },
  { key: 'new', label: 'Нови' },
  { key: 'popular', label: 'Популарни' },
  { key: 'featured', label: 'Истакнати' },
];

function LoadMoreBtn({ onClick, loading }) {
  return (
    <div className="flex justify-center pt-2">
      <Button
        variant="secondary"
        loading={loading}
        disabled={loading}
        onClick={onClick}
        className="min-w-[140px] justify-center"
      >
        {loading ? 'Вчитување…' : 'Вчитај повеќе'}
      </Button>
    </div>
  );
}

function EmptyFeed({ sort, isAuthenticated, onResetSort }) {
  if (sort === 'featured') {
    return (
      <Card>
        <EmptyState
          icon="✨"
          title="Засега нема истакнати дискусии"
          message="Сите дискусии подеднакво вредат внимание. Погледни ги останатите."
          action={{ label: 'Назад на Нови', onClick: onResetSort }}
        />
      </Card>
    );
  }
  if (!isAuthenticated) {
    return (
      <Card>
        <EmptyState
          icon="🌙"
          title="Тука е тивко"
          message="Биди прв што ќе започне дискусија — за тоа треба само да се најавиш."
          action={{ label: 'Најави се', to: '/login' }}
        />
      </Card>
    );
  }
  return (
    <Card>
      <EmptyState
        icon="🌙"
        title="Тука е тивко"
        message="Сè уште нема дискусии. Биди прв и постави нешто."
        action={{ label: 'Нова дискусија', to: '/new' }}
      />
    </Card>
  );
}

function TrendingSection({ threads, loading, refresh, onSwitchTab, isAuthenticated, userProfile }) {
  const [refreshing, setRefreshing] = useState(false);
  const [votedSet, setVotedSet] = useState(new Set());
  const [savedSet, setSavedSet] = useState(new Set());
  const [reactionsMap, setReactionsMap] = useState(new Map());
  const fetchedIds = useRef(new Set());

  useEffect(() => {
    if (!isAuthenticated || !userProfile || threads.length === 0) return;
    const newThreads = threads.filter((t) => !fetchedIds.current.has(t.id));
    if (newThreads.length === 0) return;
    const targets = newThreads.map((t) => ({ targetType: 'thread', targetId: t.id }));
    const threadIds = newThreads.map((t) => t.id);
    Promise.all([
      getUserUpvotesForTargets(userProfile.id, targets),
      getUserSavedBatch(userProfile.id, threadIds),
      getUserReactionsForTargets(userProfile.id, targets),
    ])
      .then(([newVoted, newSaved, newReactions]) => {
        newThreads.forEach((t) => fetchedIds.current.add(t.id));
        if (newVoted.size > 0) setVotedSet((prev) => new Set([...prev, ...newVoted]));
        if (newSaved.size > 0) setSavedSet((prev) => new Set([...prev, ...newSaved]));
        if (newReactions.size > 0)
          setReactionsMap((prev) => new Map([...prev, ...newReactions]));
      })
      .catch(() => {});
  }, [threads, isAuthenticated, userProfile]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (loading) return <FeedSkeleton count={5} />;

  if (threads.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="🌙"
          title="Сè уште без трендови"
          message="Додај прва дискусија и стартувај разговор."
          action={{ label: 'Нова дискусија', to: '/new' }}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          🔥 Најактивните дискусии од последните 7 дена
        </p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            background: 'none',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '4px 10px',
            color: 'var(--color-muted)',
            cursor: 'pointer',
            fontSize: 15,
            lineHeight: 1,
            transition: 'color 0.15s, border-color 0.15s',
            opacity: refreshing ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-ink-dim)';
            e.currentTarget.style.borderColor = 'var(--color-border-strong)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-muted)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
          aria-label="Освежи"
        >
          <span className={refreshing ? 'inline-block animate-spin' : 'inline-block'}>↻</span>
        </button>
      </div>

      {/* Ranked list */}
      <div className="space-y-3">
        {threads.map((thread, index) => (
          <div key={thread.id} className="flex items-stretch gap-3">
            {/* Editorial rank gutter */}
            <div
              style={{
                width: 22,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-end',
                paddingTop: 17,
              }}
            >
              <span
                className="font-mono"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: index === 0 ? 'var(--color-accent)' : 'var(--color-muted-dimmer)',
                }}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
            {/* Card */}
            <div className="flex-1 min-w-0">
              <PostCard
                thread={thread}
                index={index}
                initiallyVoted={votedSet.has(`thread_${thread.id}`)}
                initiallySaved={savedSet.has(thread.id)}
                initialUserReaction={reactionsMap.get(`thread_${thread.id}`) ?? null}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <Card className="text-center" style={{ padding: '20px 24px' }}>
        <h3 className="font-display font-semibold mb-2" style={{ fontSize: 15, color: 'var(--color-ink)' }}>
          Сакаш повеќе?
        </h3>
        <p className="mb-4" style={{ fontSize: 13, color: 'var(--color-muted)' }}>
          Овие се топ 5 за оваа недела. За сите дискусии, погледни ги другите табови.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => onSwitchTab('new')}>
            Сите нови
          </Button>
          <Button variant="secondary" onClick={() => onSwitchTab('popular')}>
            Популарни
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, userProfile } = useAuth();
  const navigate = useNavigate();
  const [sort, setSort] = useState('new');

  const { threads, loading, loadingMore, hasMore, error, loadMore } = usePaginatedThreads({
    sortBy: sort,
  });

  const {
    threads: trendingThreads,
    loading: trendingLoading,
    refresh: refreshTrending,
  } = useTrending();

  const [votedSet, setVotedSet] = useState(new Set());
  const [savedSet, setSavedSet] = useState(new Set());
  const [reactionsMap, setReactionsMap] = useState(new Map());
  const fetchedIds = useRef(new Set());

  useEffect(() => {
    if (sort === 'trending') return;
    if (!isAuthenticated || !userProfile || threads.length === 0) return;
    const newThreads = threads.filter((t) => !fetchedIds.current.has(t.id));
    if (newThreads.length === 0) return;
    const targets = newThreads.map((t) => ({ targetType: 'thread', targetId: t.id }));
    const threadIds = newThreads.map((t) => t.id);
    Promise.all([
      getUserUpvotesForTargets(userProfile.id, targets),
      getUserSavedBatch(userProfile.id, threadIds),
      getUserReactionsForTargets(userProfile.id, targets),
    ])
      .then(([newVoted, newSaved, newReactions]) => {
        newThreads.forEach((t) => fetchedIds.current.add(t.id));
        if (newVoted.size > 0) setVotedSet((prev) => new Set([...prev, ...newVoted]));
        if (newSaved.size > 0) setSavedSet((prev) => new Set([...prev, ...newSaved]));
        if (newReactions.size > 0)
          setReactionsMap((prev) => new Map([...prev, ...newReactions]));
      })
      .catch(() => {});
  }, [threads, isAuthenticated, userProfile, sort]);

  return (
    <div className="space-y-5">
      {/* ── Brand block ── */}
      <div className="flex items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3.5 min-w-0">
          <img src="/logo.png" alt="Средношколски Глас" className="w-12 h-12 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="font-display font-semibold text-[18px] text-ink leading-tight">
              Средношколски Глас
            </p>
            <p className="text-[13px] truncate" style={{ color: 'var(--color-ink-dim)' }}>
              Платформа за дискусии на средношколците во Македонија
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          className="shrink-0 hidden sm:inline-flex gap-2 text-[13px]"
          onClick={() => navigate(isAuthenticated ? '/new' : '/login')}
          leftIcon={
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
          }
        >
          {isAuthenticated ? 'Нова дискусија' : 'Најави се'}
        </Button>
      </div>

      <div aria-hidden style={{ height: 1, background: 'var(--color-surface-hover)' }} />

      {/* ── Sort controls ── */}
      <div className="overflow-x-auto no-scrollbar">
        <Tabs
          value={sort}
          onValueChange={setSort}
          options={SORT_OPTIONS.map(({ key, label }) => ({ value: key, label }))}
        />
      </div>

      {/* ── School leaderboard widget — visible on browsing tabs only ── */}
      {(sort === 'new' || sort === 'popular') && <SchoolLeaderboardWidget />}

      {/* ── Feed ── */}
      {sort === 'trending' ? (
        <TrendingSection
          threads={trendingThreads}
          loading={trendingLoading}
          refresh={refreshTrending}
          onSwitchTab={setSort}
          isAuthenticated={isAuthenticated}
          userProfile={userProfile}
        />
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-[13.5px]" style={{ color: 'var(--color-coral)' }}>
            {error}
          </p>
        </Card>
      ) : loading ? (
        <FeedSkeleton count={5} />
      ) : threads.length === 0 ? (
        <EmptyFeed
          sort={sort}
          isAuthenticated={isAuthenticated}
          onResetSort={() => setSort('new')}
        />
      ) : (
        <>
          <div className="space-y-2">
            {threads.map((thread, i) => (
              <PostCard
                key={thread.id}
                thread={thread}
                index={i}
                initiallyVoted={votedSet.has(`thread_${thread.id}`)}
                initiallySaved={savedSet.has(thread.id)}
                initialUserReaction={reactionsMap.get(`thread_${thread.id}`) ?? null}
              />
            ))}
          </div>
          {hasMore && <LoadMoreBtn onClick={loadMore} loading={loadingMore} />}
        </>
      )}
    </div>
  );
}
