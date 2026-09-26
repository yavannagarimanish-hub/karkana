import Link from 'next/link';
import { getAppServices } from '@/infra/db';
import { requireCustomerPage } from '@/infra/auth/guards';
import { formatINR } from '@/core/domain/money';
import { ORDER_STATUS_LABELS } from '@/core/domain/order';
import { Badge } from '@/ui/badge';
import { EmptyState } from '@/ui/empty-state';

export default async function AccountOrdersPage() {
  const session = await requireCustomerPage();
  const services = await getAppServices();
  const orders = await services.orders.listForCustomer(session.sub);

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        message="Your order history will appear here as soon as you place your first order."
        actionLabel="Browse the catalogue"
        actionHref="/"
      />
    );
  }

  return (
    <ul className="divide-y divide-hairline rounded-sm border border-hairline">
      {orders.map((order) => (
        <li key={order.id}>
          <Link href={`/order/${order.id}`} className="block p-5 transition-colors hover:bg-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="numeric text-base font-bold text-fg">{order.id}</span>
                <p className="numeric mt-1 text-[11px] text-fg-dim">
                  {new Date(order.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>

              <div className="text-right">
                <Badge tone={order.status === 'CANCELLED' ? 'danger' : order.status === 'DELIVERED' ? 'ok' : 'ember'}>
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
                <p className="numeric mt-2 text-base font-bold text-fg">{formatINR(order.totalPaise)}</p>
              </div>
            </div>

            <ul className="mt-4 space-y-1 text-sm text-fg-muted">
              {order.items.slice(0, 3).map((item) => (
                <li key={item.productId} className="flex justify-between gap-3">
                  <span className="truncate">
                    {item.quantity} × {item.productName}
                  </span>
                  <span className="numeric shrink-0 text-fg-dim">{formatINR(item.lineTotalPaise)}</span>
                </li>
              ))}
              {order.items.length > 3 && (
                <li className="text-[11px] text-fg-dim">+ {order.items.length - 3} more</li>
              )}
            </ul>
          </Link>
        </li>
      ))}
    </ul>
  );
}
