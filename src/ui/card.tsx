import * as React from 'react';
import { cn } from './cn';

type Variant = 'flat' | 'raised' | 'interactive';

const VARIANT: Record<Variant, string> = {
  flat: 'surface',
  raised: 'surface-raised',
  interactive:
    'surface transition-[box-shadow,background-color] duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:shadow-hairline-strong hover:bg-panel-raised',
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  /** Adds the standard inner spacing. */
  padded?: boolean;
}

export function Card({ variant = 'flat', padded, className, children, ...props }: CardProps) {
  return (
    <div className={cn('rounded-sm', VARIANT[variant], padded && 'p-5 sm:p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-5 py-4 sm:px-6',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-fg">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-fg-dim">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
