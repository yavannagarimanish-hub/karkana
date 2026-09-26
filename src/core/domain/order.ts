import type { ProductModule } from './product';
import { sumPaise } from './money';

/* ── Status machine ─────────────────────────────────────────────────────── */

export const ORDER_STATUSES = [
  'NEW',
  'CONFIRMED',
  'PREPARING',
  'DISPATCHED',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Order received',
  CONFIRMED: 'Confirmed',
  PREPARING: 'In production',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

/** The happy path a customer sees on the tracking timeline. */
export const ORDER_TIMELINE: OrderStatus[] = ['NEW', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'DELIVERED'];

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function allowedTransitions(from: OrderStatus): readonly OrderStatus[] {
  return ORDER_TRANSITIONS[from];
}

export function isTerminal(status: OrderStatus): boolean {
  return ORDER_TRANSITIONS[status].length === 0;
}

export class IllegalOrderTransitionError extends Error {
  constructor(
    readonly from: OrderStatus,
    readonly to: OrderStatus,
  ) {
    super(`Cannot move an order from ${from} to ${to}.`);
    this.name = 'IllegalOrderTransitionError';
  }
}

/* ── Payment ────────────────────────────────────────────────────────────── */

export const PAYMENT_METHODS = ['COD'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** COD is only considered collected once the parcel is delivered. */
export function paymentStatusFor(method: PaymentMethod, status: OrderStatus): PaymentStatus {
  if (method !== 'COD') return 'PENDING';
  if (status === 'CANCELLED') return 'REFUNDED';
  return status === 'DELIVERED' ? 'PAID' : 'PENDING';
}

/* ── Entities ───────────────────────────────────────────────────────────── */

export interface OrderAddress {
  houseFlat: string;
  streetLocality: string;
  city: string;
  state: string;
  pincode: string;
  instructions: string;
}

export interface OrderItem {
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

export interface Order {
  id: string;
  customerId: string | null;
  customerName: string;
  mobile: string;
  address: OrderAddress;
  items: OrderItem[];
  subtotalPaise: number;
  feesPaise: number;
  shippingPaise: number;
  totalPaise: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrderDraft {
  customerId?: string | null;
  customerName: string;
  mobile: string;
  address: OrderAddress;
  items: OrderItem[];
  subtotalPaise: number;
  feesPaise: number;
  shippingPaise: number;
  totalPaise: number;
  paymentMethod: PaymentMethod;
  id?: string;
  now?: Date;
  random?: () => number;
}

const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** `KRK-7F3K9Q` — unambiguous characters only, so it can be read over a phone call. */
export function generateOrderId(random: () => number = Math.random): string {
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += ID_ALPHABET[Math.floor(random() * ID_ALPHABET.length) % ID_ALPHABET.length];
  }
  return `KRK-${suffix}`;
}

export function createOrder(draft: OrderDraft): Order {
  const now = (draft.now ?? new Date()).toISOString();
  const totalPaise = sumPaise([draft.subtotalPaise, draft.feesPaise, draft.shippingPaise]);

  return {
    id: draft.id ?? generateOrderId(draft.random),
    customerId: draft.customerId ?? null,
    customerName: draft.customerName,
    mobile: draft.mobile,
    address: draft.address,
    items: draft.items,
    subtotalPaise: draft.subtotalPaise,
    feesPaise: draft.feesPaise,
    shippingPaise: draft.shippingPaise,
    totalPaise,
    paymentMethod: draft.paymentMethod,
    paymentStatus: paymentStatusFor(draft.paymentMethod, 'NEW'),
    status: 'NEW',
    createdAt: now,
    updatedAt: now,
  };
}

export interface TimelineStep {
  status: OrderStatus;
  label: string;
  state: 'complete' | 'current' | 'upcoming' | 'cancelled';
}

/** Drives the customer-facing order tracking timeline. */
export function orderTimeline(order: Order): TimelineStep[] {
  if (order.status === 'CANCELLED') {
    return ORDER_TIMELINE.map((status) => ({
      status,
      label: ORDER_STATUS_LABELS[status],
      state: 'cancelled' as const,
    }));
  }

  const currentIndex = ORDER_TIMELINE.indexOf(order.status);
  return ORDER_TIMELINE.map((status, index) => ({
    status,
    label: ORDER_STATUS_LABELS[status],
    state:
      index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming',
  }));
}

/** `+919876543210` → `9876543210`; returns `null` when no 10-digit number is present. */
export function normalizeIndianMobile(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 10) return /^[6-9]/.test(digits) ? digits : null;
  return null;
}
