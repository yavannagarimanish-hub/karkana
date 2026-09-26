'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { ORDER_STATUS_LABELS, ORDER_TRANSITIONS, type OrderStatus } from '@/core/domain/order';
import { Button } from '@/ui/button';

export interface OrderStatusControlProps {
  orderId: string;
  status: OrderStatus;
}

/**
 * Only legal transitions are offered — the same table the API enforces, so
 * the UI can never propose something the server would reject.
 */
export function OrderStatusControl({ orderId, status }: OrderStatusControlProps) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const next = ORDER_TRANSITIONS[status];

  if (next.length === 0) {
    return <span className="label">Closed</span>;
  }

  const move = async (to: OrderStatus) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: to }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        window.alert(payload.error ?? 'Could not update the order.');
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {next.map((target) => (
        <Button
          key={target}
          size="sm"
          variant={target === 'CANCELLED' ? 'danger' : 'outline'}
          disabled={busy}
          onClick={() => move(target)}
        >
          {ORDER_STATUS_LABELS[target]}
        </Button>
      ))}
    </div>
  );
}
