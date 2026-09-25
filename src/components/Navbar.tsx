'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';

export default function Navbar() {
  const pathname = usePathname();
  const { totalCount } = useCart();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 sm:px-12 h-24 flex items-center justify-between">
        {/* Brand Wordmark */}
        <Link
          href="/"
          className="group flex flex-col tracking-ultra text-2xl font-bold uppercase transition-colors"
        >
          <span className="text-white group-hover:text-kred transition-colors duration-200">
            KARKANA
          </span>
          <span className="text-[9px] tracking-widest text-white/40 uppercase font-mono">
            Pyrotechnic Atelier
          </span>
        </Link>

        {/* Minimal Navigation */}
        {!isAdmin ? (
          <nav className="hidden md:flex items-center space-x-12 text-xs uppercase tracking-widest font-mono">
            <Link
              href="/module/basic"
              className={`transition-colors duration-200 ${
                pathname === '/module/basic'
                  ? 'text-kred font-bold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              BASIC
            </Link>
            <Link
              href="/module/customized"
              className={`transition-colors duration-200 ${
                pathname === '/module/customized'
                  ? 'text-kred font-bold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              CUSTOMIZED
            </Link>
            <Link
              href="/module/personalized"
              className={`transition-colors duration-200 ${
                pathname === '/module/personalized'
                  ? 'text-kred font-bold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              PERSONALIZED
            </Link>
          </nav>
        ) : (
          <div className="text-xs uppercase tracking-widest font-mono text-kred flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-kred animate-pulse" />
            CONTROL CENTRE
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center space-x-8 text-xs font-mono tracking-widest uppercase">
          {!isAdmin ? (
            <>
              <Link
                href="/cart"
                className="group flex items-center space-x-2 text-white hover:text-kred transition-colors"
              >
                <span>CART</span>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] border border-white/20 group-hover:border-kred group-hover:text-kred text-white transition-colors">
                  {totalCount}
                </span>
              </Link>
            </>
          ) : (
            <Link
              href="/"
              className="text-white/60 hover:text-white border border-white/20 hover:border-white px-4 py-2 transition-all duration-200 text-[11px]"
            >
              VIEW STOREFRONT ↗
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
