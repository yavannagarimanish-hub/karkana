import { describe, expect, it } from 'vitest';
import { validateCatalogue } from '../validation';
import type { Product } from '@/core/domain/product';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'KRK001',
    name: '7 CM ELECTRIC',
    brand: 'SPARKLERS',
    category: 'Sparklers',
    subcategory: '',
    description: 'A bright sparkler.',
    shortDescription: 'Bright.',
    price: 109,
    originalPrice: 180,
    stockQuantity: 50,
    unit: '',
    images: ['/uploads/products/KRK001_main.jpg'],
    video: '',
    module: 'BASIC',
    displayPosition: 1,
    isFeatured: false,
    isPopular: false,
    isVisible: true,
    inStock: true,
    searchKeywords: 'sparkler small',
    safetyInstructions: 'Light at arm’s length.',
    notes: '',
    imageWidth: 1254,
    imageHeight: 1254,
    orientation: 'SQUARE',
    createdAt: '2026-09-25T15:52:51.762Z',
    updatedAt: '2026-09-25T15:52:51.762Z',
    ...overrides,
  };
}

describe('validateCatalogue', () => {
  it('reports a complete product as clean', () => {
    const report = validateCatalogue([product()]);

    expect(report.bySeverity.ERROR).toBe(0);
    expect(report.bySeverity.WARNING).toBe(0);
    expect(report.completeness).toBe(1);
    expect(report.productsRequiringAttention).toEqual([]);
  });

  it('flags blocking problems as errors', () => {
    const report = validateCatalogue([
      product({ name: '' }),
      product({ id: 'KRK002', price: 0 }),
      product({ id: 'KRK003', originalPrice: 50 }), // below the selling price
      product({ id: 'KRK004', images: [] }),
    ]);

    expect(report.bySeverity.ERROR).toBe(4);
    expect(report.issues.filter((issue) => issue.severity === 'ERROR').map((issue) => issue.field).sort()).toEqual(
      ['images', 'name', 'originalPrice', 'price'],
    );
  });

  it('detects duplicate ids', () => {
    const report = validateCatalogue([product(), product()]);
    const duplicate = report.issues.find((issue) => issue.field === 'id');

    expect(duplicate?.severity).toBe('ERROR');
    expect(duplicate?.message).toContain('appears 2 times');
  });

  it('flags missing descriptions and unknown stock as warnings', () => {
    const report = validateCatalogue([product({ description: '', stockQuantity: null })]);

    expect(report.bySeverity.WARNING).toBeGreaterThanOrEqual(2);
    expect(report.completeness).toBe(0);
  });

  it('treats empty optional fields as INCOMPLETE, which does not lower completeness', () => {
    const report = validateCatalogue([product({ shortDescription: '', safetyInstructions: '' })]);

    expect(report.bySeverity.INCOMPLETE).toBe(2);
    expect(report.bySeverity.WARNING).toBe(0);
    expect(report.completeness).toBe(1);
  });

  it('measures field coverage', () => {
    const report = validateCatalogue([product(), product({ id: 'KRK002', description: '' })]);
    const description = report.coverage.find((row) => row.field === 'description');

    expect(description).toMatchObject({ filled: 1, total: 2, percent: 50 });
  });

  it('handles an empty catalogue', () => {
    const report = validateCatalogue([]);
    expect(report.totalProducts).toBe(0);
    expect(report.completeness).toBe(0);
  });

  it('mirrors the real seed file’s shape: 138 products, all missing descriptions', () => {
    // The committed catalogue has empty descriptions and null stock on every row.
    const rows = Array.from({ length: 138 }, (_, index) =>
      product({
        id: `KRK${String(index + 1).padStart(3, '0')}`,
        description: '',
        stockQuantity: null,
        originalPrice: 180,
      }),
    );

    const report = validateCatalogue(rows, { now: new Date('2026-09-27T00:00:00Z') });

    expect(report.totalProducts).toBe(138);
    expect(report.bySeverity.ERROR).toBe(0);
    expect(report.completeness).toBe(0);
    expect(report.productsRequiringAttention).toHaveLength(138);
  });
});
