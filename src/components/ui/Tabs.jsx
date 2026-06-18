import clsx from 'clsx';

const SIZE_BTN = {
  sm: 'text-xs  px-2.5 py-1    rounded-[8px] gap-1.5',
  md: 'text-[13px] px-3 py-1.5 rounded-[9px] gap-2',
};

export default function Tabs({ value, onValueChange, options = [], size = 'md', className }) {
  return (
    <div
      role="tablist"
      className={clsx('inline-flex items-center gap-0.5 p-[3px]', 'rounded-xl', className)}
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onValueChange?.(opt.value)}
            className={clsx(
              'relative inline-flex items-center font-medium select-none',
              'transition-all duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
              'outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
              SIZE_BTN[size],
            )}
            style={
              active
                ? { background: 'var(--color-surface-2)', color: 'var(--color-ink)', boxShadow: 'var(--shadow-card)' }
                : { color: 'var(--color-muted)' }
            }
            onMouseEnter={(e) => {
              if (e.currentTarget.getAttribute('aria-selected') !== 'true') {
                e.currentTarget.style.color = 'var(--color-ink-dim)';
                e.currentTarget.style.background = 'var(--color-surface-2)';
              }
            }}
            onMouseLeave={(e) => {
              if (e.currentTarget.getAttribute('aria-selected') !== 'true') {
                e.currentTarget.style.color = 'var(--color-muted)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {opt.label}
            {opt.badge != null && (
              <span
                className={clsx(
                  'inline-flex items-center justify-center min-w-[16px] h-4 px-1',
                  'rounded-full text-[9px] font-bold leading-none',
                )}
                style={
                  active
                    ? { background: 'var(--color-accent)', color: '#fff' }
                    : { background: 'var(--color-surface-2)', color: 'var(--color-muted)' }
                }
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
