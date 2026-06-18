import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePaginatedThreads } from '../hooks/usePaginatedThreads';
import { fetchForumById } from '../lib/firestore/forums';
import { getUserUpvotesForTargets } from '../lib/firestore/upvotes';
import { getUserReactionsForTargets } from '../lib/firestore/reactions';
import { getUserSavedBatch } from '../lib/firestore/savedPosts';
import { followForum, unfollowForum, isFollowingForum } from '../lib/firestore/follows';
import PostCard from '../components/PostCard';
import { FeedSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Tabs from '../components/ui/Tabs';

const SORT_OPTIONS = [
  { key: 'trending', label: 'Трендинг' },
  { key: 'popular', label: 'Популарни' },
  { key: 'new', label: 'Нови' },
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

function EmptyForum({ forumName, forumId }) {
  return (
    <Card>
      <EmptyState
        icon="✨"
        title="Овој форум сè уште е тивок"
        message={`Биди прв што ќе постави дискусија во ${forumName ?? 'овој форум'}.`}
        action={{ label: 'Започни дискусија', to: forumId ? `/new?forum=${forumId}` : '/new' }}
      />
    </Card>
  );
}

function ForumHeaderSkeleton() {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-start gap-4">
        <div className="shimmer w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="shimmer h-5 w-40 rounded" />
          <div className="shimmer h-3 w-64 rounded" />
          <div className="shimmer h-2.5 w-24 rounded mt-1" />
        </div>
      </div>
    </div>
  );
}

export default function Forum() {
  const { forumId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, userProfile } = useAuth();
  const [sort, setSort] = useState('trending');
  const [forum, setForum] = useState(null);
  const [forumLoading, setForumLoading] = useState(true);

  const { threads, loading, loadingMore, hasMore, error, loadMore } = usePaginatedThreads({
    sortBy: sort,
    forumId,
  });

  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

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

  useEffect(() => {
    setForumLoading(true);
    fetchForumById(forumId)
      .then((f) => setForum(f))
      .catch(() => setForum(null))
      .finally(() => setForumLoading(false));
  }, [forumId]);

  useEffect(() => {
    if (!userProfile || !forumId) return;
    isFollowingForum(userProfile.id, forumId)
      .then(setFollowing)
      .catch(() => {});
  }, [userProfile, forumId]);

  const handleToggleFollow = async () => {
    if (!userProfile) return;
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowForum(userProfile.id, forumId);
        setFollowing(false);
      } else {
        await followForum(userProfile.id, forumId);
        setFollowing(true);
      }
    } catch { /* intentional */ }
    setFollowLoading(false);
  };

  if (!forumLoading && !forum) {
    return (
      <Card>
        <EmptyState
          icon="🔍"
          title="Форумот не постои"
          message="Можеби линкот е стар, или форумот е преименуван и избришан. Не се грижи — има уште многу активни форуми."
          action={{ label: 'Назад на почетна', to: '/' }}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Forum header ── */}
      {forumLoading ? (
        <ForumHeaderSkeleton />
      ) : (
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 65% 80% at 115% 50%, ${forum.color}1A, transparent)`,
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${forum.color} 30%, ${forum.color} 70%, transparent)`,
              opacity: 0.65,
            }}
          />
          <div className="relative px-4 sm:px-6 py-4 sm:py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-display font-bold text-[13px] sm:text-[15px] text-white shrink-0"
                  style={{
                    background: forum.color,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.4)',
                  }}
                >
                  {forum.name.charAt(0)}
                </div>
                <div>
                  <h1 className="font-display font-bold text-[21px] text-ink tracking-tight leading-tight">
                    {forum.name}
                  </h1>
                  <p className="text-ink-dim text-[13px] mt-0.5 leading-relaxed max-w-full sm:max-w-[480px]">
                    {forum.description}
                  </p>
                  <div className="flex items-center gap-2.5 mt-2">
                    <span className="text-[12px] text-muted font-mono tabular-nums">
                      {forum.threadCount ?? threads.length} дискусии
                    </span>
                    <span
                      className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full"
                      style={{
                        background: 'var(--color-surface-2)',
                        color: 'var(--color-muted-dim)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {forum.type === 'school' ? 'Училиште' : 'Тема'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                {isAuthenticated && userProfile && (
                  <Button
                    variant="secondary"
                    loading={followLoading}
                    disabled={followLoading}
                    onClick={handleToggleFollow}
                    className="flex items-center gap-1.5"
                    style={{
                      fontSize: 13,
                      ...(following
                        ? {
                            borderColor: `${forum.color}50`,
                            color: forum.color,
                            background: `${forum.color}12`,
                          }
                        : {}),
                    }}
                    leftIcon={
                      following ? (
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      ) : (
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                          />
                        </svg>
                      )
                    }
                  >
                    {following ? 'Следиш' : 'Следи'}
                  </Button>
                )}
                <Button
                  variant="primary"
                  className="gap-2"
                  onClick={() => navigate(forumId ? `/new?forum=${forumId}` : '/new')}
                  leftIcon={
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  }
                >
                  Нова дискусија
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sort controls ── */}
      <div className="overflow-x-auto no-scrollbar">
        <Tabs
          value={sort}
          onValueChange={setSort}
          options={SORT_OPTIONS.map(({ key, label }) => ({ value: key, label }))}
        />
      </div>

      {/* ── Thread list ── */}
      {error ? (
        <Card className="p-8 text-center">
          <p className="text-[13.5px]" style={{ color: 'var(--color-coral)' }}>
            {error}
          </p>
        </Card>
      ) : loading ? (
        <FeedSkeleton count={4} />
      ) : threads.length === 0 ? (
        <EmptyForum forumName={forum?.name} forumId={forumId} />
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
