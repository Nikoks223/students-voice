import { forwardRef } from 'react';
import clsx from 'clsx';

const VARIANT = {
  default: clsx(
    'bg-surface border border-border rounded-2xl',
    'shadow-[var(--shadow-card)]',
  ),
  hover: clsx(
    'bg-surface border border-border rounded-2xl',
    'shadow-[var(--shadow-card)]',
    'transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform',
    'hover:bg-[var(--color-surface-hover)] hover:border-border-strong',
    'hover:shadow-[var(--shadow-card-hover)]',
    'hover:-translate-y-px',
  ),
  elevated: clsx(
    'bg-surface border border-border-strong rounded-2xl',
    'shadow-[var(--shadow-pop)]',
  ),
  glass: clsx(
    'bg-[var(--glass-bg)] border border-border-strong rounded-2xl',
    'backdrop-blur-xl',
    'shadow-[var(--shadow-glass)]',
  ),
};

const Card = forwardRef(function Card({ variant = 'default', className, children, ...rest }, ref) {
  return (
    <div ref={ref} className={clsx(VARIANT[variant], className)} {...rest}>
      {children}
    </div>
  );
});

export default Card;
