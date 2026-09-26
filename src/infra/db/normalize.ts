import type { Product, ProductModule, Orientation } from '@/core/domain/product';
import type { CatalogueSection, SectionKey } from '@/core/domain/catalogue';
import { isSectionKey } from '@/core/domain/catalogue';
import { isProductModule } from '@/core/domain/product';
import type { Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus } from '@/core/domain/order';
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '@/core/domain/order';
import type { Customer, CustomerAddress } from '@/core/domain/account';

/**
 * `data/karkana.db.json` was written by v1 with snake_case product fields and
 * string money. The dev adapter normalises it on read so the committed seed
 * file never has to be rewritten.
 */

type Raw = Record<string, unknown>;

function str(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function num(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function bool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function strArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function moduleOf(value: unknown): ProductModule {
  return isProductModule(value) ? value : 'BASIC';
}

function orientationOf(value: unknown): Orientation | null {
  const upper = str(value).toUpperCase();
  return upper === 'WIDE' || upper === 'TALL' || upper === 'SQUARE' ? upper : null;
}

function statusOf(value: unknown): OrderStatus {
  const upper = str(value).toUpperCase();
  return (ORDER_STATUSES as readonly string[]).includes(upper) ? (upper as OrderStatus) : 'NEW';
}

function paymentMethodOf(value: unknown): PaymentMethod {
  const upper = str(value).toUpperCase();
  return (PAYMENT_METHODS as readonly string[]).includes(upper) ? (upper as PaymentMethod) : 'COD';
}

function paymentStatusOf(value: unknown): PaymentStatus {
  const upper = str(value).toUpperCase();
  return (PAYMENT_STATUSES as readonly string[]).includes(upper) ? (upper as PaymentStatus) : 'PENDING';
}

/** Rupees with a `₹` prefix, e.g. `"₹ 180.00"` → `180`. */
export function parseRupees(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeProduct(raw: Raw): Product {
  const id = str(raw.id);
  const images = strArray(raw.images);
  const legacyImage = str(raw.image);
  if (images.length === 0 && legacyImage) images.push(legacyImage);

  const price = num(raw.price, 0);
  const originalPrice = numOrNull(raw.originalPrice ?? raw.original_price);

  const width = numOrNull(raw.imageWidth ?? raw.image_width);
  const height = numOrNull(raw.imageHeight ?? raw.image_height);
  const orientation = orientationOf(raw.orientation);

  return {
    id,
    name: str(raw.name),
    brand: str(raw.brand),
    category: str(raw.category),
    subcategory: str(raw.subcategory),
    description: str(raw.description),
    shortDescription: str(raw.shortDescription ?? raw.short_description),
    price,
    originalPrice,
    stockQuantity: numOrNull(raw.stockQuantity ?? raw.stock_quantity),
    unit: str(raw.unit),
    images,
    video: str(raw.video),
    module: moduleOf(raw.module),
    displayPosition: num(raw.displayPosition ?? raw.display_position, 0),
    isFeatured: bool(raw.isFeatured ?? raw.is_featured),
    isPopular: bool(raw.isPopular ?? raw.is_popular),
    isVisible: bool(raw.isVisible ?? raw.is_visible, true),
    inStock: bool(raw.inStock ?? raw.in_stock, true),
    searchKeywords: str(raw.searchKeywords ?? raw.search_keywords),
    safetyInstructions: str(raw.safetyInstructions ?? raw.safety_instructions),
    notes: str(raw.notes),
    imageWidth: width,
    imageHeight: height,
    orientation:
      orientation ??
      (width && height ? (width > height ? 'WIDE' : width < height ? 'TALL' : 'SQUARE') : null),
    createdAt: str(raw.createdAt ?? raw.created_at, new Date(0).toISOString()),
    updatedAt: str(raw.updatedAt ?? raw.updated_at, new Date(0).toISOString()),
  };
}

export function normalizeSection(raw: Raw): CatalogueSection {
  const key = str(raw.key);
  return {
    id: str(raw.id),
    key: isSectionKey(key) ? key : 'basic',
    title: str(raw.title),
    subtitle: str(raw.subtitle),
    isVisible: bool(raw.isVisible ?? raw.is_visible, true),
    displayPosition: num(raw.displayPosition ?? raw.display_position, 0),
  };
}

export function normalizeOrderItem(raw: Raw): OrderItem {
  const unitPricePaise = num(raw.unitPricePaise, 0);
  const quantity = Math.max(1, Math.trunc(num(raw.quantity, 1)));
  const feePaise = num(raw.personalizationFeePaise, 0);

  // Fall back to the legacy rupee fields when paise are absent.
  const unit =
    unitPricePaise > 0
      ? unitPricePaise
      : Math.round(num(raw.price ?? parseRupees(raw.price), 0) * 100);

  return {
    productId: str(raw.productId),
    productName: str(raw.productName),
    productImage: str(raw.productImage) || null,
    module: moduleOf(raw.module),
    unitPricePaise: unit,
    quantity,
    lineTotalPaise: num(raw.lineTotalPaise, unit * quantity + feePaise),
    personalizationFeePaise: feePaise,
    personalizationImage: str(raw.personalizationImage) || null,
    customizationNotes: str(raw.customizationNotes) || null,
  };
}

export function normalizeOrder(raw: Raw): Order {
  const address = (raw.address ?? {}) as Raw;
  const items = Array.isArray(raw.items) ? raw.items.map((item) => normalizeOrderItem(item as Raw)) : [];

  const subtotal = num(raw.subtotalPaise, items.reduce((sum, item) => sum + item.unitPricePaise * item.quantity, 0));
  const fees = num(raw.feesPaise, items.reduce((sum, item) => sum + item.personalizationFeePaise, 0));
  const shipping = num(raw.shippingPaise, 0);

  return {
    id: str(raw.id),
    customerId: typeof raw.customerId === 'string' && raw.customerId ? raw.customerId : null,
    customerName: str(raw.customerName),
    mobile: str(raw.mobile),
    address: {
      houseFlat: str(address.houseFlat),
      streetLocality: str(address.streetLocality),
      city: str(address.city),
      state: str(address.state),
      pincode: str(address.pincode),
      instructions: str(address.instructions),
    },
    items,
    subtotalPaise: subtotal,
    feesPaise: fees,
    shippingPaise: shipping,
    totalPaise: num(raw.totalPaise, subtotal + fees + shipping),
    paymentMethod: paymentMethodOf(raw.paymentMethod),
    paymentStatus: paymentStatusOf(raw.paymentStatus),
    status: statusOf(raw.status),
    createdAt: str(raw.createdAt, new Date(0).toISOString()),
    updatedAt: str(raw.updatedAt, new Date(0).toISOString()),
  };
}

export function normalizeCustomer(raw: Raw): Customer {
  return {
    id: str(raw.id),
    email: str(raw.email).toLowerCase(),
    name: str(raw.name),
    phone: str(raw.phone),
    passwordHash: str(raw.passwordHash),
    createdAt: str(raw.createdAt, new Date(0).toISOString()),
    updatedAt: str(raw.updatedAt, new Date(0).toISOString()),
    lastLoginAt: typeof raw.lastLoginAt === 'string' ? raw.lastLoginAt : null,
  };
}

export function normalizeAddress(raw: Raw): CustomerAddress {
  return {
    id: str(raw.id),
    customerId: str(raw.customerId),
    label: str(raw.label, 'Home'),
    houseFlat: str(raw.houseFlat),
    streetLocality: str(raw.streetLocality),
    city: str(raw.city),
    state: str(raw.state),
    pincode: str(raw.pincode),
    instructions: str(raw.instructions),
    isDefault: bool(raw.isDefault),
    createdAt: str(raw.createdAt, new Date(0).toISOString()),
  };
}

export interface WishlistEntry {
  customerId: string;
  productId: string;
  createdAt: string;
}

export function normalizeWishlist(raw: unknown): WishlistEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => entry as Raw)
    .filter((entry) => str(entry.customerId) && str(entry.productId))
    .map((entry) => ({
      customerId: str(entry.customerId),
      productId: str(entry.productId),
      createdAt: str(entry.createdAt, new Date(0).toISOString()),
    }));
}

export type { CatalogueSection, SectionKey };
