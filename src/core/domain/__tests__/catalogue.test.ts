import { describe, expect, it } from 'vitest';
import {
  catalogueCounts,
  filterProducts,
  paginate,
  productsForSection,
  searchScore,
  sectionWithProducts,
  sortProducts,
  visibleSections,
  type CatalogueSection,
} from '../catalogue';
import type { Product } from '../product';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'KRK001',
    name: '7 CM ELECTRIC',
    brand: 'SPARKLERS',
    category: 'Sparklers',
    subcategory: '',
    description: 'A bright electric sparkler.',
    shortDescription: '',
    price: 109,
    originalPrice: 180,
    stockQuantity: null,
    unit: '',
    images: ['/uploads/products/KRK001_main.jpg'],
    video: '',
    module: 'BASIC',
    displayPosition: 1,
    isFeatured: false,
    isPopular: false,
    isVisible: true,
    inStock: true,
    searchKeywords: '',
    safetyInstructions: '',
    notes: '',
    imageWidth: 1254,
    imageHeight: 1254,
    orientation: 'SQUARE',
    createdAt: '2026-09-25T15:52:51.762Z',
    updatedAt: '2026-09-25T15:52:51.762Z',
    ...overrides,
  };
}

const sections: CatalogueSection[] = [
  { id: 'sec-popular', key: 'popular', title: 'Popular', subtitle: '', isVisible: true, displayPosition: 1 },
  { id: 'sec-basic', key: 'basic', title: 'Basic', subtitle: '', isVisible: true, displayPosition: 2 },
  { id: 'sec-hidden', key: 'featured', title: 'Featured', subtitle: '', isVisible: false, displayPosition: 3 },
];

describe('sections', () => {
  it('returns visible sections in display order', () => {
    expect(visibleSections(sections).map((section) => section.id)).toEqual(['sec-popular', 'sec-basic']);
  });

  it('drops sections with no products', () => {
    const result = sectionWithProducts(sections, [product()]);
    expect(result.map((entry) => entry.section.key)).toEqual(['basic']);
  });

  it('includes popular only when a product carries the flag', () => {
    const withPopular = sectionWithProducts(sections, [product({ isPopular: true })]);
    expect(withPopular.map((entry) => entry.section.key)).toContain('popular');
  });

  it('limits each section', () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      product({ id: `KRK${index}`, displayPosition: index }),
    );
    expect(sectionWithProducts(sections, many, 5)[0]?.products).toHaveLength(5);
  });
});

describe('catalogueCounts', () => {
  it('counts per module and finds the id range', () => {
    const counts = catalogueCounts([
      product({ id: 'KRK001' }),
      product({ id: 'KRK138', module: 'CUSTOMIZED' }),
      product({ id: 'KRK050', category: 'Rockets' }),
    ]);

    expect(counts.total).toBe(3);
    expect(counts.byModule).toEqual({ BASIC: 2, CUSTOMIZED: 1, PERSONALIZED: 0 });
    expect(counts.idRange).toEqual({ first: 'KRK001', last: 'KRK138' });
    expect(counts.categories[0]).toEqual({ name: 'Sparklers', count: 2 });
  });

  it('reports no id range for an empty catalogue', () => {
    expect(catalogueCounts([]).idRange).toBeNull();
  });
});

describe('filtering and sorting', () => {
  const catalogue = [
    product({ id: 'KRK001', name: '7 CM ELECTRIC', price: 109, displayPosition: 1 }),
    product({ id: 'KRK002', name: '7 CM COLOUR', price: 119, displayPosition: 2, category: 'Rockets' }),
    product({ id: 'KRK003', name: 'ATOM BOMB', price: 499, displayPosition: 3, inStock: false }),
  ];

  it('filters by category and module', () => {
    expect(filterProducts(catalogue, { category: 'Rockets' })).toHaveLength(1);
    expect(filterProducts(catalogue, { module: 'PERSONALIZED' })).toHaveLength(0);
  });

  it('filters out-of-stock on request', () => {
    expect(filterProducts(catalogue, { inStockOnly: true })).toHaveLength(2);
  });

  it('filters by price band', () => {
    expect(filterProducts(catalogue, { minPricePaise: 11000, maxPricePaise: 20000 })).toHaveLength(1);
  });

  it('sorts by price, name and discount', () => {
    expect(sortProducts(catalogue, 'price-asc').map((item) => item.id)).toEqual([
      'KRK001',
      'KRK002',
      'KRK003',
    ]);
    expect(sortProducts(catalogue, 'price-desc')[0]?.id).toBe('KRK003');
    expect(sortProducts(catalogue, 'name')[0]?.name).toBe('7 CM COLOUR');
  });

  it('does not mutate the input array', () => {
    const original = [...catalogue];
    sortProducts(catalogue, 'price-desc');
    expect(catalogue).toEqual(original);
  });
});

describe('search', () => {
  const catalogue = [
    product({ id: 'KRK001', name: '7 CM ELECTRIC' }),
    product({ id: 'KRK100', name: 'MEGA ROCKET', searchKeywords: 'rocket big' }),
  ];

  it('scores exact and prefix matches highest', () => {
    expect(searchScore(product({ name: 'ROCKET' }), 'rocket')).toBeGreaterThan(
      searchScore(product({ name: 'BIG ROCKET BOX' }), 'rocket'),
    );
  });

  it('matches search keywords and ids', () => {
    expect(searchScore(catalogue[1]!, 'rocket')).toBeGreaterThan(0);
    expect(searchScore(catalogue[0]!, 'krk001')).toBeGreaterThan(0);
  });

  it('ranks by relevance, not by catalogue position', () => {
    const results = filterProducts(catalogue, { search: 'rocket' });
    expect(results[0]?.id).toBe('KRK100');
  });

  it('returns nothing for an unmatched term', () => {
    expect(filterProducts(catalogue, { search: 'zzzz' })).toHaveLength(0);
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, index) => index);

  it('splits into pages', () => {
    const page = paginate(items, 2, 10);
    expect(page.items).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(page.totalPages).toBe(3);
  });

  it('clamps out-of-range pages and page sizes', () => {
    expect(paginate(items, 99, 10).page).toBe(3);
    expect(paginate(items, 0, 10).page).toBe(1);
    expect(paginate(items, 1, 10_000).pageSize).toBe(96);
  });

  it('handles an empty list', () => {
    const page = paginate([], 1, 10);
    expect(page.items).toEqual([]);
    expect(page.totalPages).toBe(1);
  });
});

describe('productsForSection', () => {
  it('orders by display position then id', () => {
    const ordered = productsForSection('basic', [
      product({ id: 'KRK003', displayPosition: 3 }),
      product({ id: 'KRK001', displayPosition: 1 }),
      product({ id: 'KRK002', displayPosition: 1 }),
    ]);
    expect(ordered.map((item) => item.id)).toEqual(['KRK001', 'KRK002', 'KRK003']);
  });
});
