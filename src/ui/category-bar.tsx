'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { PRIMARY_SECTIONS, PRIMARY_SECTION_SLUGS, type PrimarySection } from '@/core/domain/catalog-families';
import { cn } from './cn';

export interface CategoryBarProps {
  activeSection?: string | null;
  className?: string;
}

export function CategoryBar({ activeSection, className }: CategoryBarProps) {
  const pathname = usePathname();

  return (
    <div
      aria-label="Product Categories"
      className={cn(
        'sticky top-16 sm:top-20 z-40 w-full border-b border-hairline bg-void/95 backdrop-blur-md',
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-1 sm:gap-2 overflow-x-auto px-4 py-2.5 sm:px-8 lg:px-12 no-scrollbar">
        {PRIMARY_SECTIONS.map((section: PrimarySection) => {
          const slug = PRIMARY_SECTION_SLUGS[section];
          const isActive =
            activeSection === section ||
            pathname.includes(encodeURIComponent(section)) ||
            pathname.includes(slug);
          const href = `/category/${slug}`;

          return (
            <Link
              key={section}
              href={href}
              className={cn(
                'shrink-0 rounded-xs px-2.5 py-1 sm:px-3 sm:py-1.5 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] transition-all',
                isActive
                  ? 'border border-ember bg-ember text-white shadow-hairline'
                  : 'border border-hairline bg-panel text-fg-muted hover:border-hairline-strong hover:bg-panel-raised hover:text-white',
              )}
            >
              {section}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

