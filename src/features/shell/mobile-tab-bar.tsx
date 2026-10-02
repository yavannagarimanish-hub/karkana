'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/features/cart/cart-provider';
import { cn } from '@/ui/cn';

interface Tab {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Matches when the path starts with this prefix. */
  match: (pathname: string) => boolean;
}

const iconClass = 'h-5 w-5';

const TABS: Tab[] = [
  {
    href: '/',
    label: 'Home',
    match: (pathname) => pathname === '/',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
        <path d="M3 10.5 12 3l9 7.5V21H3z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/search',
    label: 'Search',
    match: (pathname) => pathname.startsWith('/search'),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/cart',
    label: 'Cart',
    match: (pathname) => pathname.startsWith('/cart') || pathname.startsWith('/checkout'),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
        <path d="M6 7h12l-1.2 12.2a1 1 0 0 1-1 .8H8.2a1 1 0 0 1-1-.8z" strokeLinejoin="round" />
        <path d="M9 7a3 3 0 0 1 6 0" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/account',
    label: 'Account',
    match: (pathname) => pathname.startsWith('/account') || pathname.startsWith('/order'),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={iconClass}>
        <circle cx="12" cy="8" r="3.6" />
        <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
      </svg>
    ),
  },
];

/**
 * Persistent bottom navigation on small screens, the way Swiggy and Zomato
 * keep the primary destinations one thumb-reach away. Hidden from `lg` up,
 * where the header navigation takes over.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const { count, hydrated } = useCart();

  const handleSearchClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('karkana:open-search'));
  };

  const handleNavClick = () => {
    window.dispatchEvent(new CustomEvent('karkana:close-menu'));
  };

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-hairline-strong bg-ember text-white shadow-md lg:hidden',
        // Respect the iOS home-indicator area.
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const isCart = tab.label === 'Cart';
          const isSearch = tab.label === 'Search';
          const badge = isCart && hydrated && count > 0;

          const content = (
            <>
              <span className="relative">
                {tab.icon}
                {badge && (
                  <span className="numeric absolute -top-1.5 -right-2 grid min-w-4 place-items-center rounded-xs bg-white px-1 text-[9px] leading-4 font-bold text-black shadow-xs">
                    {count}
                  </span>
                )}
              </span>
              <span>{tab.label}</span>
              {active && (
                <span aria-hidden className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-white" />
              )}
            </>
          );

          const linkClass = cn(
            'relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium tracking-[0.08em] uppercase transition-colors',
            active ? 'text-white font-bold' : 'text-white/80 hover:text-white',
          );

          return (
            <li key={tab.label}>
              {isSearch ? (
                <button
                  type="button"
                  onClick={handleSearchClick}
                  aria-label="Search"
                  aria-current={active ? 'page' : undefined}
                  className={cn(linkClass, 'w-full')}
                >
                  {content}
                </button>
              ) : (
                <Link
                  href={tab.href}
                  onClick={handleNavClick}
                  aria-current={active ? 'page' : undefined}
                  className={linkClass}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
