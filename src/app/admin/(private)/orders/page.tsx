import Link from 'next/link';
import { requireAdminPage } from '@/infra/auth/guards';
import { getAppServices } from '@/infra/db';
import { formatINR } from '@/core/domain/money';
import { ORDER_STATUS_LABELS, ORDER_STATUSES, type OrderStatus } from '@/core/domain/order';
import { Badge } from '@/ui/badge';
import { EmptyState } from '@/ui/empty-state';
import { Table, TD, TDNumber, TH, THead, TR } from '@/ui/table';
import { OrderStatusControl } from '@/features/admin/order-status-control';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function statusTone(status: OrderStatus) {
  if (status === 'CANCELLED') return 'danger' as const;
  if (status === 'DELIVERED') return 'ok' as const;
  if (status === 'NEW') return 'warn' as const;
  return 'ember' as const;
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  await requireAdminPage();
  const services = await getAppServices();

  const sp = await searchParams;
  const statusParam = typeof sp.status === 'string' ? sp.status.toUpperCase() : '';
  const status = (ORDER_STATUSES as readonly string[]).includes(statusParam)
    ? (statusParam as OrderStatus)
    : undefined;

  const orders = await services.orders.list({ status });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-extrabold tracking-[0.02em] uppercase sm:text-3xl">Orders</h1>
        <p className="numeric mt-2 text-sm text-fg-muted">{orders.length} orders in view</p>
      </header>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        <Link
          href="/admin/orders"
          className={`rounded-sm px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
            !status ? 'bg-ember text-fg' : 'text-fg-muted shadow-hairline-strong hover:text-fg'
          }`}
        >
          All
        </Link>
        {ORDER_STATUSES.map((entry) => (
          <Link
            key={entry}
            href={`/admin/orders?status=${entry}`}
            className={`rounded-sm px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
              status === entry ? 'bg-ember text-fg' : 'text-fg-muted shadow-hairline-strong hover:text-fg'
            }`}
          >
            {ORDER_STATUS_LABELS[entry]}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders here"
          message="Orders placed on the storefront appear here immediately."
          actionLabel="Back to dashboard"
          actionHref="/admin"
        />
      ) : (
        <div className="surface overflow-hidden rounded-sm">
          <Table>
            <THead>
              <TR>
                <TH>Order</TH>
                <TH>Customer</TH>
                <TH>Status</TH>
                <TH className="text-right">Total</TH>
                <TH className="text-right">Next step</TH>
              </TR>
            </THead>
            <tbody>
              {orders.map((order) => (
                <TR key={order.id}>
                  <TD>
                    <Link
                      href={`/order/${order.id}`}
                      className="numeric text-sm font-bold text-fg transition-colors hover:text-ember"
                    >
                      {order.id}
                    </Link>
                    <p className="numeric mt-1 text-[11px] text-fg-dim">
                      {new Date(order.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                    <p className="mt-1 text-[11px] text-fg-dim">
                      {order.items.length} {order.items.length === 1 ? 'item' : 'items'} ·{' '}
                      {order.customerId ? 'account' : 'guest'}
                    </p>
                  </TD>
                  <TD>
                    <p className="text-sm text-fg">{order.customerName}</p>
                    <p className="numeric text-[11px] text-fg-dim">{order.mobile}</p>
                    <p className="mt-1 text-[11px] text-fg-dim">
                      {order.address.city}, {order.address.state}{' '}
                      <span className="numeric">{order.address.pincode}</span>
                    </p>
                  </TD>
                  <TD>
                    <Badge tone={statusTone(order.status)}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                    <p className="mt-1 text-[11px] text-fg-dim">{order.paymentStatus.toLowerCase()}</p>
                  </TD>
                  <TDNumber>
                    <span className="numeric text-sm font-bold">{formatINR(order.totalPaise)}</span>
                  </TDNumber>
                  <TD>
                    <OrderStatusControl orderId={order.id} status={order.status} />
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
