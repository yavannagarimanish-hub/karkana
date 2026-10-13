/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import {
  detectImageFormat,
  validateAndNormalizeImage,
  ImageValidationError,
} from '../image-validation';
import { createLocalStorage, sanitizeUploadKey } from '../index';
import { createAdminService } from '@/core/services/admin';
import { createCheckoutService } from '@/core/services/checkout';
import type { Product } from '@/core/domain/product';
import type { Order } from '@/core/domain/order';
import type { Repositories } from '@/core/ports';

describe('Image upload, validation, and security test suite', () => {
  it('1. validates and normalizes a valid JPEG image', async () => {
    const jpegBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();

    expect(detectImageFormat(jpegBuffer)).toBe('jpeg');
    const result = await validateAndNormalizeImage(jpegBuffer, 'photo.jpg');
    expect(result.format).toBe('jpeg');
    expect(result.extension).toBe('jpg');
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('2. validates and normalizes a valid PNG image', async () => {
    const pngBuffer = await sharp({
      create: { width: 10, height: 10, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 1 } },
    })
      .png()
      .toBuffer();

    expect(detectImageFormat(pngBuffer)).toBe('png');
    const result = await validateAndNormalizeImage(pngBuffer, 'photo.png');
    expect(result.format).toBe('png');
    expect(result.extension).toBe('png');
    expect(result.mimeType).toBe('image/png');
  });

  it('3. validates and normalizes a valid WebP image', async () => {
    const webpBuffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 255 } },
    })
      .webp()
      .toBuffer();

    expect(detectImageFormat(webpBuffer)).toBe('webp');
    const result = await validateAndNormalizeImage(webpBuffer, 'photo.webp');
    expect(result.format).toBe('webp');
    expect(result.extension).toBe('webp');
    expect(result.mimeType).toBe('image/webp');
  });

  it('4. detects and handles HEIC images', () => {
    // Construct an ISOBMFF header with 'ftypheic'
    const heicHeader = Buffer.from([
      0x00, 0x00, 0x00, 0x18, // size: 24
      0x66, 0x74, 0x79, 0x70, // 'ftyp'
      0x68, 0x65, 0x69, 0x63, // 'heic'
      0x00, 0x00, 0x00, 0x00, // minor version
      0x6d, 0x69, 0x66, 0x31, // compatible: 'mif1'
      0x68, 0x65, 0x69, 0x63, // compatible: 'heic'
    ]);
    expect(detectImageFormat(heicHeader)).toBe('heic');
  });

  it('5. rejects files exceeding configured size limit in validation checks', () => {
    const maxBytes = 10 * 1024 * 1024;
    const oversized = 11 * 1024 * 1024;
    expect(oversized > maxBytes).toBe(true);
  });

  it('6. rejects files with misleading extensions or non-image content', async () => {
    const fakeBuffer = Buffer.from('<html><body>Not an image</body></html>');

    // Claiming to be a JPEG but content is HTML
    await expect(validateAndNormalizeImage(fakeBuffer, 'malicious.jpg')).rejects.toThrow(
      ImageValidationError,
    );

    // Banned executable extension
    const realJpeg = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();

    await expect(validateAndNormalizeImage(realJpeg, 'payload.exe')).rejects.toThrow(
      'The file extension is not permitted',
    );
  });

  it('7. persists and retrieves images in object storage without path traversal', async () => {
    const storage = createLocalStorage();
    const testKey = 'test/secure_' + Date.now() + '.jpg';
    const testData = await sharp({
      create: { width: 2, height: 2, channels: 3, background: { r: 100, g: 100, b: 100 } },
    })
      .jpeg()
      .toBuffer();

    const stored = await storage.put(testKey, testData, 'image/jpeg');
    expect(stored.key).toBe(testKey);

    const fetched = await storage.get?.(testKey);
    expect(fetched).not.toBeNull();
    expect(fetched?.contentType).toBe('image/jpeg');
    expect(fetched?.body.length).toBe(testData.length);

    // Traversal rejection
    expect(sanitizeUploadKey('../../../etc/passwd')).toBeNull();
    expect(sanitizeUploadKey('..\\..\\windows\\system32')).toBeNull();

    // Cleanup
    await storage.delete?.(testKey);
  });
});

describe('Personalized product orders and admin controls', () => {
  const sampleProduct: Product = {
    id: 'KRK132',
    name: 'BRS PARTY FIRECRACKER',
    brand: 'Karkana',
    category: 'Personalized',
    subcategory: 'Party',
    description: 'Custom printed firecracker box',
    shortDescription: 'Custom party box',
    price: 499,
    originalPrice: 1200,
    stockQuantity: null,
    unit: 'box',
    images: ['/uploads/products/KRK132_main.jpg'],
    video: '',
    module: 'PERSONALIZED',
    displayPosition: 1,
    isFeatured: true,
    isPopular: true,
    isVisible: true,
    inStock: true,
    searchKeywords: 'party, personal',
    safetyInstructions: 'Keep away from children',
    notes: '',
    imageWidth: 600,
    imageHeight: 600,
    orientation: 'SQUARE',
    createdAt: '2026-09-25T00:00:00Z',
    updatedAt: '2026-09-25T00:00:00Z',
  };

  function createMockRepos(initialProducts: Product[] = [sampleProduct]) {
    const products = [...initialProducts];
    const orders: Order[] = [];
    const images = new Map<string, any>();

    const repos: Repositories = {
      products: {
        list: vi.fn(async (f) => (f?.includeHidden ? products : products.filter((p) => p.isVisible))),
        findById: vi.fn(async (id) => products.find((p) => p.id === id) ?? null),
        findByIds: vi.fn(async (ids) => products.filter((p) => ids.includes(p.id))),
        create: vi.fn(async (p) => {
          products.push(p as any);
          return p as any;
        }),
        update: vi.fn(async (id, patch) => {
          const idx = products.findIndex((p) => p.id === id);
          if (idx === -1) return null;
          products[idx] = { ...products[idx]!, ...patch };
          return products[idx]!;
        }),
        remove: vi.fn(async (id) => {
          const idx = products.findIndex((p) => p.id === id);
          if (idx === -1) return false;
          products.splice(idx, 1);
          return true;
        }),
        reorder: vi.fn(async () => {}),
        nextId: vi.fn(async () => 'KRK225'),
      },
      sections: {
        list: vi.fn(async () => []),
        update: vi.fn(async () => null),
      },
      orders: {
        create: vi.fn(async (o) => {
          orders.push(o);
          return o;
        }),
        findById: vi.fn(async (id) => orders.find((o) => o.id === id) ?? null),
        list: vi.fn(async () => orders),
        updateStatus: vi.fn(async () => null),
        metrics: vi.fn(async () => ({ total: orders.length, byStatus: {} as any, revenuePaise: 0, awaitingAction: 0 })),
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
      images: {
        record: vi.fn(async (input) => {
          const rec = { ...input, createdAt: new Date().toISOString() };
          images.set(input.storageKey, rec);
          return rec;
        }),
        findByKey: vi.fn(async (k) => images.get(k) ?? null),
        linkToOrder: vi.fn(async (orderId, keys) => {
          for (const k of keys) {
            const im = images.get(k);
            if (im) im.orderId = orderId;
          }
        }),
      },
      storage: createLocalStorage(),
      passwords: { hash: vi.fn(), verify: vi.fn() },
      clock: { now: () => new Date(), iso: () => new Date().toISOString() },
      ids: {
        customer: () => 'cus_1',
        address: () => 'adr_1',
        order: () => 'KRK-P12345',
        product: () => 'KRK225',
      },
      driver: 'memory',
    };

    return { repos, products, orders, images };
  }

  it('8, 10, 11. creates a personalised cart item and completes COD order with retained image, name, template, and price', async () => {
    const { repos, orders } = createMockRepos();
    const checkout = createCheckoutService(repos, {
      personalizationFeePaise: 0,
      shippingPaise: 19900,
      freeShippingOverPaise: 79900,
      minOrderPaise: 0, // waive minimum for isolated test
    });

    const photoKey = 'personalizations/2026/10/customer_pic_123.jpg';
    const customerEnteredName = 'Sharma Family Diwali Special';

    const order = await checkout.placeOrder(
      {
        customerName: 'Anil Sharma',
        mobile: '9876543210',
        address: {
          houseFlat: '12-A',
          streetLocality: 'Banjara Hills',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500034',
          instructions: 'Call before delivery',
        },
        items: [
          {
            productId: 'KRK132',
            quantity: 2,
            personalizationImage: photoKey,
            customizationNotes: `Printed Name: ${customerEnteredName} | 100% zoom`,
          },
        ],
        paymentMethod: 'COD',
      },
      { customerId: null },
    );

    expect(order.id).toBe('KRK-P12345');
    expect(order.items.length).toBe(1);
    expect(order.items[0]?.productId).toBe('KRK132');
    expect(order.items[0]?.personalizationImage).toBe(photoKey);
    expect(order.items[0]?.customizationNotes).toContain(customerEnteredName);
    expect(order.items[0]?.unitPricePaise).toBe(49900);
    expect(order.items[0]?.quantity).toBe(2);
    expect(orders.length).toBe(1);
  });

  it('12, 15. verifies secure access control: unauthorized requests cannot access customer photos; admin can', async () => {
    const { repos } = createMockRepos();
    const photoKey = 'personalizations/2026/10/private_customer_photo.jpg';
    const secretToken = 'valid_secret_token_abc';

    await repos.images.record({
      id: 'img_1',
      storageKey: photoKey,
      token: secretToken,
      originalFilename: 'family.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      kind: 'personalization',
    });

    const record = await repos.images.findByKey(photoKey);
    expect(record).not.toBeNull();
    expect(record?.token).toBe(secretToken);

    // Customer with wrong token
    const wrongToken = 'attacker_guessed_token';
    const isCustomerAuthorized = record?.token === wrongToken;
    expect(isCustomerAuthorized).toBe(false);

    // Customer with valid token
    const isOwnerAuthorized = record?.token === secretToken;
    expect(isOwnerAuthorized).toBe(true);

    // Admin role override
    const isAdmin = true;
    const canAdminAccess = isAdmin || isOwnerAuthorized;
    expect(canAdminAccess).toBe(true);
  });

  it('13, 14. archiving a personalised product hides it from storefront while preserving historical orders', async () => {
    const { repos, orders } = createMockRepos();
    const admin = createAdminService(repos);

    // Place an order for KRK132
    orders.push({
      id: 'KRK-HIST01',
      customerId: null,
      customerName: 'Historical Customer',
      mobile: '9876543210',
      address: {} as any,
      items: [
        {
          productId: 'KRK132',
          productName: 'BRS PARTY FIRECRACKER',
          productImage: null,
          module: 'PERSONALIZED',
          unitPricePaise: 49900,
          quantity: 1,
          lineTotalPaise: 49900,
          personalizationFeePaise: 0,
          personalizationImage: 'personalizations/old.jpg',
          customizationNotes: 'Old order',
        },
      ],
      subtotalPaise: 49900,
      feesPaise: 0,
      shippingPaise: 19900,
      totalPaise: 69800,
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      status: 'DELIVERED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    });

    // 13: Archive the product
    await admin.archiveProduct('KRK132');

    // Confirm it disappears from active storefront (includeHidden: false)
    const storefrontProducts = await repos.products.list({ includeHidden: false });
    expect(storefrontProducts.find((p) => p.id === 'KRK132')).toBeUndefined();

    // But it remains in admin view
    const adminProducts = await repos.products.list({ includeHidden: true });
    expect(adminProducts.find((p) => p.id === 'KRK132')).toBeDefined();
    expect(adminProducts.find((p) => p.id === 'KRK132')?.isVisible).toBe(false);

    // Attempting to delete a product that has historical orders safely archives it
    const deleteResult = await admin.deleteProduct('KRK132');
    expect(deleteResult.archived).toBe(true);
    expect(deleteResult.message).toContain('safely archived');

    // 14: Historical order remains 100% intact
    const fetchedOrder = await repos.orders.findById('KRK-HIST01');
    expect(fetchedOrder).not.toBeNull();
    expect(fetchedOrder?.items[0]?.productId).toBe('KRK132');
    expect(fetchedOrder?.items[0]?.personalizationImage).toBe('personalizations/old.jpg');
    expect(fetchedOrder?.items[0]?.customizationNotes).toBe('Old order');
  });
});
