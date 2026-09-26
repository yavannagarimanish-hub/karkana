import Link from 'next/link';
import { cn } from './cn';

export interface SectionHeaderProps {
  index?: string;
  title: string;
  subtitle?: string;
  /** Set to "h1" on pages where this is the primary heading. Defaults to "h2". */
  as?: 'h1' | 'h2';
  /** Optional "view all" target rendered on the right. */
  href?: string;
  linkLabel?: string;
  className?: string;
}

export function SectionHeader({
  index,
  title,
  subtitle,
  as: Tag = 'h2',
  href,
  linkLabel = 'View all',
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('mb-10 sm:mb-14', className)}>
      <div className="flex items-center gap-3">
        {index && <span className="numeric text-[11px] text-ember">[{index}]</span>}
        <span aria-hidden className="h-px w-10 bg-hairline-strong" />
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Tag className="text-xl font-bold uppercase tracking-[0.08em] text-fg sm:text-3xl sm:tracking-[0.16em]">
            {title}
          </Tag>
          {subtitle && <p className="label mt-2 max-w-xl">{subtitle}</p>}
        </div>

        {href && (
          <Link
            href={href}
            className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-muted transition-colors hover:text-ember"
          >
            {linkLabel}
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
