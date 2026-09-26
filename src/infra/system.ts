import { randomUUID } from 'node:crypto';
import type { Clock, IdGenerator } from '@/core/ports';
import { generateOrderId } from '@/core/domain/order';

export const systemClock: Clock = {
  now: () => new Date(),
  iso: () => new Date().toISOString(),
};

/** Injectable clock for tests. */
export function fixedClock(now: Date | string): Clock {
  const fixed = new Date(now);
  return { now: () => new Date(fixed.getTime()), iso: () => fixed.toISOString() };
}

export const systemIds: IdGenerator = {
  customer: () => `cus_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
  address: () => `adr_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
  order: () => generateOrderId(),
  product: () => 'KRK000',
};
