import * as React from 'react';
import { cn } from './cn';

const CONTROL =
  'w-full rounded-sm bg-panel px-3 py-2.5 text-sm text-fg placeholder:text-fg-ghost ' +
  'shadow-hairline-strong transition-shadow duration-150 ' +
  'focus:shadow-[inset_0_0_0_1px_var(--color-ember),0_0_0_3px_rgba(255,0,51,0.15)] focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(CONTROL, className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(CONTROL, 'min-h-24 resize-y', className)} {...props} />;
});

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(CONTROL, 'appearance-none pr-9', className)} {...props}>
        {children}
      </select>
    );
  },
);

export interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + hint/error. Every form control in the app is wrapped in this. */
export function Field({ label, htmlFor, hint, error, required, className, children }: FieldProps) {
  const describedBy = error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="label block">
        {label}
        {required && (
          <span aria-hidden className="ml-1 text-ember">
            *
          </span>
        )}
      </label>

      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id: htmlFor,
            'aria-describedby': describedBy,
            'aria-invalid': error ? true : undefined,
          })
        : children}

      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-status-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-fg-dim">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
