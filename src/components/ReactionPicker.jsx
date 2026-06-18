import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { REACTIONS } from '../lib/reactions';
import { setReaction } from '../lib/firestore/reactions';

function SmileIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5c.5 1.5 1.8 2.5 3.5 2.5s3-1 3.5-2.5" />
      <circle cx="9" cy="10" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PlusIcon({ size = 11 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/**
 * Reaction picker for threads and comments.
 *
 * Props:
 *   targetType        'thread' | 'comment'
 *   targetId          the thread id or comment id
 *   threadId          parent thread id (same as targetId for threads)
 *   reactionCounts    map object { thumbs: 2, fire: 1, ... } — may be undefined for new docs
 *   initialUserReaction  string | null | undefined  (undefined = not yet loaded)
 *   size              'sm' | 'md'
 */
export default function ReactionPicker({
  targetType,
  targetId,
  threadId,
  reactionCounts,
  initialUserReaction,
  size = 'sm',
}) {
  const { userProfile } = useAuth();
  const requireAuth = useRequireAuth();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [userReaction, setUserReaction] = useState(null);
  const [counts, setCounts] = useState(() => reactionCounts ?? {});
  const [loading, setLoading] = useState(false);

  const loadedRef = useRef(false);
  const autoCloseRef = useRef(null);
  const containerRef = useRef(null);

  // One-time sync when the parent's reactions map loads (initialUserReaction transitions
  // from undefined to null/string after getUserReactionsForTargets completes).
  useEffect(() => {
    if (initialUserReaction !== undefined && !loadedRef.current) {
      loadedRef.current = true;
      setUserReaction(initialUserReaction ?? null);
    }
  }, [initialUserReaction]);

  const scheduleAutoClose = useCallback(() => {
    clearTimeout(autoCloseRef.current);
    autoCloseRef.current = setTimeout(() => setPickerOpen(false), 3000);
  }, []);

  useEffect(() => {
    if (pickerOpen) scheduleAutoClose();
    return () => clearTimeout(autoCloseRef.current);
  }, [pickerOpen, scheduleAutoClose]);

  // Close on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  const handleReact = (reactionId) => {
    requireAuth(async () => {
      if (loading || !userProfile?.id) return;

      const prevReaction = userReaction;
      const prevCounts = { ...counts };

      // Optimistic update
      const next = { ...counts };
      if (prevReaction === reactionId) {
        next[reactionId] = Math.max(0, (next[reactionId] || 0) - 1);
        setUserReaction(null);
      } else {
        if (prevReaction) {
          next[prevReaction] = Math.max(0, (next[prevReaction] || 0) - 1);
        }
        next[reactionId] = (next[reactionId] || 0) + 1;
        setUserReaction(reactionId);
      }
      setCounts(next);
      setPickerOpen(false);

      setLoading(true);
      try {
        await setReaction({ userId: userProfile.id, targetType, targetId, threadId, reactionId });
      } catch {
        setUserReaction(prevReaction);
        setCounts(prevCounts);
      } finally {
        setLoading(false);
      }
    });
  };

  const totalCount = Object.values(counts).reduce((s, v) => s + Math.max(0, v || 0), 0);
  const activePills = REACTIONS.filter((r) => (counts[r.id] || 0) > 0);

  const pillPad = size === 'sm' ? '2px 8px' : '3px 10px';
  const pillFs = size === 'sm' ? 11 : 12;
  const emojiFs = size === 'sm' ? 13 : 15;
  const btnSize = size === 'sm' ? 24 : 28;
  const pickerBtnSize = size === 'sm' ? 34 : 38;
  const pickerEmojiFz = size === 'sm' ? 19 : 22;

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}
    >
        {activePills.map((r) => (
          <button
            key={r.id}
            onClick={() => handleReact(r.id)}
            title={r.label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: pillPad,
              borderRadius: 999,
              fontSize: pillFs,
              fontFamily: 'inherit',
              background:
                userReaction === r.id ? 'rgba(124,92,255,0.08)' : 'var(--color-surface-hover)',
              border: `1px solid ${userReaction === r.id ? 'rgba(124,92,255,0.22)' : 'var(--color-border)'}`,
              color: userReaction === r.id ? 'var(--color-accent-bright)' : 'var(--color-muted)',
              cursor: 'pointer',
              transform: userReaction === r.id ? 'scale(1.04)' : 'scale(1)',
              transition: 'all 0.15s cubic-bezier(0.23,1,0.32,1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                userReaction === r.id ? 'rgba(124,92,255,0.12)' : 'var(--color-border)';
              e.currentTarget.style.color = userReaction === r.id ? 'var(--color-accent-bright)' : 'var(--color-ink-dim)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                userReaction === r.id ? 'rgba(124,92,255,0.08)' : 'var(--color-surface-hover)';
              e.currentTarget.style.color = userReaction === r.id ? 'var(--color-accent-bright)' : 'var(--color-muted)';
            }}
          >
            <span style={{ fontSize: emojiFs, lineHeight: 1 }}>{r.emoji}</span>
            <span style={{ fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>
              {Math.max(0, counts[r.id] || 0)}
            </span>
          </button>
        ))}

        {/* Trigger */}
        {totalCount === 0 ? (
          <button
            onClick={() => requireAuth(() => setPickerOpen((v) => !v))}
            title="Реагирај"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: size === 'sm' ? '3px 8px' : '4px 10px',
              borderRadius: 8,
              fontSize: size === 'sm' ? 11.5 : 12.5,
              fontFamily: 'inherit',
              color: pickerOpen ? 'var(--color-muted)' : 'var(--color-muted-dimmer)',
              background: pickerOpen ? 'var(--color-surface-hover)' : 'transparent',
              border: `1px solid ${pickerOpen ? 'var(--color-border)' : 'transparent'}`,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-muted)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.background = 'var(--color-surface-hover)';
            }}
            onMouseLeave={(e) => {
              if (!pickerOpen) {
                e.currentTarget.style.color = 'var(--color-muted-dimmer)';
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <SmileIcon size={size === 'sm' ? 13 : 15} />
            Реагирај
          </button>
        ) : (
          <button
            onClick={() => requireAuth(() => setPickerOpen((v) => !v))}
            title="Реагирај"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: btnSize,
              height: btnSize,
              borderRadius: 8,
              color: pickerOpen ? 'var(--color-ink-dim)' : 'var(--color-muted-dim)',
              background: pickerOpen ? 'var(--color-border)' : 'transparent',
              border: `1px solid ${pickerOpen ? 'var(--color-border)' : 'transparent'}`,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-ink-dim)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.background = 'var(--color-surface-hover)';
            }}
            onMouseLeave={(e) => {
              if (!pickerOpen) {
                e.currentTarget.style.color = 'var(--color-muted-dim)';
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <PlusIcon size={size === 'sm' ? 11 : 13} />
          </button>
        )}

      {/* ── Picker: inline next to trigger ── */}
      {pickerOpen && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '6px 8px',
            background: 'var(--color-surface-hover)',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 14,
            boxShadow: '0 8px 28px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
            animation: 'fadeUp 0.15s cubic-bezier(0.23,1,0.32,1) both',
          }}
        >
          {REACTIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => handleReact(r.id)}
              title={r.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: pickerBtnSize,
                height: pickerBtnSize,
                borderRadius: 10,
                fontSize: pickerEmojiFz,
                lineHeight: 1,
                fontFamily: 'inherit',
                background:
                  userReaction === r.id ? 'rgba(124,92,255,0.1)' : 'var(--color-surface-hover)',
                border: `1px solid ${userReaction === r.id ? 'rgba(124,92,255,0.25)' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 0.12s cubic-bezier(0.23,1,0.32,1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  userReaction === r.id ? 'rgba(124,92,255,0.16)' : 'var(--color-border)';
                e.currentTarget.style.transform = 'scale(1.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  userReaction === r.id ? 'rgba(124,92,255,0.1)' : 'var(--color-surface-hover)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
