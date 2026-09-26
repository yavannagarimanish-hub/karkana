import { describe, expect, it } from 'vitest';
import {
  canTransition,
  createOrder,
  generateOrderId,
  isTerminal,
  normalizeIndianMobile,
  orderTimeline,
  ORDER_STATUSES,
  ORDER_TIMELINE,
  ORDER_TRANSITIONS,
  paymentStatusFor,
  type OrderItem,
} from '../order';

const item: OrderItem = {
  productId: 'KRK001',
  productName: '7 CM ELECTRIC',
  productImage: null,
  module: 'BASIC',
  unitPricePaise: 10900,
  quantity: 2,
  lineTotalPaise: 21800,
  personalizationFeePaise: 0,
  personalizationImage: null,
  customizationNotes: null,
};

const draft = {
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
  items: [item],
  subtotalPaise: 21800,
  feesPaise: 0,
  shippingPaise: 0,
  totalPaise: 21800,
  paymentMethod: 'COD' as const,
};

describe('order state machine', () => {
  it('follows the happy path', () => {
    expect(canTransition('NEW', 'CONFIRMED')).toBe(true);
    expect(canTransition('CONFIRMED', 'PREPARING')).toBe(true);
    expect(canTransition('PREPARING', 'DISPATCHED')).toBe(true);
    expect(canTransition('DISPATCHED', 'DELIVERED')).toBe(true);
  });

  it('allows cancellation until dispatch', () => {
    expect(canTransition('NEW', 'CANCELLED')).toBe(true);
    expect(canTransition('PREPARING', 'CANCELLED')).toBe(true);
    expect(canTransition('DISPATCHED', 'CANCELLED')).toBe(false);
  });

  it('forbids skipping and rewinding', () => {
    expect(canTransition('NEW', 'DELIVERED')).toBe(false);
    expect(canTransition('DELIVERED', 'NEW')).toBe(false);
  });

  it('marks DELIVERED and CANCELLED as terminal', () => {
    expect(isTerminal('DELIVERED')).toBe(true);
    expect(isTerminal('CANCELLED')).toBe(true);
    expect(isTerminal('NEW')).toBe(false);
  });

  it('has no self-transitions and no orphan targets', () => {
    for (const status of ORDER_STATUSES) {
      expect(ORDER_TRANSITIONS[status]).not.toContain(status);
      for (const target of ORDER_TRANSITIONS[status]) {
        expect(ORDER_STATUSES).toContain(target);
      }
    }
  });

  it('timeline marks steps complete, current and upcoming', () => {
    const order = { ...createOrder(draft), status: 'PREPARING' as const };
    const states = orderTimeline(order).map((step) => step.state);

    expect(states).toEqual(['complete', 'complete', 'current', 'upcoming', 'upcoming']);
    expect(ORDER_TIMELINE).toHaveLength(5);
  });

  it('timeline for a cancelled order marks everything cancelled', () => {
    const order = { ...createOrder(draft), status: 'CANCELLED' as const };
    expect(orderTimeline(order).every((step) => step.state === 'cancelled')).toBe(true);
  });
});

describe('createOrder', () => {
  it('starts as NEW with pending COD payment', () => {
    const order = createOrder({ ...draft, now: new Date('2026-09-27T10:00:00Z') });

    expect(order.status).toBe('NEW');
    expect(order.paymentStatus).toBe('PENDING');
    expect(order.totalPaise).toBe(21800);
    expect(order.createdAt).toBe('2026-09-27T10:00:00.000Z');
  });

  it('sums the total from its parts, ignoring a mismatched draft total', () => {
    const order = createOrder({ ...draft, totalPaise: 1, shippingPaise: 5000 });
    expect(order.totalPaise).toBe(26800);
  });
});

describe('payment status', () => {
  it('is only PAID once a COD order is delivered', () => {
    expect(paymentStatusFor('COD', 'DISPATCHED')).toBe('PENDING');
    expect(paymentStatusFor('COD', 'DELIVERED')).toBe('PAID');
    expect(paymentStatusFor('COD', 'CANCELLED')).toBe('REFUNDED');
  });
});

describe('generateOrderId', () => {
  it('produces KRK-XXXXXX using an unambiguous alphabet', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateOrderId()).toMatch(/^KRK-[A-Z0-9]{6}$/);
    }
  });

  it('never emits I, O, 0 or 1', () => {
    const ids = Array.from({ length: 200 }, () => generateOrderId()).join('');
    expect(ids).not.toMatch(/[IO01]/);
  });
});

describe('normalizeIndianMobile', () => {
  it('accepts the common Indian formats', () => {
    expect(normalizeIndianMobile('+91 98765 43210')).toBe('9876543210');
    expect(normalizeIndianMobile('09876543210')).toBe('9876543210');
    expect(normalizeIndianMobile('919876543210')).toBe('9876543210');
    expect(normalizeIndianMobile('98765-43210')).toBe('9876543210');
  });

  it('rejects impossible numbers', () => {
    expect(normalizeIndianMobile('12345')).toBeNull();
    expect(normalizeIndianMobile('5876543210')).toBeNull(); // Indian mobiles start 6-9
    expect(normalizeIndianMobile('')).toBeNull();
  });
});
