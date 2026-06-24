import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchNotificationsPage,
  markAsRead,
  markAllAsRead,
} from '../lib/firestore/notifications';
import { timeAgo } from '../utils/timeAgo';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/EmptyState';

// ── Helpers (mirrors Header.jsx) ──────────────────────────────────────────────

function notifText(n) {
  switch (n.type) {
    case 'mention':
      return (
        <>
          <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>@{n.fromUsername}</span> те спомна во{' '}
          <span style={{ color: 'var(--color-ink-dim)' }}>{n.threadTitle || n.forumName}</span>
        </>
      );
    case 'suggestion_accepted':
      return (
        <>
          Твојот предлог за форумот{' '}
          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>„{n.forumName}“</span> е одобрен
        </>
      );
    case 'forum_comment':
      return (
        <>
          <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>@{n.fromUsername}</span> коментира во
          форумот <span style={{ color: 'var(--color-ink-dim)' }}>{n.forumName}</span>
          {n.threadTitle ? (
            <> · <span style={{ color: 'var(--color-muted)' }}>{n.threadTitle}</span></>
          ) : null}
        </>
      );
    case 'thread_comment':
      return (
        <>
          <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>@{n.fromUsername}</span> коментира во
          темата <span style={{ color: 'var(--color-ink-dim)' }}>{n.threadTitle || n.forumName}</span>
        </>
      );
    case 'new_follower':
      return (
        <>
          <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>@{n.actorUsername}</span> почна да те следи
        </>
      );
    case 'new_thread':
      return (
        <>
          <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>@{n.actorUsername}</span> објави нова
          дискусија <span style={{ color: 'var(--color-ink-dim)' }}>„{n.threadTitle}“</span>
        </>
      );
    case 'upvote':
      return (
        <>
          <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>@{n.actorUsername}</span>{' '}
          {n.targetType === 'comment' ? 'го одобри твојот коментар' : 'го одобри твојот пост'}
        </>
      );
    default:
      return 'Ново известување';
  }
}

function notifIcon(type) {
  if (type === 'mention')
    return <span style={{ fontSize: 13, color: 'var(--color-accent-bright)' }}>@</span>;
  if (type === 'suggestion_accepted')
    return (
      <svg style={{ width: 13, height: 13, color: 'var(--color-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    );
  if (type === 'thread_comment' || type === 'forum_comment')
    return (
      <svg style={{ width: 13, height: 13, color: 'var(--color-accent-bright)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    );
  if (type === 'new_follower')
    return (
      <svg style={{ width: 13, height: 13, color: 'var(--color-accent-bright)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    );
  if (type === 'new_thread')
    return (
      <svg style={{ width: 13, height: 13, color: 'var(--color-accent-bright)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  if (type === 'upvote')
    return (
      <svg style={{ width: 13, height: 13, color: 'var(--color-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  return (
    <svg style={{ width: 13, height: 13, color: 'var(--color-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function notifLink(n) {
  if (n.type === 'suggestion_accepted' && n.forumId) return `/p/${n.forumId}`;
  if (n.type === 'new_follower' && n.actorUsername) return `/u/${n.actorUsername.toLowerCase()}`;
  if (n.threadId && n.forumId) return `/p/${n.forumId}/${n.threadId}`;
  return null;
}

// ── Notification row ──────────────────────────────────────────────────────────

function NotificationRow({ notification: n, onMarkRead }) {
  const navigate = useNavigate();
  const ts = n.createdAt?.toDate?.() ?? n.createdAt;
  const link = notifLink(n);

  const handleClick = () => {
    if (!n.read) onMarkRead(n.id);
    if (link) navigate(link);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full flex items-start gap-3 px-5 py-4 text-left"
      style={{
        background: n.read ? 'transparent' : 'rgba(124,92,255,0.04)',
        borderBottom: '1px solid var(--color-border)',
        cursor: link ? 'pointer' : 'default',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        if (link) e.currentTarget.style.background = 'var(--color-surface-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(124,92,255,0.04)';
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          flexShrink: 0,
          marginTop: 1,
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {notifIcon(n.type)}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, color: 'var(--color-ink-dim)', margin: 0, lineHeight: 1.55 }}>
          {notifText(n)}
        </p>
        {ts && (
          <span style={{ fontSize: 11, color: 'var(--color-muted-dimmer)', fontFamily: 'monospace' }}>
            {timeAgo(ts)}
          </span>
        )}
      </div>

      {/* Unread dot */}
      {!n.read && (
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--color-accent)',
            flexShrink: 0,
            marginTop: 7,
          }}
        />
      )}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Notifications() {
  const { firebaseUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const lastDocRef = useRef(null);
  const markedAllRef = useRef(false);

  const loadPage = useCallback(
    async ({ append = false } = {}) => {
      if (!firebaseUser) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const result = await fetchNotificationsPage(firebaseUser.uid, {
          lastDoc: append ? lastDocRef.current : null,
        });
        lastDocRef.current = result.lastDoc;
        setNotifications((prev) => (append ? [...prev, ...result.notifications] : result.notifications));
        setHasMore(result.hasMore);
      } catch (err) {
        setError(err.message ?? 'Грешка при вчитување.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [firebaseUser],
  );

  useEffect(() => {
    lastDocRef.current = null;
    loadPage({ append: false });
  }, [loadPage]);

  // Mark all as read on first load
  useEffect(() => {
    if (!firebaseUser || markedAllRef.current) return;
    markedAllRef.current = true;
    markAllAsRead(firebaseUser.uid).catch(() => {});
  }, [firebaseUser]);

  const handleMarkRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await markAsRead(id).catch(() => {});
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
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
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
            <h1
              className="font-display font-bold text-[22px] tracking-tight leading-none"
              style={{ color: 'var(--color-ink)' }}
            >
              Известувања
            </h1>
          </div>
        </div>
        {!loading && notifications.length > 0 && (
          <span className="font-mono text-[11px]" style={{ color: 'var(--color-muted-dim)' }}>
            {notifications.length} известувања
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
        <Card className="overflow-hidden divide-y divide-[var(--color-border)]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-4">
              <div className="shimmer w-[30px] h-[30px] rounded-full shrink-0" />
              <div className="flex-1 space-y-2 pt-0.5">
                <div className="shimmer h-3 rounded w-3/4" />
                <div className="shimmer h-2.5 rounded w-1/3" />
              </div>
            </div>
          ))}
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <EmptyState
            icon="🔔"
            title="Нема известувања"
            message="Кога некој ќе те спомне, коментира или те следи, ќе видиш известување тука."
          />
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            {notifications.map((n) => (
              <NotificationRow key={n.id} notification={n} onMarkRead={handleMarkRead} />
            ))}
          </Card>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                loading={loadingMore}
                disabled={loadingMore}
                onClick={() => loadPage({ append: true })}
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
