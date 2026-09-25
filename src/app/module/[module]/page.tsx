import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProducts } from '@/lib/db';
import { ProductModule } from '@/types';
import SectionHeader from '@/components/SectionHeader';
import ProductCard from '@/components/ProductCard';
import EmptyState from '@/components/EmptyState';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: { module: string };
}

const MODULE_META: Record<
  string,
  {
    moduleKey: ProductModule;
    number: string;
    title: string;
    tagline: string;
    description: string;
  }
> = {
  basic: {
    moduleKey: 'BASIC',
    number: '01',
    title: 'BASIC',
    tagline: 'ESSENTIAL CELEBRATION CLASSICS',
    description:
      'Foundational cracker engineering. Pristine acoustic clarity, traditional sparklers, rockets, ground chakkars, and multi-shots crafted with exacting chemical purity.',
  },
  customized: {
    moduleKey: 'CUSTOMIZED',
    number: '02',
    title: 'CUSTOMIZED',
    tagline: 'THEMATIC & ICONIC EDITIONS',
    description:
      'Curated editions featuring cultural icons, legendary cinematic artwork, political leaders, and bespoke aesthetic packaging created exclusively by Karkana.',
  },
  personalized: {
    moduleKey: 'PERSONALIZED',
    number: '03',
    title: 'PERSONALIZED',
    tagline: 'BESPOKE COMMEMORATIVE BOXES',
    description:
      'Custom fireworks crafted with your direct input. Select a commission, upload your personal high-resolution photograph, and submit customization directives for packaging.',
  },
};

export default async function ModulePage({ params }: PageProps) {
  const meta = MODULE_META[params.module.toLowerCase()];

  if (!meta) {
    notFound();
  }

  const products = getProducts({
    module: meta.moduleKey,
    is_visible: true,
  });

  return (
    <div className="w-full bg-black min-h-screen">
      {/* Header Banner */}
      <section className="px-6 sm:px-12 pt-24 pb-20 max-w-7xl mx-auto border-b border-white/10">
        <div className="flex items-center space-x-3 text-xs font-mono tracking-widest text-white/50 mb-8">
          <Link href="/" className="hover:text-white transition-colors">
            HOME
          </Link>
          <span>/</span>
          <span className="text-kred">MODULE</span>
          <span>/</span>
          <span className="text-white uppercase">{meta.title}</span>
        </div>

        <div className="max-w-4xl space-y-6">
          <div className="flex items-center space-x-4">
            <span className="text-kred font-mono text-sm tracking-widest">
              [{meta.number}]
            </span>
            <span className="text-xs font-mono tracking-widest uppercase border border-white/20 px-3 py-1 text-white/70">
              {meta.tagline}
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold uppercase tracking-ultra text-white">
            {meta.title}
          </h1>

          <p className="text-white/50 text-sm sm:text-base font-mono leading-relaxed max-w-3xl">
            {meta.description}
          </p>

          {meta.moduleKey === 'PERSONALIZED' && (
            <div className="p-6 border border-kred/30 bg-kred/[0.03] space-y-2 mt-8">
              <div className="text-xs font-mono uppercase tracking-widest text-kred flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-kred" />
                CUSTOMER PHOTOGRAPH UPLOAD ENABLED
              </div>
              <p className="text-xs font-mono text-white/60">
                Selecting any personalized product allows you to attach your photograph and instructions directly before adding to cart.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Product Grid / Empty State */}
      <section className="px-6 sm:px-12 py-24 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-16">
          <SectionHeader
            title={`${meta.title} COLLECTION`}
            subtitle="Curated catalogue items displayed in admin-configured priority order"
          />
          <div className="font-mono text-xs tracking-widest uppercase text-white/40">
            {products.length} PRODUCTS
          </div>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={`NO ${meta.title} PRODUCTS AVAILABLE YET`}
            message={`New items for the ${meta.title} collection will appear here dynamically once published from the Control Centre.`}
            actionText="MANAGE VIA ADMIN"
            actionHref="/admin/products"
          />
        )}
      </section>
    </div>
  );
}
