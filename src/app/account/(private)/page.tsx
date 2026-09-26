import Link from 'next/link';
import { getAppServices } from '@/infra/db';
import { requireCustomerPage } from '@/infra/auth/guards';
import { formatINR } from '@/core/domain/money';
import { ORDER_STATUS_LABELS } from '@/core/domain/order';
import { Badge } from '@/ui/badge';
import { EmptyState } from '@/ui/empty-state';

export default async function AccountOverviewPage() {
  const session = await requireCustomerPage();
  const services = await getAppServices();

  const [orders, addresses, wishlist] = await Promise.all([
    services.orders.listForCustomer(session.sub),
    services.accounts.listAddresses(session.sub),
    services.accounts.wishlist(session.sub),
  ]);

  const delivered = orders.filter((order) => order.status === 'DELIVERED');
  const active = orders.filter((order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED');
  const lifetimePaise = delivered.reduce((total, order) => total + order.totalPaise, 0);
  const latest = orders.slice(0, 3);

  return (
    <div className="space-y-8">
      <dl className="grid gap-px overflow-hidden rounded-sm border border-hairline bg-hairline sm:grid-cols-3">
        {[
          { label: 'Orders placed', value: orders.length },
          { label: 'Active now', value: active.length },
          { label: 'Lifetime value', value: formatINR(lifetimePaise) },
        ].map((stat) => (
          <div key={stat.label} className="bg-void p-5">
            <dt className="label">{stat.label}</dt>
            <dd className="numeric mt-1 text-2xl font-bold text-fg">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-fg">
            Recent orders
          </h2>
          <Link
            href="/account/orders"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-dim transition-colors hover:text-ember"
          >
            View all →
          </Link>
        </div>

        {latest.length === 0 ? (
          <EmptyState
            title="No orders yet"
            message="When you place an order it will appear here with its live status."
            actionLabel="Browse the catalogue"
            actionHref="/"
          />
        ) : (
          <ul className="divide-y divide-hairline rounded-sm border border-hairline">
            {latest.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/order/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-panel"
                >
                  <div>
                    <span className="numeric text-sm font-bold text-fg">{order.id}</span>
                    <p className="numeric mt-1 text-[11px] text-fg-dim">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })} ·{' '}
                      {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={order.status === 'CANCELLED' ? 'danger' : 'ember'}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                    <span className="numeric text-sm font-bold text-fg">
                      {formatINR(order.totalPaise)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/account/addresses" className="surface rounded-sm p-5 transition-colors hover:bg-panel-raised">
          <p className="label">Saved addresses</p>
          <p className="numeric mt-2 text-2xl font-bold text-fg">{addresses.length}</p>
        </Link>
        <Link href="/account/wishlist" className="surface rounded-sm p-5 transition-colors hover:bg-panel-raised">
          <p className="label">Wishlist</p>
          <p className="numeric mt-2 text-2xl font-bold text-fg">{wishlist.length}</p>
        </Link>
      </div>
    </div>
  );
}
