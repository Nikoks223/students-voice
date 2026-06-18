import clsx from 'clsx';

const VARIANT = {
  text: 'rounded-md h-3',
  rect: 'rounded-xl',
  circle: 'rounded-full',
};

export default function Skeleton({ className, variant = 'rect' }) {
  return <div className={clsx('shimmer', VARIANT[variant], className)} aria-hidden="true" />;
}
