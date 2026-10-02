import { describe, expect, it } from 'vitest';
import { priceOrder, quoteCart, mergeCartLines, PricingError, MAX_LINE_QUANTITY, calculateDelivery } from '../pricing';
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

describe('calculateDelivery', () => {
  it('enforces below minimum for ₹500 and ₹598', () => {
    const res500 = calculateDelivery(50000);
    expect(res500.isBelowMinimum).toBe(true);
    expect(res500.isFreeDelivery).toBe(false);
    expect(res500.progressMessage).toBe('Add more than ₹599 to place an order.');
    expect(res500.deliveryChargeLabel).toBe('₹199');
    expect(res500.deliveryChargePaise).toBe(19900);

    const res598 = calculateDelivery(59800);
    expect(res598.isBelowMinimum).toBe(true);
    expect(res598.isFreeDelivery).toBe(false);
    expect(res598.progressMessage).toBe('Add more than ₹599 to place an order.');
  });

  it('allows order at exactly ₹599 with ₹199 delivery and dynamic shortfall of ₹200 for free delivery', () => {
    const res599 = calculateDelivery(59900);
    expect(res599.isBelowMinimum).toBe(false);
    expect(res599.isFreeDelivery).toBe(false);
    expect(res599.deliveryChargePaise).toBe(19900);
    expect(res599.deliveryChargeLabel).toBe('₹199');
    expect(res599.freeDeliveryShortfallPaise).toBe(20000);
    expect(res599.progressMessage).toBe('Add more products worth ₹200 to get free delivery.');
    expect(res599.totalPaise).toBe(59900 + 19900);
  });

  it('dynamically computes shortfall for ₹650 (Add ₹149)', () => {
    const res = calculateDelivery(65000);
    expect(res.isBelowMinimum).toBe(false);
    expect(res.isFreeDelivery).toBe(false);
    expect(res.freeDeliveryShortfallPaise).toBe(14900);
    expect(res.progressMessage).toBe('Add more products worth ₹149 to get free delivery.');
    expect(res.deliveryChargeLabel).toBe('₹199');
  });

  it('dynamically computes shortfall for ₹750 (Add ₹49)', () => {
    const res = calculateDelivery(75000);
    expect(res.isBelowMinimum).toBe(false);
    expect(res.isFreeDelivery).toBe(false);
    expect(res.freeDeliveryShortfallPaise).toBe(4900);
    expect(res.progressMessage).toBe('Add more products worth ₹49 to get free delivery.');
    expect(res.deliveryChargeLabel).toBe('₹199');
  });

  it('dynamically computes shortfall for ₹798 (Add ₹1)', () => {
    const res = calculateDelivery(79800);
    expect(res.isBelowMinimum).toBe(false);
    expect(res.isFreeDelivery).toBe(false);
    expect(res.freeDeliveryShortfallPaise).toBe(100);
    expect(res.progressMessage).toBe('Add more products worth ₹1 to get free delivery.');
    expect(res.deliveryChargeLabel).toBe('₹199');
  });

  it('provides free delivery for exactly ₹799 and ₹1,000', () => {
    const res799 = calculateDelivery(79900);
    expect(res799.isBelowMinimum).toBe(false);
    expect(res799.isFreeDelivery).toBe(true);
    expect(res799.deliveryChargePaise).toBe(0);
    expect(res799.deliveryChargeLabel).toBe('₹0');
    expect(res799.progressMessage).toBe('Free delivery');
    expect(res799.totalPaise).toBe(79900);

    const res1000 = calculateDelivery(100000);
    expect(res1000.isBelowMinimum).toBe(false);
    expect(res1000.isFreeDelivery).toBe(true);
    expect(res1000.deliveryChargePaise).toBe(0);
    expect(res1000.deliveryChargeLabel).toBe('₹0');
    expect(res1000.progressMessage).toBe('Free delivery');
    expect(res1000.totalPaise).toBe(100000);
  });
});
