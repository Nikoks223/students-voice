import { forwardRef, useId } from 'react';
import clsx from 'clsx';

const Input = forwardRef(function Input(
  { label, error, hint, leftIcon, rightIcon, className, ...rest },
  ref,
) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-[13px] font-medium text-ink-dim leading-none">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 flex items-center text-muted">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={id}
          className={clsx(
            'input',
            leftIcon && 'pl-9',
            rightIcon && 'pr-9',
            error && [
              '!border-coral/50',
              'focus:!border-coral/70',
              'focus:!shadow-[0_0_0_3px_rgba(248,113,113,0.12)]',
            ],
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          {...rest}
        />

        {rightIcon && (
          <span className="pointer-events-none absolute right-3 flex items-center text-muted">
            {rightIcon}
          </span>
        )}
      </div>

      {error && (
        <p id={errorId} className="text-[12px] text-coral leading-snug" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={hintId} className="text-[12px] text-muted leading-snug">
          {hint}
        </p>
      )}
    </div>
  );
});

export default Input;
