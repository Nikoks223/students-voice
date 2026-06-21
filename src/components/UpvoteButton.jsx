import { useUpvote } from '../hooks/useUpvote';

export default function UpvoteButton({
  targetType,
  targetId,
  threadId,
  forumId,
  initialCount,
  initiallyVoted,
  size = 'sm',
}) {
  const { count, voted, pending, toggle } = useUpvote({
    targetType,
    targetId,
    threadId,
    forumId,
    initialCount,
    initiallyVoted,
  });

  const isMd = size === 'md';

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      disabled={pending}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMd ? '8px' : '6px',
        padding: isMd ? '6px 14px' : '4px 8px',
        borderRadius: isMd ? '10px' : '8px',
        fontSize: isMd ? '13px' : '11.5px',
        fontWeight: 500,
        fontFamily: 'inherit',
        cursor: pending ? 'not-allowed' : 'pointer',
        opacity: pending ? 0.7 : 1,
        background: voted ? 'rgba(124,92,255,0.1)' : isMd ? 'var(--color-surface-2)' : 'transparent',
        border: `1px solid ${
          voted ? 'rgba(124,92,255,0.3)' : isMd ? 'var(--color-border)' : 'transparent'
        }`,
        color: voted ? 'var(--color-accent)' : 'var(--color-muted)',
        boxShadow: voted
          ? isMd
            ? '0 0 16px rgba(124,92,255,0.14), inset 0 1px 0 rgba(124,92,255,0.15)'
            : 'none'
          : isMd
            ? '0 1px 3px rgba(0,0,0,0.08)'
            : 'none',
        transform: voted ? 'scale(1.03)' : 'scale(1)',
        transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
      }}
      onMouseEnter={(e) => {
        if (!voted && !pending) {
          e.currentTarget.style.color = 'var(--color-ink-dim)';
          if (isMd) e.currentTarget.style.background = 'var(--color-surface-3)';
        }
      }}
      onMouseLeave={(e) => {
        if (!voted && !pending) {
          e.currentTarget.style.color = 'var(--color-muted)';
          e.currentTarget.style.background = isMd ? 'var(--color-surface-2)' : 'transparent';
        }
      }}
    >
      <svg
        style={{
          width: isMd ? 14 : 12,
          height: isMd ? 14 : 12,
          flexShrink: 0,
          transition: 'transform 0.22s cubic-bezier(0.16,1,0.3,1)',
          transform: voted ? 'translateY(-0.5px)' : 'translateY(0)',
        }}
        fill={voted ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
      <span style={{ fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
    </button>
  );
}
