'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { SORT_KEYS, type SortKey } from '@/core/domain/catalogue';
import { formatINR } from '@/core/domain/money';
import { Select } from '@/ui/field';
import { cn } from '@/ui/cn';

export interface FilterBarProps {
  categories: string[];
  counts: { total: number };
  priceBands: { id: string; label: string; min: number; max: number | null }[];
}

const SORT_LABELS: Record<SortKey, string> = {
  position: 'Curated order',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  discount: 'Biggest discount',
  name: 'Name A–Z',
};

/** URL-driven filters: every control writes to the query string and reloads. */
export function FilterBar({ categories, counts, priceBands }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      // Changing a filter resets pagination.
      params.delete('page');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const activeBand = searchParams.get('band');

  return (
    <div className="surface mb-8 rounded-sm p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="numeric mr-auto text-[11px] uppercase tracking-[0.14em] text-fg-dim">
          {counts.total} {counts.total === 1 ? 'product' : 'products'}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="filter-category" className="label">
            Category
          </label>
          <Select
            id="filter-category"
            className="h-9 w-auto min-w-40 py-0 text-[11px]"
            value={searchParams.get('category') ?? ''}
            onChange={(event) => setParam({ category: event.target.value || null })}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>

          <label htmlFor="filter-band" className="label">
            Price
          </label>
          <Select
            id="filter-band"
            className="h-9 w-auto min-w-36 py-0 text-[11px]"
            value={activeBand ?? ''}
            onChange={(event) => setParam({ band: event.target.value || null })}
          >
            <option value="">Any price</option>
            {priceBands.map((band) => (
              <option key={band.id} value={band.id}>
                {band.label}
              </option>
            ))}
          </Select>

          <label htmlFor="filter-sort" className="label">
            Sort
          </label>
          <Select
            id="filter-sort"
            className="h-9 w-auto min-w-44 py-0 text-[11px]"
            value={searchParams.get('sort') ?? 'position'}
            onChange={(event) => setParam({ sort: event.target.value })}
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </Select>

          <button
            type="button"
            onClick={() => setParam({ inStockOnly: searchParams.get('inStockOnly') === 'true' ? null : 'true' })}
            aria-pressed={searchParams.get('inStockOnly') === 'true'}
            className={cn(
              'h-9 rounded-sm px-3 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors',
              searchParams.get('inStockOnly') === 'true'
                ? 'bg-ember text-fg'
                : 'text-fg-muted shadow-hairline-strong hover:text-fg',
            )}
          >
            In stock
          </button>
        </div>
      </div>

      {priceBands.length > 0 && (
        <p className="mt-3 text-[11px] text-fg-dim">
          Bands are derived from this module&rsquo;s live price range
          {priceBands[0]?.min !== undefined && priceBands[priceBands.length - 1]?.max === null
            ? ` (up to ${formatINR(priceBands[priceBands.length - 1]!.min)}+)`
            : ''}
          .
        </p>
      )}
    </div>
  );
}
