import { describe, expect, it } from 'vitest';
import { priceOrder, quoteCart, mergeCartLines, PricingError, MAX_LINE_QUANTITY } from '../pricing';
import type { Product } from '../product';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'KRK001',
    name: '7 CM ELECTRIC',
    brand: 'SPARKLERS',
    category: 'Sparklers',
    subcategory: '',
    description: '',
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

describe('priceOrder', () => {
  it('computes totals in integer paise', () => {
    const totals = priceOrder([product()], [{ productId: 'KRK001', quantity: 3 }]);

    expect(totals.subtotalPaise).toBe(109 * 100 * 3);
    expect(totals.totalPaise).toBe(32700);
    expect(totals.itemCount).toBe(3);
    expect(Number.isInteger(totals.totalPaise)).toBe(true);
  });

  it('never rounds away fractional rupees', () => {
    const totals = priceOrder([product({ price: 10.5 })], [{ productId: 'KRK001', quantity: 3 }]);
    expect(totals.subtotalPaise).toBe(3150);
  });

  it('rejects a product id that is not in the catalogue', () => {
    expect(() => priceOrder([product()], [{ productId: 'KRK999', quantity: 1 }])).toThrowError(
      expect.objectContaining({ code: 'UNKNOWN_PRODUCT' }),
    );
  });

  it('rejects hidden products', () => {
    expect(() =>
      priceOrder([product({ isVisible: false })], [{ productId: 'KRK001', quantity: 1 }]),
    ).toThrowError(expect.objectContaining({ code: 'PRODUCT_HIDDEN' }));
  });

  it('rejects out-of-stock products', () => {
    expect(() =>
      priceOrder([product({ inStock: false })], [{ productId: 'KRK001', quantity: 1 }]),
    ).toThrowError(expect.objectContaining({ code: 'PRODUCT_OUT_OF_STOCK' }));
  });

  it('rejects zero, fractional and over-cap quantities', () => {
    for (const quantity of [0, -1, 1.5, MAX_LINE_QUANTITY + 1]) {
      expect(() => priceOrder([product()], [{ productId: 'KRK001', quantity }])).toThrowError(
        PricingError,
      );
    }
  });

  it('requires a photograph for PERSONALIZED products', () => {
    const personalized = product({ id: 'KRK133', module: 'PERSONALIZED' });

    expect(() =>
      priceOrder([personalized], [{ productId: 'KRK133', quantity: 1 }]),
    ).toThrowError(expect.objectContaining({ code: 'MISSING_PERSONALIZATION' }));

    const totals = priceOrder(
      [personalized],
      [{ productId: 'KRK133', quantity: 1, personalizationImage: '/uploads/x.jpg' }],
      { personalizationFeePaise: 49900, shippingPaise: 0, freeShippingOverPaise: null },
    );

    expect(totals.feesPaise).toBe(49900);
    expect(totals.totalPaise).toBe(10900 + 49900);
  });

  it('applies shipping and the free-shipping threshold', () => {
    const policy = { personalizationFeePaise: 0, shippingPaise: 9900, freeShippingOverPaise: 20000 };

    expect(priceOrder([product()], [{ productId: 'KRK001', quantity: 1 }], policy).shippingPaise).toBe(9900);
    expect(priceOrder([product()], [{ productId: 'KRK001', quantity: 2 }], policy).shippingPaise).toBe(0);
  });

  it('merges duplicate lines that share the same personalization', () => {
    const totals = priceOrder(
      [product({ id: 'KRK133', module: 'PERSONALIZED' })],
      [
        { productId: 'KRK133', quantity: 1, personalizationImage: '/a.jpg' },
        { productId: 'KRK133', quantity: 2, personalizationImage: '/a.jpg' },
      ],
    );

    expect(totals.lines).toHaveLength(1);
    expect(totals.lines[0]?.quantity).toBe(3);
  });

  it('keeps lines apart when the personalization differs', () => {
    const totals = priceOrder(
      [product({ id: 'KRK133', module: 'PERSONALIZED' })],
      [
        { productId: 'KRK133', quantity: 1, personalizationImage: '/a.jpg' },
        { productId: 'KRK133', quantity: 1, personalizationImage: '/b.jpg' },
      ],
    );

    expect(totals.lines).toHaveLength(2);
  });
});

describe('quoteCart', () => {
  it('drops unavailable lines instead of throwing', () => {
    const catalogue = [product(), product({ id: 'KRK002', inStock: false })];

    const { totals, unavailable } = quoteCart(catalogue, [
      { productId: 'KRK001', quantity: 1 },
      { productId: 'KRK002', quantity: 1 },
      { productId: 'KRK999', quantity: 1 },
    ]);

    expect(totals.lines).toHaveLength(1);
    expect(unavailable.map((entry) => entry.reason).sort()).toEqual([
      'PRODUCT_OUT_OF_STOCK',
      'UNKNOWN_PRODUCT',
    ]);
  });

  it('returns an empty quote for an empty cart', () => {
    const { totals, unavailable } = quoteCart([product()], []);
    expect(totals.totalPaise).toBe(0);
    expect(unavailable).toEqual([]);
  });
});

describe('mergeCartLines', () => {
  it('is a no-op when nothing repeats', () => {
    const lines = [
      { productId: 'A', quantity: 1 },
      { productId: 'B', quantity: 2 },
    ];
    expect(mergeCartLines(lines)).toHaveLength(2);
  });
});
