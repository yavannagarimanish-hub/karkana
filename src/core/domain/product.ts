import { rupeesToPaise } from './money';

/* ── Modules ────────────────────────────────────────────────────────────── */

export const PRODUCT_MODULES = ['BASIC', 'CUSTOMIZED', 'PERSONALIZED'] as const;
export type ProductModule = (typeof PRODUCT_MODULES)[number];

export const MODULE_SLUGS = {
  BASIC: 'basic',
  CUSTOMIZED: 'customized',
  PERSONALIZED: 'personalized',
} as const satisfies Record<ProductModule, string>;

export type ModuleSlug = (typeof MODULE_SLUGS)[ProductModule];

export function isProductModule(value: unknown): value is ProductModule {
  return typeof value === 'string' && (PRODUCT_MODULES as readonly string[]).includes(value);
}

export function moduleFromSlug(slug: string): ProductModule | null {
  const match = PRODUCT_MODULES.find((module) => MODULE_SLUGS[module] === slug.toLowerCase());
  return match ?? null;
}

/** Personalized boxes require a customer-supplied photograph. */
export function requiresPersonalization(module: ProductModule): boolean {
  return module === 'PERSONALIZED';
}

/* ── Media ──────────────────────────────────────────────────────────────── */

export const ORIENTATIONS = ['SQUARE', 'WIDE', 'TALL'] as const;
export type Orientation = (typeof ORIENTATIONS)[number];

/* ── Entity ─────────────────────────────────────────────────────────────── */

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  description: string;
  shortDescription: string;
  /** Rupees, as stored in the catalogue. Convert with {@link rupeesToPaise}. */
  price: number;
  /** Strike-through MRP in rupees, when it differs from {@link price}. */
  originalPrice: number | null;
  /** `null` = unbounded stock (the catalogue has no quantity for these). */
  stockQuantity: number | null;
  unit: string;
  images: string[];
  video: string;
  module: ProductModule;
  displayPosition: number;
  isFeatured: boolean;
  isPopular: boolean;
  isVisible: boolean;
  inStock: boolean;
  searchKeywords: string;
  safetyInstructions: string;
  notes: string;
  imageWidth: number | null;
  imageHeight: number | null;
  orientation: Orientation | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  id?: string;
  name: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  shortDescription?: string;
  price: number;
  originalPrice?: number | null;
  stockQuantity?: number | null;
  unit?: string;
  images?: string[];
  video?: string;
  module: ProductModule;
  displayPosition?: number;
  isFeatured?: boolean;
  isPopular?: boolean;
  isVisible?: boolean;
  inStock?: boolean;
  searchKeywords?: string;
  safetyInstructions?: string;
  notes?: string;
  imageWidth?: number | null;
  imageHeight?: number | null;
  orientation?: Orientation | null;
}

/* ── Invariants ─────────────────────────────────────────────────────────── */

/** Storefront eligibility: visible *and* in stock. */
export function isPurchasable(product: Product): boolean {
  return product.isVisible && product.inStock;
}

export function primaryImage(product: Product): string | null {
  return product.images.find((image) => image.length > 0) ?? null;
}

/** Aspect ratio for the image well, falling back to square. */
export function aspectRatio(product: Product): number {
  if (product.imageWidth && product.imageHeight && product.imageHeight > 0) {
    return product.imageWidth / product.imageHeight;
  }
  return 1;
}

export function pricePaise(product: Product): number {
  return rupeesToPaise(product.price);
}

export function mrpPaise(product: Product): number | null {
  if (product.originalPrice === null || product.originalPrice <= product.price) {
    return null;
  }
  return rupeesToPaise(product.originalPrice);
}

/** Distinct categories present in a product set, alphabetically. */
export function categoriesOf(products: readonly Product[]): string[] {
  const categories = new Set<string>();
  for (const product of products) {
    if (product.category) categories.add(product.category);
  }
  return [...categories].sort((a, b) => a.localeCompare(b));
}
