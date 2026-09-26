import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAppServices } from '@/infra/db';
import { SITE } from '@/infra/config';
import type { SortKey } from '@/core/domain/catalogue';
import { isSortKey } from '@/core/domain/catalogue';
import { formatINR } from '@/core/domain/money';
import { pricePaise } from '@/core/domain/product';
import type { Product } from '@/core/domain/product';
import { EmptyState } from '@/ui/empty-state';
import { ProductGrid } from '@/ui/product-grid';
import { SectionHeader } from '@/ui/section-header';
import { FilterBar } from '@/features/catalogue/filter-bar';

interface Props {
  params: Promise<{ module: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

interface PriceBand {
  id: string;
  label: string;
  min: number;
  max: number | null;
}

/** Quartile bands computed from the module's actual prices. */
function buildPriceBands(products: readonly Product[]): PriceBand[] {
  const prices = [...new Set(products.map((product) => pricePaise(product)).filter((p) => p > 0))].sort(
    (a, b) => a - b,
  );
  if (prices.length < 4) return [];

  const cuts = [
    prices[Math.floor(prices.length * 0.25)]!,
    prices[Math.floor(prices.length * 0.5)]!,
    prices[Math.floor(prices.length * 0.75)]!,
  ];

  return [
    { id: `0-${cuts[0]}`, label: `Under ${formatINR(cuts[0]!)}`, min: 0, max: cuts[0] },
    { id: `${cuts[0]}-${cuts[1]}`, label: `${formatINR(cuts[0]!)} – ${formatINR(cuts[1]!)}`, min: cuts[0]!, max: cuts[1] },
    { id: `${cuts[1]}-${cuts[2]}`, label: `${formatINR(cuts[1]!)} – ${formatINR(cuts[2]!)}`, min: cuts[1]!, max: cuts[2] },
    { id: `${cuts[2]}-`, label: `Over ${formatINR(cuts[2]!)}`, min: cuts[2]!, max: null },
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { module: slug } = await params;
  const label = slug.charAt(0).toUpperCase() + slug.slice(1).toLowerCase();
  return {
    title: `${label} catalogue`,
    description: `${label} crackers from ${SITE.name}, dispatched from ${SITE.city} with cash on delivery.`,
    alternates: { canonical: `/module/${slug}` },
  };
}

export default async function ModulePage({ params, searchParams }: Props) {
  const { module: slug } = await params;
  const sp = await searchParams;

  const services = await getAppServices();

  const category = firstString(sp.category);
  const sortParam = firstString(sp.sort);
  const sort: SortKey | undefined = sortParam && isSortKey(sortParam) ? sortParam : undefined;
  const inStockOnly = firstString(sp.inStockOnly) === 'true';
  const page = Math.max(1, Number(firstString(sp.page) ?? '1') || 1);

  const preview = await services.catalogue.modulePage(slug);
  if (!preview) notFound();

  // Filter facets are always derived from the whole module, never from the
  // already-filtered result, so narrowing cannot hide the way back out.
  const moduleProducts = preview.products;
  const bands = buildPriceBands(moduleProducts);
  const categories = [...new Set(moduleProducts.map((product) => product.category).filter(Boolean))].sort();
  const selectedBand = bands.find((band) => band.id === firstString(sp.band));

  const view = await services.catalogue.modulePage(
    slug,
    {
      category: category ?? null,
      sort,
      inStockOnly,
      minPricePaise: selectedBand?.min ?? null,
      maxPricePaise: selectedBand ? selectedBand.max : null,
    },
    page,
  );

  if (!view) notFound();

  const label = view.module.charAt(0) + view.module.slice(1).toLowerCase();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16 lg:px-12">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-[11px] text-fg-dim">
        <Link href="/" className="transition-colors hover:text-fg">
          Home
        </Link>
        <span aria-hidden>/</span>
        <span className="font-mono uppercase tracking-[0.14em] text-fg-muted">{label}</span>
      </nav>

      <SectionHeader
        as="h1"
        index={view.module === 'BASIC' ? '01' : view.module === 'CUSTOMIZED' ? '02' : '03'}
        title={`${label} catalogue`}
        subtitle={`${view.counts.total} visible ${view.counts.total === 1 ? 'product' : 'products'}${
          view.counts.idRange ? ` · ${view.counts.idRange.first} – ${view.counts.idRange.last}` : ''
        }`}
      />

      <FilterBar categories={categories} counts={{ total: view.counts.total }} priceBands={bands} />

      {view.products.length === 0 ? (
        <EmptyState
          title="Nothing matches those filters"
          message="Try clearing the category or price filter, or browse another module."
          actionLabel="Clear filters"
          actionHref={`/module/${view.slug}`}
        />
      ) : (
        <>
          <ProductGrid products={view.page.items} priorityCount={4} />

          {view.page.totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
              {Array.from({ length: view.page.totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <Link
                  key={pageNumber}
                  href={`/module/${view.slug}?page=${pageNumber}${category ? `&category=${encodeURIComponent(category)}` : ''}${
                    sort ? `&sort=${sort}` : ''
                  }${inStockOnly ? '&inStockOnly=true' : ''}${selectedBand ? `&band=${encodeURIComponent(selectedBand.id)}` : ''}`}
                  aria-current={pageNumber === view.page.page ? 'page' : undefined}
                  className={
                    pageNumber === view.page.page
                      ? 'numeric grid size-10 place-items-center rounded-sm bg-ember text-fg'
                      : 'numeric grid size-10 place-items-center rounded-sm text-fg-muted shadow-hairline-strong transition-colors hover:text-fg'
                  }
                >
                  {pageNumber}
                </Link>
              ))}
            </nav>
          )}
        </>
      )}

    </div>
  );
}
