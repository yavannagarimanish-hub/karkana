import { createOrder, type Order } from '../domain/order';
import { formatINR } from '../domain/money';
import {
  DEFAULT_PRICING_POLICY,
  minimumOrderShortfallPaise,
  priceOrder,
  quoteCart,
  type CartLineInput,
  type OrderTotals,
  type PricingPolicy,
} from '../domain/pricing';
import type { PlaceOrderInput } from '../schemas/order';
import type { Repositories } from '../ports';

export interface CartQuote {
  totals: OrderTotals;
  /** Cart lines the server will not accept, with a machine-readable reason. */
  unavailable: { productId: string; reason: string }[];
  /** The configured minimum merchandise value, in paise (0 = none). */
  minimumPaise: number;
  /** How far the current subtotal falls short of the minimum, in paise. */
  shortfallPaise: number;
}

export interface PlaceOrderContext {
  customerId: string | null;
}

export class CheckoutError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly productId?: string,
  ) {
    super(message);
    this.name = 'CheckoutError';
  }
}

/**
 * Checkout is the one flow where the server must not trust the client:
 * only product ids and quantities come in, prices are re-read here.
 */
export function createCheckoutService(
  repos: Repositories,
  policy: PricingPolicy = DEFAULT_PRICING_POLICY,
) {
  async function quote(lines: readonly CartLineInput[]): Promise<CartQuote> {
    const ids = [...new Set(lines.map((line) => line.productId))];
    if (ids.length === 0) {
      return {
        totals: {
          lines: [],
          subtotalPaise: 0,
          feesPaise: 0,
          shippingPaise: 0,
          totalPaise: 0,
          itemCount: 0,
        },
        unavailable: [],
        minimumPaise: policy.minOrderPaise ?? 0,
        shortfallPaise: policy.minOrderPaise ?? 0,
      };
    }

    const products = await repos.products.findByIds(ids);
    const cartQuote = quoteCart(products, lines, policy);
    return {
      ...cartQuote,
      minimumPaise: policy.minOrderPaise ?? 0,
      shortfallPaise: minimumOrderShortfallPaise(cartQuote.totals.subtotalPaise, policy),
    };
  }

  async function placeOrder(input: PlaceOrderInput, context: PlaceOrderContext): Promise<Order> {
    const ids = [...new Set(input.items.map((line) => line.productId))];
    const products = await repos.products.findByIds(ids);

    // Throws PricingError with a machine-readable code on any problem.
    const totals = priceOrder(products, input.items, policy);

    /*
     * The minimum order value is enforced here, on the server-recomputed
     * subtotal, so a client can never place an order below it by tampering with
     * the request. The UI gates the CTA on the same rule, but this is the
     * authoritative check.
     */
    const shortfall = minimumOrderShortfallPaise(totals.subtotalPaise, policy);
    if (shortfall > 0) {
      throw new CheckoutError(
        'MIN_ORDER',
        `Orders start at ${formatINR(policy.minOrderPaise ?? 0)}. ` +
          `Add ${formatINR(shortfall)} more to place this order.`,
      );
    }

    const order = createOrder({
      id: repos.ids.order(),
      customerId: context.customerId,
      customerName: input.customerName,
      mobile: input.mobile,
      address: input.address,
      items: totals.lines.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        productImage: line.productImage,
        module: line.module,
        unitPricePaise: line.unitPricePaise,
        quantity: line.quantity,
        lineTotalPaise: line.lineTotalPaise,
        personalizationFeePaise: line.personalizationFeePaise,
        personalizationImage: line.personalizationImage,
        customizationNotes: line.customizationNotes,
      })),
      subtotalPaise: totals.subtotalPaise,
      feesPaise: totals.feesPaise,
      shippingPaise: totals.shippingPaise,
      totalPaise: totals.totalPaise,
      paymentMethod: input.paymentMethod,
      now: repos.clock.now(),
    });

    return repos.orders.create(order);
  }

  return { quote, placeOrder, policy };
}

export type CheckoutService = ReturnType<typeof createCheckoutService>;
