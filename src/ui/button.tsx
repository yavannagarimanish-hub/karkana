import Link from 'next/link';
import * as React from 'react';
import { cn } from './cn';

type Variant = 'solid' | 'ember' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  /** Renders a Next `Link` instead of a `<button>`. */
  href?: string;
}

const VARIANT: Record<Variant, string> = {
  solid:
    'bg-fg text-void hover:bg-ember hover:text-fg active:bg-ember-press disabled:hover:bg-fg disabled:hover:text-void',
  ember:
    'bg-ember text-fg hover:bg-ember-hover active:bg-ember-press shadow-[0_0_0_1px_rgba(255,255,255,0.08)]',
  outline:
    'bg-transparent text-fg shadow-hairline-strong hover:shadow-[inset_0_0_0_1px_var(--color-ember)] hover:text-ember',
  ghost: 'bg-transparent text-fg-muted hover:bg-panel-raised hover:text-fg',
  danger:
    'bg-transparent text-status-danger shadow-[inset_0_0_0_1px_var(--color-status-danger)] hover:bg-status-danger hover:text-fg',
};

const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3 text-[11px]',
  md: 'h-11 px-5 text-xs',
  lg: 'h-13 px-7 text-sm',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'solid', size = 'md', block, className, href, type, disabled, ...props },
  ref,
) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-sm font-mono font-semibold uppercase tracking-[0.14em]',
    'transition-[background-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(.16,1,.3,1)]',
    'disabled:cursor-not-allowed disabled:opacity-40',
    'active:translate-y-px',
    VARIANT[variant],
    SIZE[size],
    block && 'w-full',
    className,
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {props.children}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      type={href ? 'button' : (type ?? 'button')}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={cn(classes, disabled && href && 'pointer-events-none')}
      {...props}
    />
  );
});
