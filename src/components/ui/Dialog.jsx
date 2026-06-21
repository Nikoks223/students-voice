import { forwardRef } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import clsx from 'clsx';

// ── Root ─────────────────────────────────────────────────────────────────────

export function Dialog({ open, onOpenChange, defaultOpen = false, children, ...props }) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange} defaultOpen={defaultOpen} {...props}>
      {children}
    </RadixDialog.Root>
  );
}

// ── Trigger / Close ───────────────────────────────────────────────────────────

export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

// ── Content ───────────────────────────────────────────────────────────────────
// forceMount keeps Portal+Content in DOM so Radix manages focus return after
// close. AnimatePresence inside handles the visual enter/exit.

export const DialogContent = forwardRef(function DialogContent(
  { children, className, ...props },
  ref,
) {
  return (
    <RadixDialog.Portal forceMount>
      <RadixDialog.Overlay
        forceMount
        className={clsx(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm',
          'transition-opacity duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'data-[state=open]:opacity-100 data-[state=closed]:opacity-0 data-[state=closed]:pointer-events-none',
        )}
      />
      <RadixDialog.Content
        ref={ref}
        forceMount
        className={clsx(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 outline-none',
          'bg-surface border border-border-strong rounded-2xl shadow-[var(--shadow-pop)] overscroll-contain',
          'transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'data-[state=open]:opacity-100 data-[state=open]:scale-100',
          'data-[state=closed]:opacity-0 data-[state=closed]:scale-[0.96] data-[state=closed]:pointer-events-none',
          className,
        )}
        {...props}
      >
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
});

// ── Composition helpers ───────────────────────────────────────────────────────

export function DialogHeader({ className, children, ...props }) {
  return (
    <div
      className={clsx('flex flex-col gap-1 px-6 pt-5 pb-4 border-b border-border', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export const DialogTitle = forwardRef(function DialogTitle({ className, children, ...props }, ref) {
  return (
    <RadixDialog.Title
      ref={ref}
      className={clsx(
        'font-display font-semibold text-[17px] text-ink tracking-[-0.02em] leading-snug',
        className,
      )}
      {...props}
    >
      {children}
    </RadixDialog.Title>
  );
});

export const DialogDescription = forwardRef(function DialogDescription(
  { className, children, ...props },
  ref,
) {
  return (
    <RadixDialog.Description
      ref={ref}
      className={clsx('text-[13px] text-muted leading-relaxed', className)}
      {...props}
    >
      {children}
    </RadixDialog.Description>
  );
});

export function DialogFooter({ className, children, ...props }) {
  return (
    <div
      className={clsx(
        'flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
