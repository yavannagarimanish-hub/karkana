'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { totalCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isAdmin = pathname.startsWith('/admin');

  // Close mobile menu whenever pathname changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      setMobileMenuOpen(false);
      setSearchQuery('');
    } else {
      router.push('/search');
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 h-20 sm:h-24 flex items-center justify-between">
        {/* Brand Wordmark */}
        <Link
          href="/"
          className="group flex flex-col tracking-wider sm:tracking-ultra text-lg sm:text-2xl font-bold uppercase transition-colors shrink-0"
        >
          <span className="text-white group-hover:text-kred transition-colors duration-200">
            KARKANA
          </span>
          <span className="text-[8px] sm:text-[9px] tracking-widest text-white/40 uppercase font-mono">
            Pyrotechnic Atelier
          </span>
        </Link>

        {/* Minimal Desktop Navigation */}
        {!isAdmin ? (
          <nav className="hidden md:flex items-center space-x-6 lg:space-x-10 text-xs uppercase tracking-widest font-mono">
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

        {/* Action Controls & Mobile Hamburger */}
        <div className="flex items-center space-x-2.5 sm:space-x-4 lg:space-x-6 text-xs font-mono tracking-widest uppercase">
          {!isAdmin ? (
            <>
              {/* Desktop Compact Search Input */}
              <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SEARCH..."
                  className="w-24 lg:w-40 bg-white/[0.04] border border-white/20 focus:border-kred text-white placeholder-white/40 text-[11px] font-mono px-2.5 py-1.5 focus:outline-none transition-colors uppercase tracking-wider"
                />
                <button
                  type="submit"
                  aria-label="Search catalogue"
                  className="p-1.5 text-white/50 hover:text-kred transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
              </form>

              {/* Cart Counter */}
              <Link
                href="/cart"
                className="group flex items-center space-x-1.5 sm:space-x-2 text-white hover:text-kred transition-colors min-h-[44px] px-1"
                aria-label={`Cart with ${totalCount} items`}
              >
                <span className="text-xs">CART</span>
                <span className="inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 text-[10px] border border-white/20 group-hover:border-kred group-hover:text-kred text-white transition-colors">
                  {totalCount}
                </span>
              </Link>

              {/* Mobile Menu Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="md:hidden flex flex-col items-center justify-center w-10 h-10 border border-white/20 text-white hover:border-kred hover:text-kred transition-colors shrink-0"
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                <span
                  className={`block w-4 h-[1.5px] bg-current transition-transform duration-200 ${
                    mobileMenuOpen ? 'rotate-45 translate-y-[3.5px]' : 'mb-1'
                  }`}
                />
                <span
                  className={`block w-4 h-[1.5px] bg-current transition-transform duration-200 ${
                    mobileMenuOpen ? '-rotate-45 -translate-y-[3.5px]' : ''
                  }`}
                />
              </button>
            </>
          ) : (
            <Link
              href="/"
              className="text-white/60 hover:text-white border border-white/20 hover:border-white px-3 sm:px-4 py-2 transition-all duration-200 text-[10px] sm:text-[11px]"
            >
              STOREFRONT ↗
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Drawer / Dropdown Menu */}
      {!isAdmin && mobileMenuOpen && (
        <div className="md:hidden bg-black/95 border-b border-white/10 px-4 py-4 space-y-2 font-mono text-xs uppercase tracking-widest animate-fadeIn">
          {/* Mobile Search Control */}
          <form onSubmit={handleSearchSubmit} className="mb-3">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH CRACKERS (NAME, ID, BRAND)..."
                className="w-full bg-white/[0.04] border border-white/20 focus:border-kred text-white placeholder-white/40 text-xs font-mono px-3 py-2.5 pr-10 focus:outline-none transition-colors uppercase tracking-wider"
              />
              <button
                type="submit"
                aria-label="Submit search"
                className="absolute right-2 p-1.5 text-white/50 hover:text-kred transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>
          </form>

          <Link
            href="/module/basic"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center justify-between py-3.5 px-3 border-b border-white/5 transition-colors ${
              pathname === '/module/basic'
                ? 'text-kred font-bold bg-white/[0.02]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <span>01. BASIC</span>
            <span className="text-white/30 text-[10px]">KRK001–KRK118 →</span>
          </Link>
          <Link
            href="/module/customized"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center justify-between py-3.5 px-3 border-b border-white/5 transition-colors ${
              pathname === '/module/customized'
                ? 'text-kred font-bold bg-white/[0.02]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <span>02. CUSTOMIZED</span>
            <span className="text-white/30 text-[10px]">KRK119–KRK138 →</span>
          </Link>
          <Link
            href="/module/personalized"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center justify-between py-3.5 px-3 border-b border-white/5 transition-colors ${
              pathname === '/module/personalized'
                ? 'text-kred font-bold bg-white/[0.02]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <span>03. PERSONALIZED</span>
            <span className="text-kred text-[10px] font-bold">₹499 COMMISSIONS →</span>
          </Link>
          <Link
            href="/cart"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center justify-between py-3.5 px-3 transition-colors ${
              pathname === '/cart'
                ? 'text-kred font-bold bg-white/[0.02]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <span>COMMISSION CART</span>
            <span className="px-2 py-0.5 text-[10px] border border-white/20 text-white">
              {totalCount} ITEMS
            </span>
          </Link>
        </div>
      )}
    </header>
  );
}
