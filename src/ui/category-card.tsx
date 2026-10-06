import Link from 'next/link';
import * as React from 'react';
import type { PrimarySection } from '@/core/domain/catalog-families';
import { cn } from './cn';

export interface CategorySummary {
  section: PrimarySection;
  slug: string;
  description: string;
  familyCount: number;
  skuCount: number;
}

export interface CategoryCardProps {
  category: CategorySummary;
  index: number;
  className?: string;
}

/**
 * Minimal, CRED-like category card for the Basic browsing experience.
 */
export function CategoryCard({ category, index, className }: CategoryCardProps) {
  const href = `/category/${category.slug}`;

  return (
    <Link
      href={href}
      className={cn(
        'surface group relative flex flex-col justify-between overflow-hidden rounded-sm border border-hairline bg-panel p-4 sm:p-5 transition-all duration-200 hover:border-ember hover:shadow-hairline-strong',
        className,
      )}
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="numeric font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.16em] text-ember">
            {String(index + 1).padStart(2, '0')} · SECTION
          </span>
          <span className="numeric font-mono text-[9px] text-fg-ghost">
            {category.skuCount} ITEMS
          </span>
        </div>

        <h3 className="mt-2 font-display text-sm sm:text-base font-bold uppercase tracking-[0.04em] text-fg transition-colors group-hover:text-ember">
          {category.section}
        </h3>

        <p className="mt-1 text-xs text-fg-muted line-clamp-2 leading-relaxed">
          {category.description}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-hairline/60 pt-3">
        <span className="numeric font-mono text-[10px] text-fg-dim">
          {category.familyCount} {category.familyCount === 1 ? 'family' : 'families'}
        </span>

        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ember flex items-center gap-1 transition-transform duration-200 group-hover:translate-x-1">
          Explore →
        </span>
      </div>
    </Link>
  );
}

export interface CategoryGridProps {
  categories: CategorySummary[];
  className?: string;
}

export function CategoryGrid({ categories, className }: CategoryGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4',
        className,
      )}
    >
      {categories.map((cat, idx) => (
        <CategoryCard key={cat.section} category={cat} index={idx} />
      ))}
    </div>
  );
}
