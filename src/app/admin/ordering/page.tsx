'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Product, ProductModule } from '@/types';
import SectionHeader from '@/components/SectionHeader';

export default function AdminOrderingPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [activeScope, setActiveScope] = useState<
    'ALL' | ProductModule | 'POPULAR' | 'FEATURED'
  >('ALL');
  const [orderedItems, setOrderedItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Drag and drop tracking
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products?all=true');
      const data = await res.json();
      if (data.success) {
        setAllProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Update working list when scope or source data changes
  useEffect(() => {
    let subset: Product[] = [];
    if (activeScope === 'ALL') {
      subset = [...allProducts];
    } else if (
      activeScope === 'BASIC' ||
      activeScope === 'CUSTOMIZED' ||
      activeScope === 'PERSONALIZED'
    ) {
      subset = allProducts.filter((p) => p.module === activeScope);
    } else if (activeScope === 'POPULAR') {
      subset = allProducts.filter((p) => p.is_popular);
    } else if (activeScope === 'FEATURED') {
      subset = allProducts.filter((p) => p.is_featured);
    }

    // Sort by display_position
    subset.sort((a, b) => a.display_position - b.display_position);
    setOrderedItems(subset);
  }, [activeScope, allProducts]);

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const copy = [...orderedItems];
      const draggedItemContent = copy.splice(dragItem.current, 1)[0];
      copy.splice(dragOverItem.current, 0, draggedItemContent);
      setOrderedItems(copy);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // Keyboard / Button accessible reordering
  const moveItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= orderedItems.length) return;
    const copy = [...orderedItems];
    const item = copy.splice(fromIdx, 1)[0];
    copy.splice(toIdx, 0, item);
    setOrderedItems(copy);
  };

  const saveSequence = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      const orderedIds = orderedItems.map((p) => p.id);
      const res = await fetch('/api/products/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setAllProducts(data.products);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Failed saving sequence:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Header & Save Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 pb-8 border-b border-white/10">
        <SectionHeader
          number="02"
          title="DRAG & DROP ORDERING"
          subtitle="DETERMINE EXACT SEQUENTIAL STOREFRONT PRESENTATION"
        />

        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={saveSequence}
            disabled={saving || orderedItems.length === 0}
            className="px-8 py-4 bg-white text-black font-bold uppercase font-mono text-xs tracking-widest hover:bg-kred hover:text-white transition-all duration-300 disabled:opacity-40"
          >
            {saving ? 'SYNCHRONIZING REPOSITORY...' : 'PERSIST SEQUENCE TO DB'}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 border border-kred bg-kred/10 text-kred text-xs font-mono flex items-center justify-between">
          <span className="uppercase tracking-widest">
            ✓ SEQUENTIAL ORDER PERSISTED TO DATABASE. STOREFRONT UPDATED IMMEDIATELY.
          </span>
          <span className="text-white/60">POSITIONS UPDATED</span>
        </div>
      )}

      {/* Scope Selector */}
      <div className="flex items-center space-x-2 overflow-x-auto text-xs font-mono uppercase tracking-wider pb-2 border-b border-white/10">
        {(['ALL', 'BASIC', 'CUSTOMIZED', 'PERSONALIZED', 'POPULAR', 'FEATURED'] as const).map(
          (scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => setActiveScope(scope)}
              className={`px-4 py-2 border transition-colors whitespace-nowrap ${
                activeScope === scope
                  ? 'border-white bg-white text-black font-bold'
                  : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white'
              }`}
            >
              {scope}
            </button>
          )
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 border border-white/10 bg-white/[0.01] text-xs font-mono text-white/50 flex items-center justify-between">
        <span>
          DRAG ANY CARD TO REPOSITION // OR USE ARROW BUTTONS TO MOVE UP OR DOWN
        </span>
        <span className="text-kred uppercase font-bold">
          {orderedItems.length} ITEMS IN SCOPE
        </span>
      </div>

      {/* Draggable Items List */}
      {loading ? (
        <div className="py-24 text-center font-mono text-xs tracking-widest text-white/40 uppercase animate-pulse">
          LOADING ORDERING HIERARCHY...
        </div>
      ) : orderedItems.length === 0 ? (
        <div className="py-24 border border-white/10 bg-white/[0.01] text-center p-8">
          <div className="w-12 h-[1px] bg-kred mx-auto mb-6" />
          <h3 className="text-xl font-bold uppercase tracking-widest text-white mb-2">
            NO PRODUCTS TO REORDER
          </h3>
          <p className="text-white/40 text-xs font-mono mb-6">
            There are currently no products under the &quot;{activeScope}&quot; scope.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orderedItems.map((item, index) => {
            const hasImg = item.images && item.images.length > 0 && item.images[0];
            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className="group p-5 border border-white/10 bg-black hover:border-white/40 cursor-grab active:cursor-grabbing transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Drag Handle & Position & Product Info */}
                <div className="flex items-center space-x-6">
                  {/* Grip Icon */}
                  <div className="text-white/30 group-hover:text-white font-mono text-sm tracking-widest select-none">
                    ⋮⋮
                  </div>

                  {/* Position Badge */}
                  <div className="w-12 text-center">
                    <span className="text-lg font-mono font-bold text-kred">
                      #{index + 1}
                    </span>
                  </div>

                  {/* Thumbnail */}
                  <div className="w-14 h-16 border border-white/10 bg-white/5 p-1 flex-shrink-0 flex items-center justify-center">
                    {hasImg ? (
                      <img
                        src={item.images[0]}
                        alt={item.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-[8px] font-mono text-white/30 uppercase">
                        NO IMG
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-1">
                    <div className="text-sm font-bold uppercase tracking-wider text-white">
                      {item.name}
                    </div>
                    <div className="flex items-center space-x-3 text-xs font-mono text-white/40">
                      <span>MODULE: {item.module}</span>
                      <span>•</span>
                      <span>₹{item.price.toLocaleString('en-IN')}</span>
                      <span>•</span>
                      <span className={item.is_visible ? 'text-white/60' : 'text-kred'}>
                        {item.is_visible ? 'VISIBLE' : 'HIDDEN'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Move Controls */}
                <div className="flex items-center space-x-2 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveItem(index, 0)}
                    title="Move to First Position"
                    className="px-2.5 py-1.5 border border-white/10 text-white/60 hover:border-white hover:text-white font-mono text-xs uppercase disabled:opacity-20"
                  >
                    ⤒ TOP
                  </button>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveItem(index, index - 1)}
                    title="Move Up One Position"
                    className="px-3 py-1.5 border border-white/10 text-white/60 hover:border-white hover:text-white font-mono text-xs uppercase disabled:opacity-20"
                  >
                    ↑ UP
                  </button>
                  <button
                    type="button"
                    disabled={index === orderedItems.length - 1}
                    onClick={() => moveItem(index, index + 1)}
                    title="Move Down One Position"
                    className="px-3 py-1.5 border border-white/10 text-white/60 hover:border-white hover:text-white font-mono text-xs uppercase disabled:opacity-20"
                  >
                    ↓ DOWN
                  </button>
                  <button
                    type="button"
                    disabled={index === orderedItems.length - 1}
                    onClick={() => moveItem(index, orderedItems.length - 1)}
                    title="Move to Last Position"
                    className="px-2.5 py-1.5 border border-white/10 text-white/60 hover:border-white hover:text-white font-mono text-xs uppercase disabled:opacity-20"
                  >
                    ⤓ BOTTOM
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
