import React from 'react';
import Link from 'next/link';
import { getProducts, getSections } from '@/lib/db';
import SectionHeader from '@/components/SectionHeader';
import ProductGrid from '@/components/ProductGrid';
import EmptyState from '@/components/EmptyState';

// Ensure fresh dynamic data from the database
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const allProducts = await getProducts({ is_visible: true });
  const sections = await getSections();

  const popularProducts = allProducts.filter((p) => p.is_popular);
  const featuredProducts = allProducts.filter((p) => p.is_featured);

  const popularSection = sections.find((s) => s.key === 'popular');
  const featuredSection = sections.find((s) => s.key === 'featured');

  return (
    <div className="w-full bg-black min-h-screen">
      {/* ================= HERO SECTION ================= */}
      <section className="relative px-4 sm:px-12 pt-16 sm:pt-40 pb-20 sm:pb-48 max-w-7xl mx-auto flex flex-col items-start justify-center">
        <div className="inline-flex items-center space-x-3 mb-8">
          <span className="w-2 h-2 rounded-full bg-kred animate-ping" />
          <span className="text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-white/50">
            SEASON MMXVI // EDITORIAL CATALOGUE
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold uppercase tracking-wider sm:tracking-widest xl:tracking-ultra text-white leading-[1.05] max-w-5xl mb-8 sm:mb-12">
          KARKANA <br />
          <span className="text-white/30">CRACKERS</span>
        </h1>

        <p className="text-white/50 text-xs sm:text-base font-mono max-w-2xl leading-relaxed uppercase tracking-wider mb-10 sm:mb-14">
          Engineered precision in pyrotechnics. Three distinct operational modules tailored for
          classical resonance, thematic iconography, and personalized commemoration.
        </p>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-mono tracking-widest">
          <a
            href="#modules"
            className="w-full sm:w-auto text-center px-6 sm:px-8 py-4 bg-white text-black font-bold uppercase hover:bg-kred hover:text-white transition-all duration-300"
          >
            EXPLORE MODULES ↓
          </a>
          <span className="text-white/30 tracking-widest text-[11px] sm:text-xs">
            DIRECT SIVAKASI ATELIER
          </span>
        </div>
      </section>

      {/* ================= THE THREE PRIMARY MODULES ================= */}
      <section id="modules" className="px-4 sm:px-12 py-16 sm:py-36 border-t border-b border-white/10 max-w-7xl mx-auto">
        <SectionHeader
          number="01"
          title="PRIMARY DESTINATIONS"
          subtitle="Select from three foundational pyrotechnic methodologies"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-12">
          {/* MODULE 1: BASIC */}
          <Link
            href="/module/basic"
            className="group relative block p-6 sm:p-12 border border-white/10 bg-white/[0.01] hover:border-white hover:bg-white/[0.03] transition-all duration-500"
          >
            <div className="flex justify-between items-start mb-12 sm:mb-28">
              <span className="text-4xl sm:text-6xl font-extrabold font-mono text-white/20 group-hover:text-kred transition-colors duration-300">
                01
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest border border-white/20 px-3 py-1 text-white/60">
                ESSENTIAL
              </span>
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl sm:text-3xl font-bold uppercase tracking-widest text-white group-hover:text-white">
                BASIC
              </h3>
              <p className="text-white/40 text-xs sm:text-sm font-mono leading-relaxed">
                Pure, timeless celebration essentials. Master formulations constructed for acoustic clarity and radiant illuminations.
              </p>
              <div className="text-[11px] font-mono text-white/50 tracking-wider">
                KRK001 – KRK118 // 118 PRODUCTS
              </div>
            </div>
            <div className="mt-12 pt-6 border-t border-white/10 flex items-center justify-between text-xs font-mono uppercase tracking-widest text-white/60 group-hover:text-white">
              <span>OPEN BASIC (118 ITEMS)</span>
              <span className="transform group-hover:translate-x-2 transition-transform duration-300 text-kred">
                →
              </span>
            </div>
          </Link>

          {/* MODULE 2: CUSTOMIZED */}
          <Link
            href="/module/customized"
            className="group relative block p-6 sm:p-12 border border-white/10 bg-white/[0.01] hover:border-white hover:bg-white/[0.03] transition-all duration-500"
          >
            <div className="flex justify-between items-start mb-12 sm:mb-28">
              <span className="text-4xl sm:text-6xl font-extrabold font-mono text-white/20 group-hover:text-kred transition-colors duration-300">
                02
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest border border-white/20 px-3 py-1 text-white/60">
                THEMATIC
              </span>
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl sm:text-3xl font-bold uppercase tracking-widest text-white group-hover:text-white">
                CUSTOMIZED
              </h3>
              <p className="text-white/40 text-xs sm:text-sm font-mono leading-relaxed">
                Curated themed designs including cinematic icons, political series, and distinctive artistic concepts curated by Karkana.
              </p>
              <div className="text-[11px] font-mono text-white/50 tracking-wider">
                KRK119 – KRK138 // 20 PRODUCTS
              </div>
            </div>
            <div className="mt-12 pt-6 border-t border-white/10 flex items-center justify-between text-xs font-mono uppercase tracking-widest text-white/60 group-hover:text-white">
              <span>OPEN CUSTOMIZED (20 ITEMS)</span>
              <span className="transform group-hover:translate-x-2 transition-transform duration-300 text-kred">
                →
              </span>
            </div>
          </Link>

          {/* MODULE 3: PERSONALIZED */}
          <Link
            href="/module/personalized"
            className="group relative block p-6 sm:p-12 border border-kred/30 bg-kred/[0.02] hover:border-kred hover:bg-kred/[0.05] transition-all duration-500"
          >
            <div className="flex justify-between items-start mb-12 sm:mb-28">
              <span className="text-4xl sm:text-6xl font-extrabold font-mono text-kred/40 group-hover:text-kred transition-colors duration-300">
                03
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest border border-kred/50 text-kred px-3 py-1 font-bold">
                ₹499 COMMISSION
              </span>
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl sm:text-3xl font-bold uppercase tracking-widest text-white group-hover:text-white">
                PERSONALIZED
              </h3>
              <p className="text-white/40 text-xs sm:text-sm font-mono leading-relaxed">
                Bespoke commemorative boxes. Direct customer upload of personal photographs and specific customization directives for packaging.
              </p>
              <div className="text-[11px] font-mono text-kred/70 tracking-wider">
                INCLUDES 6 REFERENCE EXAMPLES (KRK133–KRK138)
              </div>
            </div>
            <div className="mt-12 pt-6 border-t border-white/10 flex items-center justify-between text-xs font-mono uppercase tracking-widest text-white/60 group-hover:text-white">
              <span>COMMISSION BOX (₹499)</span>
              <span className="transform group-hover:translate-x-2 transition-transform duration-300 text-kred">
                →
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* ================= STRUCTURAL SECTION: POPULAR CRACKERS ================= */}
      {popularSection?.is_visible && (
        <section className="px-4 sm:px-12 py-16 sm:py-36 max-w-7xl mx-auto">
          <SectionHeader
            number="02"
            title={popularSection.title}
            subtitle={popularSection.subtitle}
          />

          {popularProducts.length > 0 ? (
            <ProductGrid products={popularProducts} />
          ) : (
            <EmptyState
              title="NO PRODUCTS AVAILABLE YET"
              message="Curated popular selections will appear here once allocated."
            />
          )}
        </section>
      )}

      {/* ================= STRUCTURAL SECTION: FEATURED PRODUCTS ================= */}
      {featuredSection?.is_visible && (
        <section className="px-4 sm:px-12 py-16 sm:py-36 border-t border-white/10 max-w-7xl mx-auto">
          <SectionHeader
            number="03"
            title={featuredSection.title}
            subtitle={featuredSection.subtitle}
          />

          {featuredProducts.length > 0 ? (
            <ProductGrid products={featuredProducts} />
          ) : (
            <EmptyState
              title="NO PRODUCTS AVAILABLE YET"
              message="Curated featured formulations will appear here once allocated."
            />
          )}
        </section>
      )}

      {/* ================= STRUCTURAL SECTION: COMPLETE CATALOGUE ================= */}
      <section className="px-4 sm:px-12 py-16 sm:py-36 border-t border-white/10 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-20 space-y-4 sm:space-y-0">
          <SectionHeader
            number="04"
            title="PRODUCT CATALOGUE"
            subtitle="Dynamic overview of visible formulations across all modules"
          />
          <span className="font-mono text-xs tracking-widest uppercase text-white/40">
            TOTAL ACTIVE: {allProducts.length}
          </span>
        </div>

        {allProducts.length > 0 ? (
          <ProductGrid products={allProducts} />
        ) : (
          <EmptyState
            title="NO PRODUCTS AVAILABLE YET"
            message="No products are currently visible in the active catalogue."
          />
        )}
      </section>

      {/* ================= ORDERING MANIFESTO BANNER ================= */}
      <section className="px-4 sm:px-12 py-16 sm:py-24 border-t border-white/10 max-w-7xl mx-auto">
        <div className="p-6 sm:p-12 md:p-20 border border-white/10 bg-white/[0.01] flex flex-col md:flex-row items-start md:items-center justify-between gap-8 md:gap-12">
          <div className="space-y-4 max-w-xl">
            <span className="text-kred font-mono text-xs tracking-widest uppercase">
              FULFILLMENT ASSURANCE
            </span>
            <h3 className="text-xl sm:text-4xl font-bold uppercase tracking-wider sm:tracking-widest text-white">
              CASH ON DELIVERY. ZERO ONLINE GATEWAYS.
            </h3>
            <p className="text-white/40 text-xs sm:text-sm font-mono leading-relaxed">
              Every commission is confirmed manually and fulfilled strictly with Cash on Delivery at your doorstep. Transparent, discrete, and direct.
            </p>
          </div>
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4 font-mono text-xs uppercase tracking-widest">
            <Link
              href="/cart"
              className="w-full sm:w-auto px-6 sm:px-8 py-4 border border-white/20 text-white hover:border-white transition-colors text-center"
            >
              VIEW CART
            </Link>
            <a
              href="#modules"
              className="w-full sm:w-auto px-6 sm:px-8 py-4 bg-white text-black font-bold uppercase hover:bg-kred hover:text-white transition-colors text-center"
            >
              EXPLORE MODULES →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

