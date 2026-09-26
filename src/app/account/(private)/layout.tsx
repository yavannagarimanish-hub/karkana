import type { Metadata } from 'next';
import Link from 'next/link';
import { getAppServices } from '@/infra/db';
import { requireCustomerPage } from '@/infra/auth/guards';
import { SignOutButton } from '@/features/account/sign-out-button';

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};


const NAV = [
  { href: '/account', label: 'Overview' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/wishlist', label: 'Wishlist' },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await requireCustomerPage();
  const services = await getAppServices();
  const customer = await services.repos.customers.findById(session.sub);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:px-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label">Your account</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-[0.02em] uppercase sm:text-3xl">
            {customer?.name ?? 'Account'}
          </h1>
          <p className="numeric mt-1 text-xs text-fg-dim">{customer?.email}</p>
        </div>
        <SignOutButton />
      </header>

      <nav aria-label="Account" className="mt-8 flex gap-6 overflow-x-auto border-b border-hairline">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="-mb-px shrink-0 border-b-2 border-transparent py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-dim transition-colors hover:text-fg"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">{children}</div>
    </div>
  );
}
