import { forwardRef, createContext, useContext, useState } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';

// ── Internal open-state bridge ────────────────────────────────────────────────
// Radix Dialog manages a11y/focus. We track open separately so AnimatePresence
// (which lives inside the portal) can drive enter/exit animations correctly.
const OpenCtx = createContext(false);

// ── Root ─────────────────────────────────────────────────────────────────────

export function Dialog({ open: openProp, onOpenChange, defaultOpen = false, children, ...props }) {
  const [local, setLocal] = useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : local;

  return (
    <OpenCtx.Provider value={open}>
      <RadixDialog.Root
        open={open}
        onOpenChange={(v) => {
          if (!isControlled) setLocal(v);
          onOpenChange?.(v);
        }}
        {...props}
      >
        {children}
      </RadixDialog.Root>
    </OpenCtx.Provider>
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
  const open = useContext(OpenCtx);

  return (
    <RadixDialog.Portal forceMount>
      {/* Overlay — CSS transition driven by Radix data-state */}
      <RadixDialog.Overlay
        forceMount
        className={clsx(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm',
          'transition-opacity duration-[200ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
          'data-[state=open]:opacity-100 data-[state=closed]:opacity-0',
          'data-[state=closed]:pointer-events-none',
        )}
      />

      {/* Shell — Radix manages focus trap & aria. Animation lives inside. */}
      <RadixDialog.Content
        ref={ref}
        forceMount
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 outline-none"
        {...props}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              key="dialog-inner"
              className={clsx(
                'bg-surface border border-border-strong rounded-2xl',
                'shadow-[var(--shadow-pop)] overscroll-contain',
                className,
              )}
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
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
