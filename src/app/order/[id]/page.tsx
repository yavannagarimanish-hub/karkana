import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAppServices } from '@/infra/db';
import { optionalCustomer, readAdminSession } from '@/infra/auth/guards';
import { SITE } from '@/infra/config';
import { formatINR } from '@/core/domain/money';
import { ORDER_STATUS_LABELS } from '@/core/domain/order';
import type { OrderViewer } from '@/core/services/orders';
import { OrderError } from '@/core/services/orders';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { cn } from '@/ui/cn';

interface Props {
  params: Promise<{ id: string }>;
}

// Order pages are private records: never indexable, never followed.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Order ${id}`,
    description: `Status and contents of ${SITE.name} order ${id}.`,
    robots: { index: false, follow: false },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function OrderPage({ params }: Props) {
  const { id } = await params;
  const services = await getAppServices();

  const [admin, customer] = await Promise.all([readAdminSession(), optionalCustomer()]);
  const viewer: OrderViewer = admin
    ? { role: 'admin' }
    : customer
      ? { role: 'customer', customerId: customer.sub }
      : { role: 'guest' };

  let order;
  try {
    order = await services.orders.getForViewer(id, viewer);
  } catch (error) {
    if (error instanceof OrderError && error.code === 'NOT_FOUND') notFound();
    throw error;
  }

  const timeline = services.orders.timeline(order);
  const address = order.address;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-8 lg:px-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="live-dot label">Order status</p>
          <h1 className="numeric mt-3 text-3xl font-extrabold tracking-[0.02em] text-fg sm:text-4xl">
            {order.id}
          </h1>
          <p className="numeric mt-2 text-xs text-fg-dim">Placed {formatDate(order.createdAt)}</p>
        </div>

        <Badge tone={order.status === 'CANCELLED' ? 'danger' : order.status === 'DELIVERED' ? 'ok' : 'ember'}>
          {ORDER_STATUS_LABELS[order.status]}
        </Badge>
      </header>

      {/* Timeline */}
      <ol className="mt-10 grid gap-px overflow-hidden rounded-sm border border-hairline bg-hairline sm:grid-cols-5">
        {timeline.map((step, index) => (
          <li
            key={step.status}
            className={cn(
              'bg-void p-4',
              step.state === 'current' && 'bg-ember-wash',
              step.state === 'cancelled' && 'opacity-50',
            )}
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  'grid size-5 place-items-center rounded-full text-[10px] font-bold',
                  step.state === 'complete' && 'bg-status-ok text-void',
                  step.state === 'current' && 'bg-ember text-fg',
                  step.state === 'upcoming' && 'bg-panel text-fg-ghost shadow-hairline',
                  step.state === 'cancelled' && 'bg-panel text-fg-ghost shadow-hairline',
                )}
              >
                {step.state === 'complete' ? '✓' : index + 1}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
                {step.label}
              </span>
            </div>
          </li>
        ))}
      </ol>

      {/* Items */}
      <section className="surface mt-8 rounded-sm">
        <h2 className="border-b border-hairline px-5 py-4 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-fg">
          Items
        </h2>
        <ul className="divide-y divide-hairline">
          {order.items.map((item) => (
            <li key={item.productId} className="flex gap-4 p-5">
              <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-sm bg-void p-2 shadow-hairline">
                {item.productImage ? (
                  <Image
                    src={item.productImage}
                    alt={item.productName}
                    width={300}
                    height={300}
                    className="max-h-full w-auto max-w-full object-contain"
                  />
                ) : (
                  <span className="label">No image</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/product/${item.productId}`}
                  className="text-sm font-semibold tracking-[0.04em] uppercase transition-colors hover:text-ember"
                >
                  {item.productName}
                </Link>
                <p className="numeric mt-1 text-[11px] text-fg-dim">
                  {item.productId} · {item.quantity} × {formatINR(item.unitPricePaise)}
                </p>
                {item.customizationNotes && (
                  <p className="mt-2 rounded-sm bg-panel-raised p-2 text-xs text-fg-muted">
                    “{item.customizationNotes}”
                  </p>
                )}
                {item.personalizationFeePaise > 0 && (
                  <p className="mt-2 text-[11px] text-ember">
                    Personalization {formatINR(item.personalizationFeePaise)}
                  </p>
                )}
              </div>

              <span className="numeric shrink-0 text-sm font-bold text-fg">
                {formatINR(item.lineTotalPaise)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="space-y-2 border-t border-hairline p-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-fg-muted">Subtotal</dt>
            <dd className="numeric">{formatINR(order.subtotalPaise)}</dd>
          </div>
          {order.feesPaise > 0 && (
            <div className="flex justify-between">
              <dt className="text-fg-muted">Personalization</dt>
              <dd className="numeric">{formatINR(order.feesPaise)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-fg-muted">Shipping</dt>
            <dd className="numeric">{order.shippingPaise === 0 ? 'Free' : formatINR(order.shippingPaise)}</dd>
          </div>
          <div className="flex justify-between border-t border-hairline pt-3 text-base font-bold">
            <dt>Total</dt>
            <dd className="numeric">{formatINR(order.totalPaise)}</dd>
          </div>
          <div className="flex justify-between pt-1 text-xs text-fg-dim">
            <dt>Payment</dt>
            <dd>
              {order.paymentMethod === 'COD' ? 'Cash on delivery' : order.paymentMethod} ·{' '}
              {order.paymentStatus.toLowerCase()}
            </dd>
          </div>
        </dl>
      </section>

      {/* Delivery */}
      <section className="surface mt-6 rounded-sm p-5">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-fg">
          Delivering to
        </h2>
        <p className="mt-3 text-sm text-fg-muted">
          <span className="block font-semibold text-fg">{order.customerName}</span>
          <span className="numeric block">{order.mobile}</span>
          <span className="mt-1 block">
            {address.houseFlat}, {address.streetLocality}, {address.city}, {address.state}{' '}
            <span className="numeric">{address.pincode}</span>
          </span>
          {address.instructions && <span className="mt-1 block text-fg-dim">{address.instructions}</span>}
        </p>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button href="/" variant="outline">
          Continue shopping
        </Button>
        {customer && (
          <Button href="/account/orders" variant="ghost">
            All your orders
          </Button>
        )}
      </div>

      <p className="mt-8 text-xs text-fg-dim">
        Questions about this order? Call{' '}
        <a href={`tel:${SITE.supportPhone}`} className="numeric text-fg-muted underline underline-offset-4">
          {SITE.supportPhone}
        </a>{' '}
        and quote <span className="numeric">{order.id}</span>.
      </p>
    </div>
  );
}
