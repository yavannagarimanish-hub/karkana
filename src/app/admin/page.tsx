'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminMetrics } from '@/types';
import SectionHeader from '@/components/SectionHeader';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const res = await fetch('/api/metrics');
        const data = await res.json();
        if (data.success) {
          setMetrics(data.metrics);
        }
      } catch (err) {
        console.error('Failed fetching metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="font-mono text-xs tracking-widest uppercase text-white/40 animate-pulse">
          COMPUTING REPOSITORY METRICS...
        </div>
      </div>
    );
  }

  const m = metrics || {
    totalProducts: 0,
    basicProducts: 0,
    customizedProducts: 0,
    personalizedProducts: 0,
    visibleProducts: 0,
    totalOrders: 0,
    newOrders: 0,
    preparingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
  };

  return (
    <div className="space-y-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/10">
        <SectionHeader
          number="CTRL"
          title="CONTROL CENTRE"
          subtitle="REAL-TIME TELEMETRY & PRODUCT CATALOGUE ARCHITECTURE"
        />

        <div className="flex flex-wrap gap-4 font-mono text-xs uppercase tracking-widest">
          <Link
            href="/admin/products"
            className="px-6 py-3 bg-white text-black font-bold hover:bg-kred hover:text-white transition-colors"
          >
            + ADD PRODUCT
          </Link>
          <Link
            href="/admin/ordering"
            className="px-6 py-3 border border-white/20 text-white hover:border-white transition-colors"
          >
            REORDER CATALOGUE
          </Link>
        </div>
      </div>

      {/* METRICS GRID: PRODUCTS */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3 text-xs font-mono uppercase tracking-widest text-kred">
          <span className="w-1.5 h-1.5 rounded-full bg-kred" />
          <span>CATALOGUE STATUS</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="p-6 sm:p-8 border border-white/10 bg-white/[0.01] space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
              TOTAL PRODUCTS
            </span>
            <div className="text-4xl sm:text-5xl font-mono font-bold text-white">
              {m.totalProducts}
            </div>
            <span className="text-[10px] font-mono text-white/30 block">In repository</span>
          </div>

          <div className="p-6 sm:p-8 border border-white/10 bg-white/[0.01] space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
              BASIC MODULE
            </span>
            <div className="text-4xl sm:text-5xl font-mono font-bold text-white">
              {m.basicProducts}
            </div>
            <span className="text-[10px] font-mono text-white/30 block">Essential crackers</span>
          </div>

          <div className="p-6 sm:p-8 border border-white/10 bg-white/[0.01] space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
              CUSTOMIZED
            </span>
            <div className="text-4xl sm:text-5xl font-mono font-bold text-white">
              {m.customizedProducts}
            </div>
            <span className="text-[10px] font-mono text-white/30 block">Thematic editions</span>
          </div>

          <div className="p-6 sm:p-8 border border-white/10 bg-white/[0.01] space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
              PERSONALIZED
            </span>
            <div className="text-4xl sm:text-5xl font-mono font-bold text-kred">
              {m.personalizedProducts}
            </div>
            <span className="text-[10px] font-mono text-white/30 block">Customer uploads</span>
          </div>

          <div className="p-6 sm:p-8 border border-white/10 bg-white/[0.01] space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
              VISIBLE IN STORE
            </span>
            <div className="text-4xl sm:text-5xl font-mono font-bold text-white">
              {m.visibleProducts}
            </div>
            <span className="text-[10px] font-mono text-white/30 block">Active storefront items</span>
          </div>
        </div>
      </div>

      {/* METRICS GRID: ORDERS & DISPATCHES */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3 text-xs font-mono uppercase tracking-widest text-kred">
          <span className="w-1.5 h-1.5 rounded-full bg-kred" />
          <span>DISPATCH & COMMISSIONS PIPELINE</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="p-6 sm:p-8 border border-white/10 bg-white/[0.01] space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
              TOTAL ORDERS
            </span>
            <div className="text-4xl sm:text-5xl font-mono font-bold text-white">
              {m.totalOrders}
            </div>
            <span className="text-[10px] font-mono text-white/30 block">Lifetime orders</span>
          </div>

          <div className="p-6 sm:p-8 border border-kred/30 bg-kred/[0.02] space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-kred block">
              NEW ORDERS
            </span>
            <div className="text-4xl sm:text-5xl font-mono font-bold text-kred">
              {m.newOrders}
            </div>
            <span className="text-[10px] font-mono text-kred/60 block">Awaiting confirmation</span>
          </div>

          <div className="p-6 sm:p-8 border border-white/10 bg-white/[0.01] space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
              PREPARING
            </span>
            <div className="text-4xl sm:text-5xl font-mono font-bold text-white">
              {m.preparingOrders}
            </div>
            <span className="text-[10px] font-mono text-white/30 block">Packaging in progress</span>
          </div>

          <div className="p-6 sm:p-8 border border-white/10 bg-white/[0.01] space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
              DELIVERED
            </span>
            <div className="text-4xl sm:text-5xl font-mono font-bold text-white">
              {m.deliveredOrders}
            </div>
            <span className="text-[10px] font-mono text-white/30 block">Fulfillment complete</span>
          </div>

          <div className="p-6 sm:p-8 border border-white/10 bg-white/[0.01] space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
              CANCELLED
            </span>
            <div className="text-4xl sm:text-5xl font-mono font-bold text-white/40">
              {m.cancelledOrders}
            </div>
            <span className="text-[10px] font-mono text-white/30 block">Voided orders</span>
          </div>
        </div>
      </div>

      {/* QUICK WORKFLOW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-white/10">
        <Link
          href="/admin/products"
          className="group p-8 border border-white/10 bg-white/[0.01] hover:border-white transition-all space-y-4"
        >
          <div className="text-xs font-mono uppercase tracking-widest text-kred">
            CATALOGUE CURATION
          </div>
          <h3 className="text-xl font-bold uppercase tracking-wider text-white">
            MANAGE PRODUCTS
          </h3>
          <p className="text-xs font-mono text-white/40 leading-relaxed">
            Create, modify pricing, upload imagery, and toggle visibility, stock, popular and featured status.
          </p>
          <div className="text-xs font-mono text-white group-hover:text-kred flex items-center space-x-2 pt-2">
            <span>OPEN INVENTORY</span>
            <span>→</span>
          </div>
        </Link>

        <Link
          href="/admin/ordering"
          className="group p-8 border border-white/10 bg-white/[0.01] hover:border-white transition-all space-y-4"
        >
          <div className="text-xs font-mono uppercase tracking-widest text-kred">
            STOREFRONT PLACEMENT
          </div>
          <h3 className="text-xl font-bold uppercase tracking-wider text-white">
            DRAG & DROP ORDERING
          </h3>
          <p className="text-xs font-mono text-white/40 leading-relaxed">
            Directly manipulate the exact sequential position of products across Basic, Customized, and Personalized sections.
          </p>
          <div className="text-xs font-mono text-white group-hover:text-kred flex items-center space-x-2 pt-2">
            <span>REORDER NOW</span>
            <span>→</span>
          </div>
        </Link>

        <Link
          href="/admin/orders"
          className="group p-8 border border-white/10 bg-white/[0.01] hover:border-white transition-all space-y-4"
        >
          <div className="text-xs font-mono uppercase tracking-widest text-kred">
            FULFILLMENT DESK
          </div>
          <h3 className="text-xl font-bold uppercase tracking-wider text-white">
            ORDERS & CUSTOM ASSETS
          </h3>
          <p className="text-xs font-mono text-white/40 leading-relaxed">
            Inspect incoming Cash on Delivery orders, view customer uploaded photographs for personalized items, and transition dispatch statuses.
          </p>
          <div className="text-xs font-mono text-white group-hover:text-kred flex items-center space-x-2 pt-2">
            <span>VIEW ORDERS</span>
            <span>→</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
