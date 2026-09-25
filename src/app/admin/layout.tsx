'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: 'OVERVIEW', href: '/admin' },
    { label: 'VALIDATION', href: '/admin/validation' },
    { label: 'PRODUCTS', href: '/admin/products' },
    { label: 'DRAG & DROP ORDERING', href: '/admin/ordering' },
    { label: 'ORDERS', href: '/admin/orders' },
    { label: 'SECTIONS', href: '/admin/sections' },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Admin Secondary Bar */}
      <div className="border-b border-white/10 bg-black/95 sticky top-24 z-40">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
          {/* Navigation Links */}
          <nav className="flex items-center space-x-6 sm:space-x-8 overflow-x-auto text-xs font-mono tracking-widest uppercase">
            {navItems.map((item) => {
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`pb-1 transition-colors relative whitespace-nowrap ${
                    isActive
                      ? 'text-kred font-bold'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-kred" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* System Badge */}
          <div className="flex items-center space-x-3 text-[11px] font-mono text-white/40">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="uppercase tracking-widest">LIVE DB REPOSITORY</span>
          </div>
        </div>
      </div>

      {/* Main Admin Content Container */}
      <div className="max-w-7xl mx-auto px-6 sm:px-12 py-12">{children}</div>
    </div>
  );
}
