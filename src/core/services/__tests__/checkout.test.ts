import { describe, expect, it, vi } from 'vitest';
import { createCheckoutService } from '../checkout';
import type { Clock, Repositories } from '@/core/ports';
import type { Product } from '@/core/domain/product';
import type { Order } from '@/core/domain/order';

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
    images: [],
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
    imageWidth: null,
    imageHeight: null,
    orientation: null,
    createdAt: '2026-09-25T15:52:51.762Z',
    updatedAt: '2026-09-25T15:52:51.762Z',
    ...overrides,
  };
}

function fixedClock(now: string): Clock {
  const fixed = new Date(now);
  return { now: () => new Date(fixed.getTime()), iso: () => fixed.toISOString() };
}

function makeRepos(catalogue: Product[], saved: Order[] = []): Repositories {
  return {
    products: {
      list: vi.fn(async () => catalogue),
      findById: vi.fn(async (id: string) => catalogue.find((item) => item.id === id) ?? null),
      findByIds: vi.fn(async (ids: readonly string[]) =>
        catalogue.filter((item) => ids.includes(item.id)),
      ),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      reorder: vi.fn(),
      nextId: vi.fn(async () => 'KRK999'),
    },
    sections: { list: vi.fn(async () => []), update: vi.fn() },
    orders: {
      create: vi.fn(async (order: Order) => {
        saved.push(order);
        return order;
      }),
      findById: vi.fn(async (id: string) => saved.find((order) => order.id === id) ?? null),
      list: vi.fn(async () => saved),
      updateStatus: vi.fn(),
      metrics: vi.fn(),
    },
    customers: {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      recordLogin: vi.fn(),
      updatePassword: vi.fn(),
      listAddresses: vi.fn(async () => []),
      createAddress: vi.fn(),
      updateAddress: vi.fn(),
      removeAddress: vi.fn(),
      wishlist: vi.fn(async () => []),
      isWishlisted: vi.fn(async () => false),
      toggleWishlist: vi.fn(async () => true),
    },
    storage: { isConfigured: () => false, put: vi.fn() },
    passwords: { hash: vi.fn(), verify: vi.fn() },
    clock: fixedClock('2026-09-27T10:00:00Z'),
    ids: {
      customer: () => 'cus_test',
      address: () => 'adr_test',
      order: () => 'KRK-TEST01',
      product: () => 'KRK999',
    },
    driver: 'memory',
  };
}

describe('checkout service', () => {
  it('prices a cart from the catalogue, not the client', async () => {
    const repos = makeRepos([product()]);
    const checkout = createCheckoutService(repos);

    const quote = await checkout.quote([{ productId: 'KRK001', quantity: 2 }]);

    expect(quote.totals.subtotalPaise).toBe(21800);
    expect(quote.unavailable).toEqual([]);
  });

  it('places an order with the server-computed total', async () => {
    const saved: Order[] = [];
    const repos = makeRepos([product()], saved);
    const checkout = createCheckoutService(repos);

    const order = await checkout.placeOrder(
      {
        customerName: 'Meena',
        mobile: '9876543210',
        address: {
          houseFlat: '12-3',
          streetLocality: 'MG Road',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500001',
          instructions: '',
        },
        items: [{ productId: 'KRK001', quantity: 2 }],
        paymentMethod: 'COD',
      },
      { customerId: null },
    );

    expect(order.id).toBe('KRK-TEST01');
    expect(order.totalPaise).toBe(21800);
    expect(order.status).toBe('NEW');
    expect(order.createdAt).toBe('2026-09-27T10:00:00.000Z');
    expect(saved).toHaveLength(1);
  });

  it('attaches the customer id when one is signed in', async () => {
    const repos = makeRepos([product()]);
    const checkout = createCheckoutService(repos);

    const order = await checkout.placeOrder(
      {
        customerName: 'Meena',
        mobile: '9876543210',
        address: {
          houseFlat: '12-3',
          streetLocality: 'MG Road',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500001',
          instructions: '',
        },
        items: [{ productId: 'KRK001', quantity: 1 }],
        paymentMethod: 'COD',
      },
      { customerId: 'cus_42' },
    );

    expect(order.customerId).toBe('cus_42');
  });

  it('refuses an order containing an unavailable product', async () => {
    const repos = makeRepos([product({ id: 'KRK002', inStock: false })]);
    const checkout = createCheckoutService(repos);

    await expect(
      checkout.placeOrder(
        {
          customerName: 'Meena',
          mobile: '9876543210',
          address: {
            houseFlat: '12-3',
            streetLocality: 'MG Road',
            city: 'Hyderabad',
            state: 'Telangana',
            pincode: '500001',
            instructions: '',
          },
          items: [{ productId: 'KRK002', quantity: 1 }],
          paymentMethod: 'COD',
        },
        { customerId: null },
      ),
    ).rejects.toThrow();
  });
});
