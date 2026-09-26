import type { Metadata } from 'next';
import Link from 'next/link';
import { getAppServices } from '@/infra/db';
import { ProductGrid } from '@/ui/product-grid';
import { SectionHeader } from '@/ui/section-header';
import { EmptyState } from '@/ui/empty-state';
import { isSortKey, type SortKey } from '@/core/domain/catalogue';
import { MODULE_SLUGS, type ProductModule } from '@/core/domain/product';
import { cn } from '@/ui/cn';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const PAGE_SIZE = 24;

const SORT_LABELS: Record<SortKey, string> = {
  position: 'Catalogue order',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  discount: 'Biggest discount',
  name: 'Name A–Z',
};

const SORT_ORDER: SortKey[] = ['position', 'price-asc', 'price-desc', 'discount', 'name'];

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const term = (firstString(q) ?? '').trim();

  return {
    title: term ? `Search: ${term}` : 'Search',
    description: term ? `Results for "${term}" in the Karkana catalogue.` : 'Search the Karkana catalogue.',
    // Only the bare search page is indexable. Query strings would otherwise
    // generate unbounded duplicate URLs.
    alternates: { canonical: '/search' },
    robots: term ? { index: false, follow: true } : undefined,
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const term = (firstString(sp.q) ?? '').trim();
  const sortParam = firstString(sp.sort);
  const sort: SortKey | undefined = sortParam && isSortKey(sortParam) ? sortParam : undefined;
  const inStockOnly = firstString(sp.inStockOnly) === 'true';
  const page = Math.max(1, Number(firstString(sp.page) ?? '1') || 1);

  const services = await getAppServices();
  const result = await services.catalogue.searchPage(term, { sort, inStockOnly }, page, PAGE_SIZE);

  const totalPages = result.page.totalPages;
  const shown = result.page.items;
  const start = (result.page.page - 1) * PAGE_SIZE;

  const hrefFor = (overrides: Record<string, string | number | null>): string => {
    const params = new URLSearchParams();
    if (term) params.set('q', term);
    if (sort) params.set('sort', sort);
    if (inStockOnly) params.set('inStockOnly', 'true');

    for (const [key, value] of Object.entries(overrides)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, String(value));
    }
    return `/search?${params.toString()}`;
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8 lg:px-12 lg:py-16">
      <div className="border-b border-hairline pb-8">
        <div className="flex items-center gap-3">
          <span className="numeric text-[11px] text-ember">[?]</span>
          <span aria-hidden className="h-px w-10 bg-hairline-strong" />
        </div>

        <h1 className="mt-4 font-display text-3xl leading-tight font-bold text-fg sm:text-4xl">
          {term ? (
            <>
              Results for <span className="text-ember">“{term}”</span>
            </>
          ) : (
            'Search the catalogue'
          )}
        </h1>

        {term && (
          <p className="mt-3 max-w-2xl text-sm text-fg/60">
            {result.counts.total === 0
              ? 'Nothing matched. Check the spelling, or browse a collection instead.'
              : `${result.counts.total} ${result.counts.total === 1 ? 'match' : 'matches'} across name, brand, category, product id and keywords.`}
          </p>
        )}
      </div>

      {!term ? (
        <div className="mt-12">
          <EmptyState
            title="What are you looking for?"
            message="Try “rocket”, “sparkler”, a product id such as KRK001, or a brand name."
            actionLabel="Browse Basic crackers"
            actionHref={`/module/${MODULE_SLUGS.BASIC}`}
          />
        </div>
      ) : result.counts.total === 0 ? (
        <div className="mt-12">
          <EmptyState
            title={`No results for “${term}”`}
            message="The catalogue runs to 138 products across three collections, so one of them is probably close."
            actionLabel="Browse Basic crackers"
            actionHref={`/module/${MODULE_SLUGS.BASIC}`}
          />
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <p className="label text-fg-dim">
              {start + 1}–{Math.min(start + PAGE_SIZE, result.counts.total)} of {result.counts.total}
            </p>

            <form action={hrefFor({ page: null })} className="flex items-center gap-2">
              <input type="hidden" name="q" value={term} />
              {inStockOnly && <input type="hidden" name="inStockOnly" value="true" />}
              <label htmlFor="search-sort" className="label text-fg-dim">
                Sort
              </label>
              <select
                id="search-sort"
                name="sort"
                defaultValue={sort ?? 'position'}
                className="h-9 rounded-md border border-hairline bg-panel px-3 text-xs text-fg focus:border-ember focus:ring-1 focus:ring-ember focus:outline-none"
              >
                {SORT_ORDER.map((key) => (
                  <option key={key} value={key}>
                    {SORT_LABELS[key]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="h-9 rounded-md border border-hairline bg-fg px-3 text-[11px] font-bold tracking-[0.14em] text-void uppercase transition hover:bg-ember hover:text-fg"
              >
                Apply
              </button>
            </form>
          </div>

          <div className="mt-8">
            <ProductGrid products={shown} />
          </div>

          {totalPages > 1 && (
            <nav className="mt-12 flex flex-wrap items-center justify-center gap-2" aria-label="Search pages">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <Link
                  key={pageNumber}
                  href={hrefFor({ page: pageNumber })}
                  aria-current={pageNumber === result.page.page ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-xs font-bold transition',
                    pageNumber === result.page.page
                      ? 'border-ember bg-ember/15 text-ember'
                      : 'border-hairline bg-panel text-fg/70 hover:border-ember/50 hover:text-fg',
                  )}
                >
                  {pageNumber}
                </Link>
              ))}
            </nav>
          )}

          {result.counts.byModule.CUSTOMIZED > 0 || result.counts.byModule.PERSONALIZED > 0 ? (
            <div className="mt-16">
              <SectionHeader
                title="In these results"
                subtitle="How your matches break down by collection."
              />
              <ul className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ['BASIC', 'Basic crackers'],
                    ['CUSTOMIZED', 'Customized'],
                    ['PERSONALIZED', 'Personalized'],
                  ] as [ProductModule, string][]
                )
                  .filter(([key]) => result.counts.byModule[key] > 0)
                  .map(([key, label]) => (
                    /* Slugs come from the domain, never hardcoded. */
                    <li key={key}>
                      <Link
                        href={`/module/${MODULE_SLUGS[key]}`}
                        className="surface block h-full p-5 transition hover:border-ember/60"
                      >
                        <div className="flex items-baseline justify-between">
                          <span className="label text-fg">{label}</span>
                          <span className="numeric text-xl font-bold text-ember">
                            {result.counts.byModule[key]}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
