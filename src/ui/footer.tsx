import Link from 'next/link';
import { cn } from './cn';

export interface FooterProps {
  /** Live catalogue facts, injected from the server. */
  moduleCounts: { slug: string; label: string; count: number }[];
  /** Brand facts, injected from the server. `ui` never imports `infra`. */
  name: string;
  tagline: string;
  city: string;
  supportPhone: string;
  supportEmail: string;
  className?: string;
}

export function Footer({
  moduleCounts,
  name,
  tagline,
  city,
  supportPhone,
  supportEmail,
  className,
}: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className={cn('mt-20 border-t border-hairline bg-void sm:mt-32', className)}>
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8 sm:py-20 lg:px-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-5">
            <Link
              href="/"
              className="inline-block text-2xl font-extrabold tracking-[0.2em] text-fg uppercase transition-colors hover:text-ember"
            >
              {name}
            </Link>
            <p className="label mt-1">
              {tagline} &middot; {city}
            </p>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-fg-muted">
              Every product, price and section on this site is driven by the live catalogue. Cash
              on delivery, dispatched direct from the workshop.
            </p>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs">
              <a
                href={`tel:${supportPhone}`}
                className="numeric font-semibold text-fg transition-colors hover:text-ember"
              >
                {supportPhone}
              </a>
              <a
                href={`mailto:${supportEmail}`}
                className="text-fg-muted transition-colors hover:text-fg"
              >
                {supportEmail}
              </a>
            </div>
          </div>

          <nav aria-label="Modules" className="md:col-span-3">
            <p className="label">Catalogue</p>
            <ul className="mt-4 space-y-2.5">
              {moduleCounts.map((module, index) => (
                <li key={module.slug}>
                  <Link
                    href={`/module/${module.slug}`}
                    className="group flex items-baseline justify-between gap-3 text-sm text-fg-muted transition-colors hover:text-fg"
                  >
                    <span>
                      <span className="numeric mr-2 text-[10px] text-fg-ghost">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {module.label}
                    </span>
                    <span className="numeric text-[11px] text-fg-dim group-hover:text-ember">
                      {module.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Account" className="md:col-span-2">
            <p className="label">Account</p>
            <ul className="mt-4 space-y-2.5 text-sm text-fg-muted">
              <li>
                <Link href="/account" className="transition-colors hover:text-fg">
                  Your account
                </Link>
              </li>
              <li>
                <Link href="/account/orders" className="transition-colors hover:text-fg">
                  Order history
                </Link>
              </li>
              <li>
                <Link href="/cart" className="transition-colors hover:text-fg">
                  Cart
                </Link>
              </li>
              <li>
                <Link href="/search" className="transition-colors hover:text-fg">
                  Search
                </Link>
              </li>
            </ul>
          </nav>

          <div className="md:col-span-2">
            <p className="label">Help and legal</p>
            <ul className="mt-4 space-y-2.5 text-sm text-fg-muted">
              <li>
                <Link href="/privacy-policy" className="transition-colors hover:text-fg">
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition-colors hover:text-fg">
                  Terms and conditions
                </Link>
              </li>
              <li>
                <Link href="/search" className="transition-colors hover:text-fg">
                  Find a product
                </Link>
              </li>
              <li>
                <a
                  href={`tel:${supportPhone}`}
                  className="numeric transition-colors hover:text-fg"
                >
                  {supportPhone}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-hairline pt-6 text-[11px] text-fg-dim sm:flex-row sm:items-center sm:justify-between">
          <p className="numeric">
            &copy; {year} {name}. All rights reserved.
          </p>
          <p className="font-mono uppercase tracking-[0.14em]">
            18+ only &middot; Prices in INR, inclusive of taxes
          </p>
        </div>
      </div>
    </footer>
  );
}
