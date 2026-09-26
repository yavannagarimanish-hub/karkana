import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminPage } from '@/infra/auth/guards';
import { getAppServices } from '@/infra/db';
import { Badge } from '@/ui/badge';
import { AdminSignOut } from '@/features/admin/admin-sign-out';

export const metadata: Metadata = {
  title: 'Operator console',
  robots: { index: false, follow: false },
};


const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/sections', label: 'Sections' },
  { href: '/admin/validation', label: 'Validation' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage();
  const services = await getAppServices();
  const metrics = await services.orders.metrics();

  return (
    <div className="min-h-dvh bg-void">
      <header className="sticky top-0 z-40 border-b border-hairline bg-void/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-8 lg:px-12">
          <Link href="/admin" className="shrink-0">
            <span className="block text-base leading-none font-extrabold tracking-[0.2em] uppercase">
              Karkana
            </span>
            <span className="label mt-1 block text-[8px]">Control centre</span>
          </Link>

          <nav aria-label="Admin" className="ml-4 hidden items-center gap-5 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted transition-colors hover:text-fg"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Badge tone="ok" live>
              {services.repos.driver}
            </Badge>
            {metrics.awaitingAction > 0 && (
              <Badge tone="warn">{metrics.awaitingAction} to action</Badge>
            )}
            <span className="numeric hidden text-[11px] text-fg-dim sm:inline">{session.sub}</span>
            <AdminSignOut />
          </div>
        </div>

        <nav aria-label="Admin (mobile)" className="flex gap-4 overflow-x-auto border-t border-hairline px-4 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8 lg:px-12">{children}</main>
    </div>
  );
}
