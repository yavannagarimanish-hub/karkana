'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Product } from '@/types';
import SectionHeader from '@/components/SectionHeader';
import ProductGrid from '@/components/ProductGrid';
import EmptyState from '@/components/EmptyState';

function SearchResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [inputQuery, setInputQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Synchronize when query param in URL changes
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setInputQuery(q);
    setActiveQuery(q);
  }, [searchParams]);

  // Fetch real catalogue data
  useEffect(() => {
    let isMounted = true;
    async function loadCatalogue() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/products');
        if (!res.ok) {
          throw new Error('Failed to load catalogue');
        }
        const data = await res.json();
        if (isMounted) {
          if (data.success && Array.isArray(data.products)) {
            setProducts(data.products);
          } else {
            setProducts([]);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error fetching catalogue');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCatalogue();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputQuery.trim();
    setActiveQuery(trimmed);
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/search');
    }
  };

  // Filter across active BASIC and CUSTOMIZED products using:
  // Product ID, Product Name, Brand Name, Category, Subcategory, Search Keywords
  // Case-insensitive & partial-word matching
  const matchingProducts = useMemo(() => {
    // Only search active BASIC and CUSTOMIZED products
    const catalogue = products.filter(
      (p) => (p.module === 'BASIC' || p.module === 'CUSTOMIZED') && p.is_visible
    );

    const queryClean = activeQuery.trim().toLowerCase();
    if (!queryClean) {
      return [];
    }

    // Split search into individual tokens for partial-word matching
    const tokens = queryClean.split(/\s+/).filter(Boolean);

    return catalogue.filter((product) => {
      const searchFields = [
        product.id || '',
        product.name || '',
        product.brand || '',
        product.category || '',
        product.subcategory || '',
        product.search_keywords || '',
      ].map((str) => str.toLowerCase());

      // Every token must match at least one searchable field
      return tokens.every((token) =>
        searchFields.some((field) => field.includes(token))
      );
    });
  }, [products, activeQuery]);

  return (
    <div className="w-full bg-black min-h-screen">
      {/* Header Banner */}
      <section className="px-4 sm:px-12 pt-16 sm:pt-24 pb-10 sm:pb-16 max-w-7xl mx-auto border-b border-white/10">
        <div className="flex items-center space-x-3 text-xs font-mono tracking-widest text-white/50 mb-6 sm:mb-8">
          <Link href="/" className="hover:text-white transition-colors">
            HOME
          </Link>
          <span>/</span>
          <span className="text-kred">CATALOGUE</span>
          <span>/</span>
          <span className="text-white uppercase">SEARCH</span>
        </div>

        <div className="max-w-4xl space-y-4 sm:space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-kred font-mono text-sm tracking-widest">
              [SEARCH]
            </span>
            <span className="text-[10px] sm:text-xs font-mono tracking-wider sm:tracking-widest uppercase border border-white/20 px-2.5 sm:px-3 py-1 text-white/70">
              BASIC &amp; CUSTOMIZED INVENTORY
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold uppercase tracking-wider sm:tracking-widest text-white break-words">
            PRODUCT SEARCH
          </h1>

          <p className="text-white/50 text-xs sm:text-sm font-mono leading-relaxed max-w-2xl">
            Query verified fireworks formulations across product ID, product title, manufacturer brand,
            category, subcategory, and chemical/pyrotechnic keywords.
          </p>

          {/* Search Input Bar */}
          <form onSubmit={handleSearchSubmit} className="pt-2 max-w-xl">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="SEARCH BY ID, NAME, BRAND, CATEGORY..."
                className="w-full bg-white/[0.04] border border-white/20 focus:border-kred text-white placeholder-white/40 text-xs sm:text-sm font-mono px-4 py-3 sm:py-3.5 pr-24 focus:outline-none transition-colors uppercase tracking-wider"
              />
              <button
                type="submit"
                className="absolute right-1 px-4 py-2 sm:py-2.5 bg-white text-black text-xs font-mono font-bold tracking-widest uppercase hover:bg-kred hover:text-white transition-colors"
              >
                FIND
              </button>
            </div>
            {activeQuery && (
              <div className="flex items-center justify-between text-[11px] font-mono text-white/40 mt-2 px-1">
                <span>QUERY: &ldquo;{activeQuery}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => {
                    setInputQuery('');
                    setActiveQuery('');
                    router.push('/search');
                  }}
                  className="text-white/60 hover:text-kred transition-colors uppercase"
                >
                  CLEAR [×]
                </button>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Results Section */}
      <section className="px-4 sm:px-12 py-10 sm:py-20 max-w-7xl mx-auto">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-2.5 h-2.5 rounded-full bg-kred animate-ping" />
            <p className="text-xs font-mono tracking-widest text-white/50 uppercase">
              SCANNING CATALOGUE ARCHIVE...
            </p>
          </div>
        ) : error ? (
          <EmptyState
            title="CATALOGUE ACCESS ERROR"
            message={error}
            actionText="RETRY SEARCH"
            actionHref="/search"
          />
        ) : !activeQuery.trim() ? (
          <EmptyState
            title="SEARCH THE CATALOGUE"
            message="Enter a product ID, name, brand, category, or keyword in the box above to find crackers."
            actionText="VIEW ALL BASIC CRACKERS"
            actionHref="/module/basic"
          />
        ) : matchingProducts.length > 0 ? (
          <div className="space-y-8 sm:space-y-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <SectionHeader
                title="SEARCH RESULTS"
                subtitle={`DISPLAYING ${matchingProducts.length} MATCHING CRACKER FORMULATIONS`}
              />
              <div className="font-mono text-xs tracking-widest uppercase text-white/40 self-start sm:self-auto">
                {matchingProducts.length} {matchingProducts.length === 1 ? 'PRODUCT' : 'PRODUCTS'} FOUND
              </div>
            </div>

            <ProductGrid products={matchingProducts} />
          </div>
        ) : (
          <EmptyState
            title="NO PRODUCTS FOUND"
            message={`No active crackers matched your search for "${activeQuery}". Try searching by ID (e.g. KRK001), brand name, category, or keyword.`}
            actionText="BROWSE BASIC CATALOGUE"
            actionHref="/module/basic"
          />
        )}
      </section>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full bg-black min-h-screen py-32 flex flex-col items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-kred animate-ping" />
          <p className="text-xs font-mono tracking-widest text-white/50 mt-4 uppercase">
            LOADING SEARCH...
          </p>
        </div>
      }
    >
      <SearchResultsContent />
    </Suspense>
  );
}
