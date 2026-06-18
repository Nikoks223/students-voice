import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { useNotifications } from '../hooks/useNotifications';
import { timeAgo } from '../utils/timeAgo';
import Button from './ui/Button';
import Chip from './ui/Chip';

function SearchIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function ChevronDown({ open }) {
  return (
    <svg
      className="w-3 h-3 text-muted hidden md:block"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      style={{
        transition: 'transform 0.2s cubic-bezier(0.16,1,0.3,1)',
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
      }}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function WriteIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function BookmarkNavIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"
      />
    </svg>
  );
}

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
          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>„{n.forumName}"</span> е одобрен
        </>
      );
    case 'forum_comment':
      return (
        <>
          <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>@{n.fromUsername}</span> коментира во
          форумот <span style={{ color: 'var(--color-ink-dim)' }}>{n.forumName}</span>
          {n.threadTitle ? (
            <>
              {' '}
              · <span style={{ color: 'var(--color-muted)' }}>{n.threadTitle}</span>
            </>
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
          <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>@{n.actorUsername}</span> почна да те
          следи
        </>
      );
    case 'new_thread':
      return (
        <>
          <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>@{n.actorUsername}</span> објави нова
          дискусија <span style={{ color: 'var(--color-ink-dim)' }}>„{n.threadTitle}"</span>
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
  if (type === 'mention') return <span style={{ fontSize: 13, color: 'var(--color-accent-bright)' }}>@</span>;
  if (type === 'suggestion_accepted')
    return (
      <svg
        style={{ width: 12, height: 12, color: 'var(--color-success)' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    );
  if (type === 'thread_comment')
    return (
      <svg
        style={{ width: 12, height: 12, color: 'var(--color-accent-bright)' }}
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
    );
  if (type === 'new_follower')
    return (
      <svg
        style={{ width: 12, height: 12, color: 'var(--color-accent-bright)' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
        />
      </svg>
    );
  if (type === 'new_thread')
    return (
      <svg
        style={{ width: 12, height: 12, color: 'var(--color-accent-bright)' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    );
  if (type === 'upvote')
    return (
      <svg
        style={{ width: 12, height: 12, color: 'var(--color-accent)' }}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M5 15l7-7 7 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  return (
    <svg
      style={{ width: 12, height: 12, color: 'var(--color-accent)' }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function notifLink(n) {
  if (n.type === 'suggestion_accepted' && n.forumId) return `/p/${n.forumId}`;
  if (n.type === 'new_follower' && n.actorUsername) return `/u/${n.actorUsername.toLowerCase()}`;
  if (n.threadId && n.forumId) return `/p/${n.forumId}/${n.threadId}`;
  return null;
}

function NotificationPanel({ notifications, loading, onMarkRead, onMarkAllRead, onClose }) {
  const navigate = useNavigate();
  const [allReadFlash, setAllReadFlash] = useState(false);
  const flashTimer = useRef(null);

  const handleClick = (n) => {
    if (!n.read) onMarkRead(n.id);
    const link = notifLink(n);
    if (link) {
      navigate(link);
      onClose();
    }
  };

  const hasUnread = notifications.some((n) => !n.read);

  const handleMarkAll = useCallback(() => {
    if (!hasUnread) return;
    onMarkAllRead();
    setAllReadFlash(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setAllReadFlash(false), 2000);
  }, [hasUnread, onMarkAllRead]);

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 'calc(100% + 8px)',
        width: 340,
        maxHeight: 480,
        borderRadius: 18,
        background: 'var(--dropdown-bg)',
        border: '1px solid var(--color-border-strong)',
        boxShadow: 'var(--dropdown-shadow)',
        animation: 'fadeUp 0.2s cubic-bezier(0.16,1,0.3,1) both',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 50,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px 10px',
          borderBottom: '1px solid var(--notif-header-divider)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)' }}>Известувања</span>
        {allReadFlash ? (
          <span style={{ fontSize: 11, color: 'var(--color-success)', transition: 'opacity 0.3s' }}>
            Сите означени ✓
          </span>
        ) : (
          <button
            onClick={handleMarkAll}
            disabled={!hasUnread}
            style={{
              fontSize: 11,
              color: hasUnread ? 'var(--color-muted-dim)' : 'var(--color-muted-dimmer)',
              background: 'none',
              border: 'none',
              cursor: hasUnread ? 'pointer' : 'not-allowed',
              padding: '2px 0',
            }}
            onMouseEnter={(e) => {
              if (hasUnread) e.currentTarget.style.color = 'var(--color-ink-dim)';
            }}
            onMouseLeave={(e) => {
              if (hasUnread) e.currentTarget.style.color = 'var(--color-muted-dim)';
            }}
          >
            Означи сите прочитани
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: '8px 0' }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 16px' }}
              >
                <div
                  className="shimmer"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="shimmer" style={{ height: 10, width: '75%', borderRadius: 5 }} />
                  <div className="shimmer" style={{ height: 9, width: '45%', borderRadius: 5 }} />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center' }}>
            <svg
              style={{ width: 22, height: 22, color: 'var(--color-muted-dimmer)', margin: '0 auto 8px' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
            <p style={{ fontSize: 13, color: 'var(--color-muted-dim)', margin: 0 }}>Нема нови известувања</p>
          </div>
        ) : (
          notifications.map((n) => {
            const ts = n.createdAt?.toDate?.() ?? n.createdAt;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '11px 16px',
                  cursor: notifLink(n) ? 'pointer' : 'default',
                  background: n.read ? 'transparent' : 'var(--notif-unread-row-bg)',
                  borderBottom: '1px solid var(--notif-row-divider)',
                  transition: 'background 0.15s',
                  width: '100%',
                  border: 0,
                  font: 'inherit',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (notifLink(n)) e.currentTarget.style.background = 'var(--notif-hover-row-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = n.read
                    ? 'transparent'
                    : 'var(--notif-unread-row-bg)';
                }}
              >
                {/* Icon circle */}
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    flexShrink: 0,
                    marginTop: 1,
                    background: 'var(--notif-icon-bg)',
                    border: '1px solid var(--notif-icon-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {notifIcon(n.type)}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12.5, color: 'var(--color-ink-dim)', margin: 0, lineHeight: 1.5 }}>
                    {notifText(n)}
                  </p>
                  {ts && (
                    <span style={{ fontSize: 10.5, color: 'var(--color-muted-dimmer)', fontFamily: 'monospace' }}>
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
                      marginTop: 6,
                    }}
                  />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function BellButton({ unreadCount, onClick }) {
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={onClick}
      aria-label="Известувања"
      className="relative shrink-0"
    >
      <svg style={{ width: 17, height: 17 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {unreadCount > 0 && (
        <Chip
          variant="coral"
          size="xs"
          className="absolute top-0.5 right-0.5 pointer-events-none"
          style={{ boxShadow: '0 0 0 2px var(--color-bg)', fontFamily: 'monospace' }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Chip>
      )}
    </Button>
  );
}

export default function Header({ onMenuToggle }) {
  const navigate = useNavigate();
  const { isAuthenticated, userProfile, signOut, isAdmin } = useAuth();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const menuRef = useRef(null);

  const {
    unreadCount,
    notifications,
    loading: notifLoading,
    open: notifOpen,
    handleOpen: openNotif,
    handleClose: closeNotif,
    handleMarkRead,
    handleMarkAllRead,
  } = useNotifications();

  const toggleNotif = () => (notifOpen ? closeNotif() : openNotif());

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== '/') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable)
        return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        closeNotif();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeNotif]);

  useEffect(() => {
    if (!notifOpen) return;
    const onMouseDown = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        closeNotif();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [notifOpen, closeNotif]);

  useEffect(() => {
    if (!menuOpen) return;
    const onMouseDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [menuOpen]);

  return (
    <header
      className="sticky top-0 z-40 border-b border-border"
      style={{
        background: 'var(--header-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: 'var(--header-inset-shadow)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-[56px] flex items-center gap-4">
        {/* ── Left: hamburger on mobile, brand on desktop ── */}
        <div className="shrink-0 lg:w-48 flex items-center">
          {/* Hamburger — mobile/tablet only */}
          <Button
            size="icon"
            variant="ghost"
            onClick={onMenuToggle}
            aria-label="Отвори мени"
            className="lg:hidden"
          >
            <svg
              className="w-[18px] h-[18px]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </Button>

          {/* Brand — desktop only */}
          <Link to="/" className="hidden lg:flex items-center gap-2 group">
            <img
              src="/logo.png"
              alt="Средношколски Глас"
              className="h-8 w-auto shrink-0"
              style={{ transition: 'opacity 0.2s' }}
            />
            <span
              className="font-display font-bold text-[15px] leading-none whitespace-nowrap"
              style={{ color: 'var(--color-ink)', letterSpacing: '-0.02em', transition: 'color 0.2s' }}
            >
              Средношколски Глас
            </span>
          </Link>
        </div>

        {/* ── Search (truly centered) ── */}
        <div className="flex-1 flex justify-center">
          <form onSubmit={handleSearch} className="w-full max-w-[360px]">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                <SearchIcon />
              </span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Пребарај дискусии..."
                className="input pl-9 pr-12 h-[34px] text-[13px]"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded"
                  style={{ color: 'var(--color-muted-dim)', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-ink-dim)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted-dim)')}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : (
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-surface-2 border border-border rounded px-1.5 py-0.5 text-[10px] text-muted font-mono pointer-events-none select-none">
                  /
                </kbd>
              )}
            </div>
          </form>
        </div>

        {/* ── Right: theme toggle + auth ── */}
        <div className="shrink-0 lg:w-48 flex justify-end items-center gap-2">
          {isAuthenticated && userProfile ? (
            <>
              {/* Bell */}
              <div ref={notifRef} style={{ position: 'relative' }}>
                <BellButton unreadCount={unreadCount} onClick={toggleNotif} />
                {notifOpen && (
                  <NotificationPanel
                    notifications={notifications}
                    loading={notifLoading}
                    onMarkRead={handleMarkRead}
                    onMarkAllRead={handleMarkAllRead}
                    onClose={closeNotif}
                  />
                )}
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg hover:bg-surface transition-all duration-200"
                >
                  <Avatar
                    username={userProfile.username}
                    avatarUrl={userProfile.avatarUrl}
                    size="sm"
                    eager
                  />
                  <span className="text-[13px] font-medium hidden md:block max-w-[86px] truncate" style={{ color: 'var(--color-ink)' }}>
                    {userProfile.username}
                  </span>
                  <ChevronDown open={menuOpen} />
                </button>

                {menuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-56 rounded-2xl p-1.5 z-50"
                    style={{
                      background: 'var(--dropdown-bg)',
                      border: '1px solid var(--color-border-strong)',
                      boxShadow: 'var(--dropdown-shadow)',
                      animation: 'fadeUp 0.25s cubic-bezier(0.16,1,0.3,1) both',
                    }}
                  >
                    <div
                      className="px-3 py-2.5 mb-1"
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                    >
                      <p className="font-display font-semibold text-[13px]" style={{ color: 'var(--color-ink)' }}>
                        {userProfile.username}
                      </p>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--color-muted)' }}>
                        {userProfile.email}
                      </p>
                    </div>

                    <Link
                      to={`/u/${userProfile.username?.toLowerCase()}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 mt-1 rounded-xl text-[13px] transition-colors"
                      style={{ color: 'var(--color-ink-dim)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-ink)'; e.currentTarget.style.background = 'var(--color-surface-2)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-ink-dim)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <ProfileIcon />
                      Профил
                    </Link>

                    <Link
                      to="/new"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-colors"
                      style={{ color: 'var(--color-ink-dim)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-ink)'; e.currentTarget.style.background = 'var(--color-surface-2)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-ink-dim)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <WriteIcon />
                      Нова дискусија
                    </Link>

                    <Link
                      to="/saved"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-colors"
                      style={{ color: 'var(--color-ink-dim)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-ink)'; e.currentTarget.style.background = 'var(--color-surface-2)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-ink-dim)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <BookmarkNavIcon />
                      Зачувани
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-accent font-semibold hover:bg-accent-soft transition-colors"
                      >
                        <ShieldIcon />
                        Админ панел
                      </Link>
                    )}

                    <div
                      className="mt-1 pt-1"
                      style={{ borderTop: '1px solid var(--color-border)' }}
                    >
                      <Link
                        to="/settings"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-colors"
                        style={{ color: 'var(--color-ink-dim)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-ink)'; e.currentTarget.style.background = 'var(--color-surface-2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-ink-dim)'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <SettingsIcon />
                        Поставки
                      </Link>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          signOut();
                        }}
                        className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-coral hover:bg-surface-2 transition-colors"
                      >
                        <LogoutIcon />
                        Одјави се
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Button variant="primary" onClick={() => navigate('/login')}>
              Најави се
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
