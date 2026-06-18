import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchRecentComments } from '../lib/firestore/recent';
import { fetchThreadById } from '../lib/firestore/threads';
import { toggleUpvote, getUserUpvotesForTargets } from '../lib/firestore/upvotes';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { CommentCardSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Avatar from '../components/Avatar';
import { timeAgo } from '../utils/timeAgo';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ReportModal from '../components/ReportModal';

function renderBody(text) {
  return text.split(/(@\w+)/g).map((part, i) =>
    /^@\w+$/.test(part) ? (
      <Link
        key={i}
        to={`/u/${part.slice(1).toLowerCase()}`}
        className="font-medium hover:underline"
        style={{ color: 'var(--color-accent)', textDecoration: 'none' }}
      >
        {part}
      </Link>
    ) : (
      part
    ),
  );
}

function CommentCard({ comment, thread, initiallyVoted, onReport }) {
  const requireAuth = useRequireAuth();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const cardRef = useRef(null);

  const [upvoteCount, setUpvoteCount] = useState(comment.upvoteCount ?? 0);
  const [voted, setVoted] = useState(false);
  const [upvotePending, setUpvotePending] = useState(false);

  useEffect(() => {
    if (initiallyVoted !== undefined) setVoted(initiallyVoted);
  }, [initiallyVoted]);

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

  const createdAt = comment.createdAt?.toDate?.() ?? comment.createdAt;

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="rounded-2xl p-4"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(280px circle at var(--mx, -999px) var(--my, -999px), rgba(255,255,255,0.025), transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div className="relative">
        {/* Author row */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <Avatar username={comment.authorUsername} avatarUrl={null} size="sm" />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
            {comment.authorUsername === '[избришан корисник]' ? (
              <span className="text-[13px] italic" style={{ color: 'var(--color-muted-dim)' }}>
                {comment.authorUsername}
              </span>
            ) : (
              <Link
                to={`/u/${comment.authorUsername?.toLowerCase()}`}
                className="text-[13px] font-semibold transition-colors"
                style={{ textDecoration: 'none', color: 'var(--color-ink)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-ink)')}
              >
                {comment.authorUsername}
              </Link>
            )}
            {comment.isEdited && (
              <span className="text-[10px]" style={{ color: 'var(--color-muted-dim)' }}>
                (уредено)
              </span>
            )}
            <span className="text-[11px] font-mono" style={{ color: 'var(--color-muted-dim)' }}>
              {timeAgo(createdAt)}
            </span>
          </div>
        </div>

        {/* Thread context */}
        {thread && (
          <Link
            to={`/p/${thread.forumId}/${thread.id}`}
            className="flex items-center gap-1.5 mb-2.5 w-fit group"
            style={{ textDecoration: 'none' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: thread.forumColor }}
            />
            <span
              className="text-[10.5px] font-semibold uppercase tracking-[0.06em] shrink-0"
              style={{ color: thread.forumColor }}
            >
              {thread.forumName}
            </span>
            <span style={{ color: 'var(--color-muted-dimmer)', fontSize: 10 }}>·</span>
            <span
              className="text-[11.5px] truncate max-w-[140px] sm:max-w-[220px]"
              style={{ color: 'var(--color-muted)', transition: 'color 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-ink-dim)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted)')}
            >
              {thread.title}
            </span>
          </Link>
        )}

        {/* Body preview */}
        <p
          className="text-[13px] leading-relaxed mb-3"
          style={{
            color: 'var(--color-ink-dim)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {renderBody(comment.body)}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() =>
              requireAuth(async () => {
                if (upvotePending || !userProfile) return;
                setUpvotePending(true);
                const wasVoted = voted;
                setVoted(!wasVoted);
                setUpvoteCount((c) => (wasVoted ? c - 1 : c + 1));
                try {
                  const result = await toggleUpvote({
                    userId: userProfile.id,
                    targetType: 'comment',
                    targetId: comment.id,
                    threadId: comment.threadId,
                    actorUsername: userProfile.username,
                    forumId: thread?.forumId ?? null,
                  });
                  setVoted(result.voted);
                } catch {
                  setVoted(wasVoted);
                  setUpvoteCount((c) => (wasVoted ? c + 1 : c - 1));
                } finally {
                  setUpvotePending(false);
                }
              })
            }
            disabled={upvotePending}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11.5px] font-medium"
            style={{
              color: voted ? 'var(--color-accent)' : 'var(--color-muted)',
              transition: 'color 0.18s',
              opacity: upvotePending ? 0.7 : 1,
            }}
            onMouseEnter={(e) => { if (!voted) e.currentTarget.style.color = 'var(--color-ink-dim)'; }}
            onMouseLeave={(e) => { if (!voted) e.currentTarget.style.color = 'var(--color-muted)'; }}
          >
            <svg className="w-3 h-3" fill={voted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
            <span className="font-mono tabular-nums">{upvoteCount}</span>
          </button>

          {thread ? (
            <Link
              to={`/p/${thread.forumId}/${comment.threadId}#comment-${comment.id}`}
              className="px-2 py-1.5 rounded-lg text-[11.5px] font-medium"
              style={{ color: 'var(--color-muted)', transition: 'color 0.18s', textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-ink-dim)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted)')}
            >
              Одговори
            </Link>
          ) : (
            <button
              className="px-2 py-1.5 rounded-lg text-[11.5px] font-medium"
              style={{ color: 'var(--color-muted)', transition: 'color 0.18s' }}
              onClick={() => navigate(`/p/${comment.forumId ?? ''}/${comment.threadId}#comment-${comment.id}`)}
            >
              Одговори
            </button>
          )}

          {thread && (
            <Link
              to={`/p/${thread.forumId}/${thread.id}`}
              className="px-2 py-1.5 rounded-lg text-[11.5px]"
              style={{ color: 'var(--color-muted-dim)', transition: 'color 0.18s', textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-muted)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted-dim)')}
            >
              Прикажи нишка
            </Link>
          )}

          <button
            onClick={() =>
              requireAuth(() =>
                onReport({
                  targetType: 'comment',
                  targetId: comment.id,
                  threadId: comment.threadId,
                }),
              )
            }
            className="ml-auto px-2 py-1.5 rounded-lg text-[11px]"
            style={{ color: 'var(--color-muted-dimmer)', transition: 'color 0.18s' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-muted)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted-dimmer)')}
          >
            Пријави
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecentComments() {
  const { userProfile, isAuthenticated } = useAuth();
  const [comments, setComments] = useState([]);
  const [threadMap, setThreadMap] = useState({});
  const [reportTarget, setReportTarget] = useState(null);
  const [votedSet, setVotedSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const lastDocRef = useRef(null);

  const enrichThreads = useCallback(async (newComments, existingMap) => {
    const needed = [...new Set(newComments.map((c) => c.threadId))].filter(
      (id) => id && !existingMap[id],
    );
    if (needed.length === 0) return existingMap;
    const fetched = await Promise.all(needed.map((id) => fetchThreadById(id).catch(() => null)));
    const additions = Object.fromEntries(fetched.filter(Boolean).map((t) => [t.id, t]));
    return { ...existingMap, ...additions };
  }, []);

  const loadPage = useCallback(
    async ({ append = false } = {}) => {
      if (!append) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const result = await fetchRecentComments({ lastDoc: append ? lastDocRef.current : null });
        lastDocRef.current = result.lastDoc;

        const newMap = await enrichThreads(result.comments, append ? threadMap : {});
        setThreadMap(newMap);
        setComments((prev) => (append ? [...prev, ...result.comments] : result.comments));
        setHasMore(result.hasMore);
      } catch (err) {
        setError(err.message ?? 'Грешка при вчитување.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [enrichThreads, threadMap],
  );

  useEffect(() => {
    lastDocRef.current = null;
    loadPage({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !userProfile || comments.length === 0) {
      setVotedSet(new Set());
      return;
    }
    const targets = comments.map((c) => ({ targetType: 'comment', targetId: c.id }));
    getUserUpvotesForTargets(userProfile.id, targets)
      .then(setVotedSet)
      .catch(() => setVotedSet(new Set()));
  }, [isAuthenticated, userProfile, comments]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    loadPage({ append: true });
  };

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
                d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
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
            <h1 className="font-display font-bold text-[22px] tracking-tight leading-none" style={{ color: 'var(--color-ink)' }}>
              Скорешни коментари
            </h1>
          </div>
        </div>
        {!loading && (
          <span className="font-mono text-[11px]" style={{ color: 'var(--color-muted-dim)' }}>
            {comments.length} коментари
          </span>
        )}
      </div>

      <div aria-hidden style={{ height: 1, background: 'var(--color-surface-hover)' }} />

      {/* ── Feed ── */}
      {error ? (
        <Card className="p-8 text-center">
          <p className="text-[13.5px]" style={{ color: 'var(--color-coral)' }}>
            {error}
          </p>
        </Card>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <CommentCardSkeleton key={i} />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <Card>
          <EmptyState
            icon="💬"
            title="Сè уште нема коментари"
            message="Платформата е тивка. Биди прв и остави коментар во некоја дискусија."
            action={{ label: 'Прегледај дискусии', to: '/' }}
          />
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {comments.map((c) => (
              <CommentCard
                key={c.id}
                comment={c}
                thread={threadMap[c.threadId]}
                initiallyVoted={votedSet?.has(`comment_${c.id}`)}
                onReport={setReportTarget}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                loading={loadingMore}
                disabled={loadingMore}
                onClick={loadMore}
                className="min-w-[140px] justify-center"
              >
                {loadingMore ? 'Вчитување…' : 'Вчитај повеќе'}
              </Button>
            </div>
          )}
        </>
      )}

      {reportTarget && (
        <ReportModal
          targetType={reportTarget.targetType}
          targetId={reportTarget.targetId}
          threadId={reportTarget.threadId}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}
