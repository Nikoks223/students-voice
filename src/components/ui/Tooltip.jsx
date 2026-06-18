import { useState, useRef } from 'react';
import * as Popover from '@radix-ui/react-popover';
import clsx from 'clsx';

export default function Tooltip({ content, children, side = 'top', delayMs = 300, className }) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);

  const handleOpen = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(true), delayMs);
  };

  const handleClose = () => {
    clearTimeout(timerRef.current);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <span
          className="inline-flex items-center"
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
          onFocus={handleOpen}
          onBlur={handleClose}
        >
          {children}
        </span>
      </Popover.Trigger>

      {open && (
        <Popover.Portal>
          <Popover.Content
            side={side}
            sideOffset={6}
            avoidCollisions
            className={clsx(
              'z-50 max-w-[220px] px-2.5 py-1.5',
              'bg-surface-2 border border-border rounded-lg',
              'text-xs text-ink-dim leading-snug',
              'shadow-[var(--shadow-pop)]',
              'select-none animate-fade-up',
              className,
            )}
            onMouseEnter={() => clearTimeout(timerRef.current)}
            onMouseLeave={handleClose}
          >
            {content}
            <Popover.Arrow width={8} height={4} className="fill-surface-2" />
          </Popover.Content>
        </Popover.Portal>
      )}
    </Popover.Root>
  );
}
