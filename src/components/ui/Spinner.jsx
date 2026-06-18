import { forwardRef } from 'react';
import clsx from 'clsx';

const SIZE_PX = { xs: 12, sm: 14, md: 18, lg: 24 };

const Spinner = forwardRef(function Spinner({ size = 'md', className }, ref) {
  const px = SIZE_PX[size];
  return (
    <svg
      ref={ref}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={clsx('animate-spin shrink-0', className)}
      style={{ color: 'currentColor' }}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.2"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
});

export default Spinner;
