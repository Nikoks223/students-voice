import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { isSaved, toggleSavedPost } from '../lib/firestore/savedPosts';

function BookmarkIcon({ filled, size }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  );
}

export default function SaveButton({ thread, size = 'md' }) {
  const { isAuthenticated, userProfile } = useAuth();
  const requireAuth = useRequireAuth();
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const bounceTimer = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !userProfile || !thread?.id) return;
    isSaved(userProfile.id, thread.id)
      .then(setSaved)
      .catch(() => {});
  }, [isAuthenticated, userProfile, thread?.id]);

  useEffect(() => () => clearTimeout(bounceTimer.current), []);

  const iconSize = size === 'sm' ? 15 : 18;
  const isSm = size === 'sm';

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    requireAuth(async () => {
      if (pending || !userProfile) return;
      const wasSaved = saved; // state before toggle
      const next = !wasSaved;
      setSaved(next);
      if (next) {
        setBouncing(true);
        clearTimeout(bounceTimer.current);
        bounceTimer.current = setTimeout(() => setBouncing(false), 280);
      }
      setPending(true);
      try {
        await toggleSavedPost({ userId: userProfile.id, thread, currentlySaved: wasSaved });
      } catch {
        setSaved(wasSaved); // revert on error
      } finally {
        setPending(false);
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      title={saved ? 'Веќе е зачувано' : 'Зачувај'}
      aria-label={saved ? 'Отстрани од зачувани' : 'Зачувај дискусија'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isSm ? 4 : 6,
        padding: isSm ? '3px 7px' : '6px 12px',
        borderRadius: isSm ? 7 : 10,
        border: `1px solid ${saved ? 'rgba(124,92,255,0.22)' : 'var(--color-border)'}`,
        background: saved ? 'rgba(124,92,255,0.08)' : 'transparent',
        color: saved ? 'var(--color-accent)' : 'var(--color-muted)',
        cursor: pending ? 'wait' : 'pointer',
        transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
        transform: bouncing ? 'scale(1.18)' : 'scale(1)',
        fontSize: 12.5,
        fontWeight: 500,
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!saved) {
          e.currentTarget.style.borderColor = 'var(--color-border-strong)';
          e.currentTarget.style.color = 'var(--color-ink-dim)';
        }
      }}
      onMouseLeave={(e) => {
        if (!saved) {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.color = 'var(--color-muted)';
        }
      }}
    >
      <BookmarkIcon filled={saved} size={iconSize} />
      {!isSm && <span style={{ lineHeight: 1 }}>{saved ? 'Зачувано' : 'Зачувај'}</span>}
    </button>
  );
}
