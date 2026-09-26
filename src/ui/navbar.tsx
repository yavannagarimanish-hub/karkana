'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { useCart } from '@/features/cart/cart-provider';
import { cn } from './cn';

export interface NavbarProps {
  modules: { slug: string; label: string; count: number }[];
  customerName: string | null;
}

export function Navbar({ modules, customerName }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { count: itemCount, hydrated } = useCart();
  const [query, setQuery] = React.useState('');
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);

  // Close the drawer on navigation. Adjusted during render (not in an effect)
  // so a route change cannot paint a frame with a stale open drawer.
  const [previousPathname, setPreviousPathname] = React.useState(pathname);
  if (previousPathname !== pathname) {
    setPreviousPathname(pathname);
    setMenuOpen(false);
  }

  // Lock body scroll and close on Escape while the drawer is open.
  React.useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : '/search');
    setQuery('');
  };

  const isActive = (slug: string) => pathname === `/module/${slug}`;

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-void/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:h-20 sm:px-8 lg:px-12">
        <Link href="/" className="group shrink-0">
          <span className="block text-lg leading-none font-extrabold tracking-[0.2em] text-fg uppercase transition-colors group-hover:text-ember sm:text-xl">
            Karkana
          </span>
          <span className="label mt-1 block text-[8px]">Pyrotechnic atelier</span>
        </Link>

        <nav aria-label="Modules" className="ml-4 hidden items-center gap-7 lg:flex">
          {modules.map((module) => (
            <Link
              key={module.slug}
              href={`/module/${module.slug}`}
              aria-current={isActive(module.slug) ? 'page' : undefined}
              className={cn(
                'font-mono text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors',
                isActive(module.slug) ? 'text-ember' : 'text-fg-muted hover:text-fg',
              )}
            >
              {module.label}
              <span className="numeric ml-1.5 text-[9px] text-fg-ghost">{module.count}</span>
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          <form onSubmit={submitSearch} role="search" className="relative hidden sm:block">
            <label htmlFor="site-search" className="sr-only">
              Search the catalogue
            </label>
            <input
              id="site-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="h-9 w-36 rounded-sm bg-panel pr-8 pl-3 font-mono text-[11px] uppercase tracking-[0.1em] text-fg placeholder:text-fg-ghost shadow-hairline-strong transition-shadow focus:shadow-[inset_0_0_0_1px_var(--color-ember)] focus:outline-none lg:w-48"
            />
            <span aria-hidden className="absolute top-1/2 right-2.5 -translate-y-1/2 text-fg-dim">
              ⌕
            </span>
          </form>

          <Link
            href="/account"
            className="hidden h-9 items-center gap-2 rounded-sm px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-muted transition-colors hover:bg-panel-raised hover:text-fg md:inline-flex"
          >
            <span aria-hidden className="grid size-5 place-items-center rounded-full bg-panel-raised text-[10px] text-fg shadow-hairline">
              {customerName ? customerName.trim().charAt(0).toUpperCase() : '·'}
            </span>
            {customerName ? customerName.split(' ')[0] : 'Sign in'}
          </Link>

          <Link
            href="/cart"
            className="inline-flex h-9 items-center gap-2 rounded-sm px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-fg transition-colors hover:bg-panel-raised hover:text-ember"
            aria-label={`Cart, ${hydrated ? itemCount : 0} items`}
          >
            Cart
            <span
              className={cn(
                'numeric grid min-w-5 place-items-center rounded-xs px-1 text-[10px]',
                hydrated && itemCount > 0
                  ? 'bg-ember text-fg'
                  : 'bg-panel text-fg-dim shadow-hairline-strong',
              )}
            >
              {hydrated ? itemCount : 0}
            </span>
          </Link>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="grid size-9 place-items-center rounded-sm text-fg shadow-hairline-strong transition-colors hover:text-ember lg:hidden"
          >
            <span aria-hidden className="flex flex-col gap-1">
              <span
                className={cn(
                  'block h-px w-4 bg-current transition-transform duration-200',
                  menuOpen && 'translate-y-[3px] rotate-45',
                )}
              />
              <span
                className={cn(
                  'block h-px w-4 bg-current transition-transform duration-200',
                  menuOpen && '-translate-y-[3px] -rotate-45',
                )}
              />
            </span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-hairline bg-void px-4 py-6 sm:top-20 lg:hidden"
        >
          <form onSubmit={submitSearch} role="search" className="mb-6">
            <label htmlFor="mobile-search" className="label mb-2 block">
              Search
            </label>
            <input
              id="mobile-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the catalogue"
              className="h-11 w-full rounded-sm bg-panel px-3 text-sm text-fg placeholder:text-fg-ghost shadow-hairline-strong focus:outline-none"
            />
          </form>

          <nav aria-label="Modules (mobile)" className="space-y-1">
            {modules.map((module) => (
              <Link
                key={module.slug}
                href={`/module/${module.slug}`}
                className={cn(
                  'flex items-center justify-between border-b border-hairline py-3.5 font-mono text-xs uppercase tracking-[0.14em]',
                  isActive(module.slug) ? 'text-ember' : 'text-fg-muted',
                )}
              >
                {module.label}
                <span className="numeric text-[10px] text-fg-dim">{module.count}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-6 space-y-1">
            <Link
              href="/account"
              className="flex items-center justify-between border-b border-hairline py-3.5 font-mono text-xs uppercase tracking-[0.14em] text-fg-muted"
            >
              {customerName ? 'Your account' : 'Sign in'}
            </Link>
            <Link
              href="/account/orders"
              className="flex items-center justify-between border-b border-hairline py-3.5 font-mono text-xs uppercase tracking-[0.14em] text-fg-muted"
            >
              Order history
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
