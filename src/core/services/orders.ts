import {
  canTransition,
  isTerminal,
  ORDER_STATUS_LABELS,
  orderTimeline,
  type Order,
  type OrderStatus,
} from '../domain/order';
import type { OrderListFilter } from '../ports';
import type { Repositories } from '../ports';

export type OrderErrorCode = 'NOT_FOUND' | 'FORBIDDEN' | 'ILLEGAL_TRANSITION';

export class OrderError extends Error {
  constructor(
    readonly code: OrderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'OrderError';
  }
}

export type OrderViewer =
  | { role: 'guest' }
  | { role: 'customer'; customerId: string }
  | { role: 'admin' };

export function createOrdersService(repos: Repositories) {
  /**
   * Guests may read an order only by its id (the confirmation link they were
   * given). Customers may read their own. Admins may read anything.
   */
  async function getForViewer(id: string, viewer: OrderViewer): Promise<Order> {
    const order = await repos.orders.findById(id);
    if (!order) throw new OrderError('NOT_FOUND', `No order ${id} exists.`);

    if (viewer.role === 'customer' && order.customerId !== viewer.customerId) {
      throw new OrderError('FORBIDDEN', 'This order belongs to another account.');
    }

    return order;
  }

  async function listForCustomer(customerId: string): Promise<Order[]> {
    return repos.orders.list({ customerId });
  }

  async function list(filter: OrderListFilter = {}): Promise<Order[]> {
    return repos.orders.list(filter);
  }

  /** Enforces the state machine in `core/domain/order.ts`. */
  async function setStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await repos.orders.findById(id);
    if (!order) throw new OrderError('NOT_FOUND', `No order ${id} exists.`);

    if (order.status === status) return order;
    if (!canTransition(order.status, status)) {
      throw new OrderError(
        'ILLEGAL_TRANSITION',
        `An order that is ${ORDER_STATUS_LABELS[order.status]} cannot become ${ORDER_STATUS_LABELS[status]}.`,
      );
    }

    const updated = await repos.orders.updateStatus(id, status, repos.clock.now());
    if (!updated) throw new OrderError('NOT_FOUND', `No order ${id} exists.`);
    return updated;
  }

  async function metrics() {
    return repos.orders.metrics();
  }

  return {
    getForViewer,
    listForCustomer,
    list,
    setStatus,
    metrics,
    timeline: orderTimeline,
    isTerminal,
  };
}

export type OrdersService = ReturnType<typeof createOrdersService>;
