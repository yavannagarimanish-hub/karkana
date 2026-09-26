import type { Product, ProductModule } from './product';
import { isPurchasable, primaryImage, pricePaise, requiresPersonalization } from './product';
import { sumPaise } from './money';

/**
 * The single place an order total is ever computed.
 *
 * The client sends **product ids and quantities only**. Prices are read from
 * the catalogue here, on the server, so a tampered request body cannot change
 * what the customer is charged. (v1 trusted a client-supplied `totalAmount`.)
 */

export type PricingErrorCode =
  | 'UNKNOWN_PRODUCT'
  | 'PRODUCT_HIDDEN'
  | 'PRODUCT_OUT_OF_STOCK'
  | 'INVALID_QUANTITY'
  | 'MISSING_PERSONALIZATION';

export class PricingError extends Error {
  readonly code: PricingErrorCode;
  readonly productId?: string;

  constructor(code: PricingErrorCode, message: string, productId?: string) {
    super(message);
    this.name = 'PricingError';
    this.code = code;
    this.productId = productId;
  }
}

/** Hard cap so a single line cannot be used to exhaust stock or abuse COD. */
export const MAX_LINE_QUANTITY = 99;

export interface CartLineInput {
  productId: string;
  quantity: number;
  /** Customer upload for PERSONALIZED boxes. */
  personalizationImage?: string | null;
  /** Free-text printing instructions for PERSONALIZED boxes. */
  customizationNotes?: string | null;
}

export interface PricedOrderLine {
  productId: string;
  productName: string;
  productImage: string | null;
  module: ProductModule;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  personalizationFeePaise: number;
  personalizationImage: string | null;
  customizationNotes: string | null;
}

export interface OrderTotals {
  lines: PricedOrderLine[];
  /** Product value only, excluding fees and shipping. */
  subtotalPaise: number;
  /** Sum of personalization fees. */
  feesPaise: number;
  shippingPaise: number;
  totalPaise: number;
  /** Sum of quantities. */
  itemCount: number;
}

export interface PricingPolicy {
  /** Charged once per personalized line. `0` preserves the v1 behaviour. */
  personalizationFeePaise: number;
  shippingPaise: number;
  /** Subtotal at or above which shipping is waived. `null` = never waived. */
  freeShippingOverPaise: number | null;
}

export const DEFAULT_PRICING_POLICY: PricingPolicy = {
  personalizationFeePaise: 0,
  shippingPaise: 0,
  freeShippingOverPaise: null,
};

function lineKey(line: CartLineInput): string {
  return `${line.productId}::${line.personalizationImage ?? ''}::${line.customizationNotes ?? ''}`;
}

/**
 * Merge duplicate lines (same product *and* same personalization) so a
 * double-tapped "add to cart" cannot produce two rows for one intent.
 */
export function mergeCartLines(lines: readonly CartLineInput[]): CartLineInput[] {
  const merged = new Map<string, CartLineInput>();
  for (const line of lines) {
    const key = lineKey(line);
    const existing = merged.get(key);
    if (existing) {
      merged.set(key, { ...existing, quantity: existing.quantity + line.quantity });
    } else {
      merged.set(key, { ...line });
    }
  }
  return [...merged.values()];
}

export function priceOrder(
  catalogue: readonly Product[],
  lines: readonly CartLineInput[],
  policy: PricingPolicy = DEFAULT_PRICING_POLICY,
): OrderTotals {
  const byId = new Map(catalogue.map((product) => [product.id, product]));
  const priced: PricedOrderLine[] = [];

  for (const line of mergeCartLines(lines)) {
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
      throw new PricingError(
        'INVALID_QUANTITY',
        `Quantity must be a whole number between 1 and ${MAX_LINE_QUANTITY}.`,
        line.productId,
      );
    }

    const product = byId.get(line.productId);
    if (!product) {
      throw new PricingError('UNKNOWN_PRODUCT', `Unknown product "${line.productId}".`, line.productId);
    }
    if (!product.isVisible) {
      throw new PricingError('PRODUCT_HIDDEN', `"${product.name}" is not available for purchase.`, product.id);
    }
    if (!isPurchasable(product)) {
      throw new PricingError('PRODUCT_OUT_OF_STOCK', `"${product.name}" is out of stock.`, product.id);
    }

    const personalizationImage = line.personalizationImage?.trim() || null;
    if (requiresPersonalization(product.module) && !personalizationImage) {
      throw new PricingError(
        'MISSING_PERSONALIZATION',
        `"${product.name}" needs a photograph before it can be ordered.`,
        product.id,
      );
    }

    const unitPricePaise = pricePaise(product);
    const personalizationFeePaise =
      product.module === 'PERSONALIZED' && personalizationImage ? policy.personalizationFeePaise : 0;

    priced.push({
      productId: product.id,
      productName: product.name,
      productImage: primaryImage(product),
      module: product.module,
      unitPricePaise,
      quantity,
      lineTotalPaise: unitPricePaise * quantity + personalizationFeePaise,
      personalizationFeePaise,
      personalizationImage,
      customizationNotes: line.customizationNotes?.trim() || null,
    });
  }

  if (priced.length === 0) {
    throw new PricingError('INVALID_QUANTITY', 'An order needs at least one item.');
  }

  const subtotalPaise = sumPaise(priced.map((line) => line.unitPricePaise * line.quantity));
  const feesPaise = sumPaise(priced.map((line) => line.personalizationFeePaise));
  const shippingPaise =
    policy.freeShippingOverPaise !== null && subtotalPaise >= policy.freeShippingOverPaise
      ? 0
      : policy.shippingPaise;

  return {
    lines: priced,
    subtotalPaise,
    feesPaise,
    shippingPaise,
    totalPaise: subtotalPaise + feesPaise + shippingPaise,
    itemCount: sumPaise(priced.map((line) => line.quantity)),
  };
}

/**
 * Quote used by the cart/checkout UI so the customer sees exactly what the
 * server will charge. Unknown or unavailable lines are dropped rather than
 * throwing, because a stale cart is a normal state, not an error.
 */
export function quoteCart(
  catalogue: readonly Product[],
  lines: readonly CartLineInput[],
  policy: PricingPolicy = DEFAULT_PRICING_POLICY,
): { totals: OrderTotals; unavailable: { productId: string; reason: string }[] } {
  const byId = new Map(catalogue.map((product) => [product.id, product]));
  const valid: CartLineInput[] = [];
  const unavailable: { productId: string; reason: string }[] = [];

  for (const line of mergeCartLines(lines)) {
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
      unavailable.push({ productId: line.productId, reason: 'INVALID_QUANTITY' });
      continue;
    }
    const product = byId.get(line.productId);
    if (!product) {
      unavailable.push({ productId: line.productId, reason: 'UNKNOWN_PRODUCT' });
      continue;
    }
    if (!product.isVisible) {
      unavailable.push({ productId: line.productId, reason: 'PRODUCT_HIDDEN' });
      continue;
    }
    if (!isPurchasable(product)) {
      unavailable.push({ productId: line.productId, reason: 'PRODUCT_OUT_OF_STOCK' });
      continue;
    }
    valid.push(line);
  }

  const totals =
    valid.length === 0
      ? {
          lines: [],
          subtotalPaise: 0,
          feesPaise: 0,
          shippingPaise: 0,
          totalPaise: 0,
          itemCount: 0,
        }
      : priceOrder(catalogue, valid, policy);

  return { totals, unavailable };
}
