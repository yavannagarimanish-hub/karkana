import Link from 'next/link';
import { requireAdminPage } from '@/infra/auth/guards';
import { getAppServices } from '@/infra/db';
import { formatINR } from '@/core/domain/money';
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from '@/core/domain/order';
import { Badge } from '@/ui/badge';
import { Card, CardHeader } from '@/ui/card';

export default async function AdminDashboardPage() {
  await requireAdminPage();
  const services = await getAppServices();
  const dashboard = await services.admin.dashboard();

  const stats = [
    { label: 'Products', value: dashboard.products.total, hint: `${dashboard.visibleProducts} visible` },
    { label: 'Hidden', value: dashboard.hiddenProducts, hint: 'not on the storefront' },
    { label: 'Out of stock', value: dashboard.outOfStock, hint: 'flagged unavailable' },
    { label: 'Orders', value: dashboard.orders.total, hint: `${dashboard.orders.awaitingAction} to action` },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[0.02em] uppercase sm:text-3xl">Dashboard</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Live state of the catalogue and order book, read from the{' '}
            <span className="font-mono text-fg">{dashboard.driver}</span> adapter.
          </p>
        </div>
        <Badge tone={dashboard.driver === 'postgres' ? 'ok' : 'warn'}>
          {dashboard.driver === 'postgres' ? 'Production database' : 'Development JSON store'}
        </Badge>
      </header>

      <dl className="grid gap-px overflow-hidden rounded-sm border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-void p-5">
            <dt className="label">{stat.label}</dt>
            <dd className="numeric mt-1 text-3xl font-bold text-fg">{stat.value}</dd>
            <p className="mt-1 text-[11px] text-fg-dim">{stat.hint}</p>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Order pipeline" subtitle="Counts by status" />
          <ul className="divide-y divide-hairline">
            {ORDER_STATUSES.map((status) => {
              const count = dashboard.orders.byStatus[status];
              const share =
                dashboard.orders.total === 0 ? 0 : Math.round((count / dashboard.orders.total) * 100);

              return (
                <li key={status} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-28 shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-muted">
                    {ORDER_STATUS_LABELS[status]}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-raised">
                    <span
                      className="block h-full bg-ember transition-[width] duration-300"
                      style={{ width: `${share}%` }}
                    />
                  </span>
                  <span className="numeric w-8 shrink-0 text-right text-sm text-fg">{count}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between border-t border-hairline px-5 py-3">
            <span className="label">Revenue (excl. cancelled)</span>
            <span className="numeric text-sm font-bold text-fg">
              {formatINR(dashboard.orders.revenuePaise)}
            </span>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Catalogue health"
            subtitle={`${Math.round(dashboard.validation.completeness * 100)}% of products carry no errors or warnings`}
            action={
              <Link
                href="/admin/validation"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-dim transition-colors hover:text-ember"
              >
                Open →
              </Link>
            }
          />
          <ul className="divide-y divide-hairline">
            {dashboard.validation.coverage.map((row) => (
              <li key={row.field} className="flex items-center gap-4 px-5 py-3">
                <span className="w-40 shrink-0 text-sm text-fg-muted">{row.label}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-raised">
                  <span
                    className={`block h-full transition-[width] duration-300 ${
                      row.percent >= 90 ? 'bg-status-ok' : row.percent >= 50 ? 'bg-status-warn' : 'bg-status-danger'
                    }`}
                    style={{ width: `${row.percent}%` }}
                  />
                </span>
                <span className="numeric w-10 shrink-0 text-right text-xs text-fg-dim">{row.percent}%</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 border-t border-hairline px-5 py-3 text-[11px]">
            <Badge tone="danger">{dashboard.validation.bySeverity.ERROR} errors</Badge>
            <Badge tone="warn">{dashboard.validation.bySeverity.WARNING} warnings</Badge>
            <Badge tone="neutral">{dashboard.validation.bySeverity.INCOMPLETE} optional gaps</Badge>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Modules" subtitle="Visible products per module" />
        <ul className="grid gap-px bg-hairline sm:grid-cols-3">
          {(['BASIC', 'CUSTOMIZED', 'PERSONALIZED'] as const).map((module) => (
            <li key={module} className="bg-void p-5">
              <Link href={`/module/${module.toLowerCase()}`} className="group">
                <p className="label">{module}</p>
                <p className="numeric mt-1 text-2xl font-bold text-fg group-hover:text-ember">
                  {dashboard.products.byModule[module]}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Pricing policy" subtitle="From the deployment environment" />
        <dl className="grid gap-px bg-hairline sm:grid-cols-3">
          {[
            { label: 'Personalization fee', value: formatINR(dashboard.policy.personalizationFeePaise) },
            { label: 'Shipping', value: formatINR(dashboard.policy.shippingPaise) },
            {
              label: 'Free shipping over',
              value:
                dashboard.policy.freeShippingOverPaise === null
                  ? 'Never'
                  : formatINR(dashboard.policy.freeShippingOverPaise),
            },
          ].map((row) => (
            <div key={row.label} className="bg-void p-5">
              <dt className="label">{row.label}</dt>
              <dd className="numeric mt-1 text-lg font-bold text-fg">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
