import Link from 'next/link';
import { cn } from './cn';

export interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
  /**
   * Heading level for the title. Defaults to `h3` for states nested inside a
   * page that already has its own `h1`; pass `h1` when this is the page's only
   * heading, so the document always has exactly one top-level heading.
   */
  as?: 'h1' | 'h2' | 'h3';
}

export function EmptyState({
  title,
  message,
  actionLabel,
  actionHref,
  className,
  as: Tag = 'h3',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'surface flex flex-col items-center justify-center px-8 py-20 text-center sm:py-28',
        className,
      )}
    >
      <span aria-hidden className="mb-6 block h-px w-12 bg-ember" />
      <Tag className="font-mono text-sm font-bold uppercase tracking-[0.16em] text-fg sm:text-base">
        {title}
      </Tag>
      {message && <p className="mt-3 max-w-md text-sm text-fg-muted">{message}</p>}

      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-8 rounded-sm px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-fg shadow-hairline-strong transition-colors hover:text-ember hover:shadow-[inset_0_0_0_1px_var(--color-ember)]"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
