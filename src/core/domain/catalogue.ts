import type { Product, ProductModule } from './product';
import { MODULE_SLUGS, pricePaise } from './product';
import { rupeesToPaise } from './money';

/* ── Sections ───────────────────────────────────────────────────────────── */

export const SECTION_KEYS = [
  'popular',
  'featured',
  'basic',
  'customized',
  'personalized',
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export interface CatalogueSection {
  id: string;
  key: SectionKey;
  title: string;
  subtitle: string;
  isVisible: boolean;
  displayPosition: number;
}

export interface SectionWithProducts {
  section: CatalogueSection;
  products: Product[];
}

/** Sections in display order, visible only. */
export function visibleSections(sections: readonly CatalogueSection[]): CatalogueSection[] {
  return sections
    .filter((section) => section.isVisible)
    .sort((a, b) => a.displayPosition - b.displayPosition);
}

export function isSectionKey(value: unknown): value is SectionKey {
  return typeof value === 'string' && (SECTION_KEYS as readonly string[]).includes(value);
}

/**
 * Attach products to sections and **drop the empty ones** — v1 rendered
 * Popular/Featured headings even though no product carried those flags.
 */
export function sectionWithProducts(
  sections: readonly CatalogueSection[],
  products: readonly Product[],
  limit = 8,
): SectionWithProducts[] {
  const result: SectionWithProducts[] = [];

  for (const section of visibleSections(sections)) {
    const matched = productsForSection(section.key, products);
    if (matched.length > 0) {
      result.push({ section, products: matched.slice(0, limit) });
    }
  }

  return result;
}

export function productsForSection(
  key: SectionKey,
  products: readonly Product[],
): Product[] {
  switch (key) {
    case 'popular':
      return products.filter((product) => product.isPopular);
    case 'featured':
      return products.filter((product) => product.isFeatured);
    case 'basic':
      return byPosition(products.filter((product) => product.module === 'BASIC'));
    case 'customized':
      return byPosition(products.filter((product) => product.module === 'CUSTOMIZED'));
    case 'personalized':
      return byPosition(products.filter((product) => product.module === 'PERSONALIZED'));
  }
}

export function compareProductPositions(a: Product, b: Product): number {
  const posA = a.displayPosition ?? 0;
  const posB = b.displayPosition ?? 0;
  if (posA > 0 && posB > 0) {
    if (posA !== posB) return posA - posB;
  } else if (posA > 0 && posB <= 0) {
    return -1;
  } else if (posA <= 0 && posB > 0) {
    return 1;
  }
  return a.id.localeCompare(b.id);
}

function byPosition(products: Product[]): Product[] {
  return [...products].sort(compareProductPositions);
}

/* ── Counts (nothing in the UI may hardcode these) ──────────────────────── */

export interface CatalogueCounts {
  total: number;
  byModule: Record<ProductModule, number>;
  categories: { name: string; count: number }[];
  idRange: { first: string; last: string } | null;
}

export function catalogueCounts(products: readonly Product[]): CatalogueCounts {
  const byModule: Record<ProductModule, number> = { BASIC: 0, CUSTOMIZED: 0, PERSONALIZED: 0 };
  const categoryMap = new Map<string, number>();

  for (const product of products) {
    byModule[product.module] += 1;
    if (product.category) {
      categoryMap.set(product.category, (categoryMap.get(product.category) ?? 0) + 1);
    }
  }

  const ids = products.map((product) => product.id).sort();

  return {
    total: products.length,
    byModule,
    categories: [...categoryMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    idRange: ids.length > 0 ? { first: ids[0]!, last: ids[ids.length - 1]! } : null,
  };
}

/* ── Filtering & sorting ────────────────────────────────────────────────── */

export const SORT_KEYS = [
  'position',
  'price-asc',
  'price-desc',
  'discount',
  'name',
] as const;

export type SortKey = (typeof SORT_KEYS)[number];

export function isSortKey(value: unknown): value is SortKey {
  return typeof value === 'string' && (SORT_KEYS as readonly string[]).includes(value);
}

export interface CatalogueFilter {
  module?: ProductModule | null;
  category?: string | null;
  search?: string | null;
  inStockOnly?: boolean;
  minPricePaise?: number | null;
  maxPricePaise?: number | null;
  sort?: SortKey;
}

export function filterProducts(
  products: readonly Product[],
  filter: CatalogueFilter = {},
): Product[] {
  const query = filter.search?.trim().toLowerCase() ?? '';
  const minPrice = filter.minPricePaise ?? null;
  const maxPrice = filter.maxPricePaise ?? null;

  const filtered = products.filter((product) => {
    if (filter.module && product.module !== filter.module) return false;
    if (filter.category && product.category !== filter.category) return false;
    if (filter.inStockOnly && !product.inStock) return false;

    const price = pricePaise(product);
    if (minPrice !== null && price < minPrice) return false;
    if (maxPrice !== null && price > maxPrice) return false;

    if (query) return searchScore(product, query) > 0;
    return true;
  });

  return query ? rankByRelevance(filtered, query, filter.sort) : sortProducts(filtered, filter.sort ?? 'position');
}

/** Word-boundary weighted match across the searchable fields. */
export function searchScore(product: Product, rawQuery: string): number {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return 0;

  const name = product.name.toLowerCase();
  const haystack = [
    product.brand,
    product.category,
    product.subcategory,
    product.searchKeywords,
    product.shortDescription,
    product.description,
  ]
    .join(' ')
    .toLowerCase();

  let score = 0;
  for (const term of query.split(/\s+/).filter(Boolean)) {
    if (name === term) score += 120;
    else if (name.startsWith(term)) score += 80;
    else if (name.includes(term)) score += 50;

    if (haystack.includes(term)) score += 20;

    if (product.id.toLowerCase().includes(term)) score += 30;
  }

  return score;
}

export function rankByRelevance(
  products: readonly Product[],
  query: string,
  tieBreaker: SortKey = 'position',
): Product[] {
  const sorted = sortProducts(products, tieBreaker);
  return [...sorted].sort(
    (a, b) => searchScore(b, query) - searchScore(a, query) || compareProductPositions(a, b),
  );
}

export function sortProducts(products: readonly Product[], sort: SortKey = 'position'): Product[] {
  const copy = [...products];
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => a.price - b.price || compareProductPositions(a, b));
    case 'price-desc':
      return copy.sort((a, b) => b.price - a.price || compareProductPositions(a, b));
    case 'discount':
      return copy.sort((a, b) => discountOf(b) - discountOf(a) || compareProductPositions(a, b));
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'position':
    default:
      return copy.sort(compareProductPositions);
  }
}

function discountOf(product: Product): number {
  if (!product.originalPrice || product.originalPrice <= product.price) return 0;
  return (rupeesToPaise(product.originalPrice) - pricePaise(product)) / rupeesToPaise(product.originalPrice);
}

/* ── Pagination ─────────────────────────────────────────────────────────── */

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 96;

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

export function paginate<T>(
  items: readonly T[],
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Page<T> {
  const safePage = Math.max(1, Math.trunc(page) || 1);
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(pageSize) || DEFAULT_PAGE_SIZE));
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safeSize));
  const clamped = Math.min(safePage, totalPages);

  return {
    items: items.slice((clamped - 1) * safeSize, clamped * safeSize),
    page: clamped,
    pageSize: safeSize,
    totalPages,
    totalItems,
  };
}

/** Slug used in `/module/[module]` URLs. */
export function moduleSlug(module: ProductModule): string {
  return MODULE_SLUGS[module];
}
