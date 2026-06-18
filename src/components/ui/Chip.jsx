import clsx from 'clsx';

const VARIANT = {
  default: 'bg-surface-2 text-ink-dim border border-border',
  iris: 'bg-[var(--color-accent-soft)] text-[var(--color-accent-bright)] border border-[var(--color-accent-border)]',
  cyan: 'bg-[rgba(34,211,238,0.1)] text-[#22D3EE] border border-[rgba(34,211,238,0.2)]',
  coral: 'bg-coral-soft text-coral border border-[rgba(248,113,113,0.2)]',
  sun: 'bg-amber-soft text-amber border border-amber-border',
  mint: 'bg-[rgba(94,234,212,0.1)] text-[#5EEAD4] border border-[rgba(94,234,212,0.2)]',
  outline: 'bg-transparent text-ink-dim border border-border-strong',
};

const SIZE = {
  xs: 'px-1.5 h-4   text-[10px] gap-1   rounded-md',
  sm: 'px-2   py-px text-[11px] gap-1   rounded-lg',
  md: 'px-3   py-1  text-xs     gap-1.5 rounded-xl',
};

export default function Chip({
  variant = 'default',
  size = 'sm',
  leftIcon,
  onRemove,
  className,
  children,
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-semibold tracking-[0.02em] select-none',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
    >
      {leftIcon && <span className="shrink-0 leading-none">{leftIcon}</span>}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 ml-0.5 -mr-0.5 leading-none opacity-50 hover:opacity-100 transition-opacity duration-150"
          aria-label="Remove"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
            <path d="M7.07 2.93a.5.5 0 0 0-.707 0L5 4.293 3.637 2.929A.5.5 0 1 0 2.93 3.636L4.293 5 2.929 6.364a.5.5 0 1 0 .707.707L5 5.707l1.364 1.364a.5.5 0 1 0 .707-.707L5.707 5l1.364-1.364a.5.5 0 0 0 0-.707Z" />
          </svg>
        </button>
      )}
    </span>
  );
}
