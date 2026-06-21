import { forwardRef } from 'react';
import clsx from 'clsx';
import Spinner from './Spinner';

// Height + gap + text size per size tier. Padding handled below since link skips it.
const SIZE_BASE = {
  sm: 'h-7  text-xs  gap-1.5 rounded-lg',
  md: 'h-9  text-sm  gap-2   rounded-[8px]',
  lg: 'h-11 text-[15px] gap-2.5 rounded-[9px]',
  icon: 'h-9  w-9     rounded-[8px]',
};

const SIZE_PADDING = {
  sm: 'px-3',
  md: 'px-4',
  lg: 'px-5',
  icon: '',
};

const VARIANT = {
  primary: clsx(
    'bg-accent-deep text-white font-medium',
    'border border-accent-border',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]',
    'hover:bg-accent hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_2px_10px_rgba(0,0,0,0.35)]',
    'active:scale-[0.97]',
  ),
  secondary: clsx(
    'bg-surface text-ink font-medium',
    'border border-border',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    'hover:bg-surface-2 hover:border-border-strong',
    'active:scale-[0.98]',
  ),
  ghost: clsx(
    'bg-transparent text-muted font-medium',
    'hover:text-ink hover:bg-surface',
    'active:scale-[0.98]',
  ),
  destructive: clsx(
    'bg-coral-soft text-coral font-medium',
    'border border-[var(--color-coral-border)]',
    'hover:bg-[var(--color-coral-soft)] hover:border-[var(--color-coral-border-strong)]',
    'active:scale-[0.98]',
  ),
  link: clsx(
    'bg-transparent text-accent-bright font-medium',
    'underline underline-offset-2 decoration-accent-bright/40',
    'hover:decoration-accent-bright',
    'h-auto px-0',
  ),
};

const Button = forwardRef(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const isLink = variant === 'link';

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={clsx(
        'relative inline-flex items-center justify-center select-none outline-none',
        'transition-all duration-[200ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
        'focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-bg',
        SIZE_BASE[size],
        !isLink && SIZE_PADDING[size],
        VARIANT[variant],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className,
      )}
      {...rest}
    >
      {/* Keep original children invisible while loading to hold width stable */}
      <span className={clsx('inline-flex items-center gap-[inherit]', loading && 'invisible')}>
        {leftIcon && <span className="shrink-0 leading-none">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="shrink-0 leading-none">{rightIcon}</span>}
      </span>

      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size={size === 'lg' ? 'md' : 'sm'} />
        </span>
      )}
    </button>
  );
});

export default Button;
