import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchSavedPosts, toggleSavedPost } from '../lib/firestore/savedPosts';
import { timeAgo } from '../utils/timeAgo';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

function BookmarkIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

function SavedRow({ post, onRemove }) {
  const navigate = useNavigate();
  const threadUrl = `/p/${post.forumId}/${post.threadId}`;
  const [removing, setRemoving] = useState(false);

  const handleRemove = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (removing) return;
    setRemoving(true);
    try {
      await onRemove(post);
    } finally {
      setRemoving(false);
    }
  };

  const savedTs = post.savedAt?.toDate?.() ?? null;

  return (
    <div
      role="button"
      tabIndex={0}
      className="group relative overflow-hidden"
      onClick={() => navigate(threadUrl)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(threadUrl); } }}
      style={{
        cursor: 'pointer',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: '14px 18px',
        boxShadow: 'var(--shadow-card)',
        transition:
          'background 0.18s cubic-bezier(0.23,1,0.32,1), border-color 0.18s cubic-bezier(0.23,1,0.32,1), transform 0.18s cubic-bezier(0.23,1,0.32,1)',
        animation: 'fadeUp 0.3s cubic-bezier(0.23,1,0.32,1) both',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-surface-hover)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--color-surface)';
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <Link to={threadUrl} className="absolute inset-0 z-0" aria-hidden="true" tabIndex={-1} />

      <div className="relative" style={{ zIndex: 10 }}>
        {/* Forum + saved-time row */}
        <div className="flex items-center justify-between gap-3 mb-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="shrink-0 inline-flex items-center gap-[5px] font-bold uppercase"
              style={{
                background: `${post.forumColor}18`,
                border: `1px solid ${post.forumColor}30`,
                borderRadius: 6,
                padding: '2px 8px 2px 6px',
                fontSize: 10,
                letterSpacing: '0.08em',
                color: post.forumColor,
                maxWidth: 140,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: post.forumColor,
                  flexShrink: 0,
                  display: 'inline-block',
                }}
              />
              {post.forumName}
            </span>
          </div>
          {savedTs && (
            <span className="shrink-0 font-mono" style={{ fontSize: 10.5, color: 'var(--color-muted-dimmer)' }}>
              Зачувано {timeAgo(savedTs)}
            </span>
          )}
        </div>

        {/* Title */}
        <p
          className="font-display font-bold leading-snug tracking-tight line-clamp-2 mb-3"
          style={{ fontSize: 15, color: 'var(--color-ink)' }}
        >
          {post.threadTitle}
        </p>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}
        >
          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
            {post.authorUsername && post.authorUsername !== '[избришан корисник]' ? (
              post.authorUsername
            ) : (
              <span style={{ fontStyle: 'italic', color: 'var(--color-muted-dim)' }}>{post.authorUsername}</span>
            )}
          </span>

          <button
            onClick={handleRemove}
            disabled={removing}
            className="relative z-20 flex items-center gap-1.5 font-medium"
            style={{
              fontSize: 11.5,
              color: 'var(--color-muted-dim)',
              background: 'none',
              border: '1px solid transparent',
              borderRadius: 7,
              padding: '3px 8px',
              cursor: removing ? 'wait' : 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-coral)';
              e.currentTarget.style.borderColor = 'rgba(248,113,113,0.2)';
              e.currentTarget.style.background = 'rgba(248,113,113,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-muted-dim)';
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.background = 'none';
            }}
          >
            {removing ? (
              <span
                className="w-3 h-3 rounded-full border-2 animate-spin"
                style={{ borderColor: 'rgba(248,113,113,0.25)', borderTopColor: 'var(--color-coral)' }}
              />
            ) : (
              <TrashIcon />
            )}
            Отстрани
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Saved() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (append = false) => {
      if (!userProfile) return;
      if (!append) {
        setLoading(true);
        setError(null);
      } else setLoadingMore(true);

      try {
        const result = await fetchSavedPosts(userProfile.id, {
          pageSize: 20,
          lastDoc: append ? lastDoc : null,
        });
        setPosts((prev) => (append ? [...prev, ...result.posts] : result.posts));
        setLastDoc(result.lastDoc);
        setHasMore(result.hasMore);
      } catch (err) {
        setError(err.message ?? 'Грешка при вчитување.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [userProfile, lastDoc],
  );

  useEffect(() => {
    load(false);
  }, [userProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRemove = useCallback(
    async (post) => {
      if (!userProfile) return;
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      try {
        await toggleSavedPost({
          userId: userProfile.id,
          currentlySaved: true,
          thread: {
            id: post.threadId,
            title: post.threadTitle,
            forumId: post.forumId,
            forumName: post.forumName,
            forumIcon: post.forumIcon,
            forumColor: post.forumColor,
            authorUsername: post.authorUsername,
          },
        });
      } catch {
        // Revert on error
        setPosts((prev) =>
          [...prev, post].sort((a, b) => {
            const ta = a.savedAt?.seconds ?? 0;
            const tb = b.savedAt?.seconds ?? 0;
            return tb - ta;
          }),
        );
      }
    },
    [userProfile],
  );

  return (
    <div className="space-y-5">
      {/* ── Editorial masthead ── */}
      <div className="flex items-end justify-between gap-6 pb-1">
        <div className="flex items-center gap-3.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(124,92,255,0.1)',
              border: '1px solid rgba(124,92,255,0.18)',
              color: 'var(--color-accent)',
            }}
          >
            <BookmarkIcon size={18} />
          </div>
          <div>
            <p
              className="text-[9px] font-bold uppercase tracking-[0.18em] mb-0.5"
              style={{ color: 'var(--color-muted-dimmer)' }}
            >
              Мојот профил
            </p>
            <h1 className="font-display font-bold text-[22px] text-ink tracking-tight leading-none">
              Зачувани
            </h1>
          </div>
        </div>
      </div>

      <div aria-hidden style={{ height: 1, background: 'var(--color-surface-hover)' }} />

      {/* ── Content ── */}
      {error ? (
        <Card className="p-8 text-center">
          <p className="text-[13.5px]" style={{ color: 'var(--color-coral)' }}>
            {error}
          </p>
        </Card>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                padding: '14px 18px',
                height: 100,
              }}
            >
              <div className="shimmer h-3 w-24 rounded mb-3" />
              <div className="shimmer h-4 w-3/4 rounded mb-2" />
              <div className="shimmer h-4 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="text-center" style={{ padding: '48px 32px' }}>
          <div
            className="mx-auto mb-5 flex items-center justify-center"
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'rgba(124,92,255,0.06)',
              border: '1px solid rgba(124,92,255,0.12)',
              color: 'var(--color-muted-dimmer)',
            }}
          >
            <BookmarkIcon size={22} />
          </div>
          <h2
            className="font-display font-semibold mb-2"
            style={{ fontSize: 16, color: 'var(--color-ink)' }}
          >
            Сè уште немаш зачувано ништо
          </h2>
          <p className="mb-5 mx-auto" style={{ fontSize: 13, color: 'var(--color-muted)', maxWidth: 280 }}>
            Кликни на ознаката за зачувување на некоја дискусија за да ја сочуваш за подоцна.
          </p>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Прегледај дискусии
          </Button>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {posts.map((post) => (
              <SavedRow key={post.id} post={post} onRemove={handleRemove} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                loading={loadingMore}
                disabled={loadingMore}
                onClick={() => load(true)}
                className="min-w-[140px] justify-center"
              >
                {loadingMore ? 'Вчитување…' : 'Вчитај повеќе'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
