'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { compareProductPositions } from '@/core/domain/catalogue';
import {
  PRODUCT_MODULES,
  type Product,
  type ProductModule,
  primaryImage,
} from '@/core/domain/product';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Table, TD, TH, THead, TR } from '@/ui/table';
import { ProductStatusBadges } from './product-table';

interface Props {
  initialProducts: Product[];
}

export function ProductReorder({ initialProducts }: Props) {
  const router = useRouter();

  // Group and sort initial products by module
  const initialByModule = React.useMemo(() => {
    const map: Record<ProductModule, Product[]> = {
      BASIC: [],
      CUSTOMIZED: [],
      PERSONALIZED: [],
    };
    for (const p of initialProducts) {
      if (map[p.module]) {
        map[p.module].push(p);
      }
    }
    for (const mod of PRODUCT_MODULES) {
      map[mod].sort(compareProductPositions);
    }
    return map;
  }, [initialProducts]);

  const [activeModule, setActiveModule] = React.useState<ProductModule>('BASIC');
  const [itemsByModule, setItemsByModule] = React.useState<Record<ProductModule, Product[]>>(initialByModule);
  const [savedOrderIds, setSavedOrderIds] = React.useState<Record<ProductModule, string[]>>(() => ({
    BASIC: initialByModule.BASIC.map((p) => p.id),
    CUSTOMIZED: initialByModule.CUSTOMIZED.map((p) => p.id),
    PERSONALIZED: initialByModule.PERSONALIZED.map((p) => p.id),
  }));

  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ type: 'ok' | 'error'; message: string } | null>(null);

  // Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  const isCurrentDirty = React.useMemo(() => {
    const items = itemsByModule[activeModule] || [];
    const saved = savedOrderIds[activeModule] || [];
    if (items.length !== saved.length) return true;
    return items.some((item, idx) => item.id !== saved[idx]);
  }, [itemsByModule, savedOrderIds, activeModule]);

  const currentItems = itemsByModule[activeModule] || [];

  const isModuleDirty = (mod: ProductModule) => {
    const items = itemsByModule[mod] || [];
    const saved = savedOrderIds[mod] || [];
    if (items.length !== saved.length) return true;
    return items.some((item, idx) => item.id !== saved[idx]);
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const clampedTo = Math.max(0, Math.min(currentItems.length - 1, toIndex));
    const next = [...currentItems];
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) return;
    next.splice(clampedTo, 0, moved);

    setItemsByModule((prev) => ({
      ...prev,
      [activeModule]: next,
    }));
    setFeedback(null);
  };

  const handlePositionInputChange = (currentIndex: number, valueStr: string) => {
    const parsed = parseInt(valueStr, 10);
    if (Number.isNaN(parsed)) return;
    const targetIndex = parsed - 1; // 1-based to 0-based
    moveItem(currentIndex, targetIndex);
  };

  const handleReset = () => {
    const originalOrder = savedOrderIds[activeModule];
    const itemMap = new Map(currentItems.map((item) => [item.id, item]));
    const restored = originalOrder.map((id) => itemMap.get(id)!).filter(Boolean);

    setItemsByModule((prev) => ({
      ...prev,
      [activeModule]: restored,
    }));
    setFeedback(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);

    const ids = currentItems.map((p) => p.id);

    try {
      const res = await fetch('/api/v1/products/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to save order.');
      }

      setSavedOrderIds((prev) => ({
        ...prev,
        [activeModule]: ids,
      }));

      setFeedback({
        type: 'ok',
        message: `Order for ${activeModule} saved successfully (${ids.length} products). Storefront updated.`,
      });

      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save product order.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/products"
              className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted transition-colors hover:text-fg"
            >
              ← All Products
            </Link>
            <span className="text-fg-dim">/</span>
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ember">
              Manual Positioning
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-[0.02em] uppercase sm:text-3xl">
            Product Display Order
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted">
            Directly control the display sequence of products inside each category. Customers see products in this exact order on the homepage sections and category pages.
          </p>
        </div>

        {/* Global Save / Reset Actions */}
        <div className="flex items-center gap-3">
          {isCurrentDirty && (
            <Badge tone="warn" live>
              Unsaved changes
            </Badge>
          )}

          <Button
            size="sm"
            variant="ghost"
            disabled={!isCurrentDirty || saving}
            onClick={handleReset}
          >
            Reset
          </Button>

          <Button
            size="sm"
            variant={isCurrentDirty ? 'ember' : 'outline'}
            disabled={!isCurrentDirty || saving}
            onClick={handleSave}
          >
            {saving ? 'Saving Order…' : 'Save Order'}
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-sm border p-4 text-sm ${
            feedback.type === 'ok'
              ? 'border-hairline-strong bg-panel text-status-ok'
              : 'border-status-danger/40 bg-status-danger/10 text-status-danger'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs uppercase text-fg-ghost hover:text-fg"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Module Selector Tabs */}
      <div className="flex border-b border-hairline overflow-x-auto">
        {PRODUCT_MODULES.map((mod) => {
          const isSelected = activeModule === mod;
          const count = itemsByModule[mod]?.length || 0;
          const dirty = isModuleDirty(mod);

          return (
            <button
              key={mod}
              type="button"
              onClick={() => {
                setActiveModule(mod);
                setFeedback(null);
              }}
              className={`relative -mb-px flex items-center gap-2 border-b-2 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                isSelected
                  ? 'border-ember text-fg'
                  : 'border-transparent text-fg-dim hover:text-fg-muted'
              }`}
            >
              <span>{mod}</span>
              <span className={`numeric text-[11px] ${isSelected ? 'text-ember' : 'text-fg-ghost'}`}>
                ({count})
              </span>
              {dirty && (
                <span className="size-1.5 rounded-full bg-ember" title="Unsaved changes" />
              )}
            </button>
          );
        })}
      </div>

      {/* Helper instructions */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-dim">
        <p>
          Drag rows using <span className="font-mono text-fg font-semibold">⋮⋮</span> or use the <span className="font-mono text-fg font-semibold">↑</span> <span className="font-mono text-fg font-semibold">↓</span> buttons or type a number in the <span className="font-mono text-fg font-semibold">Position</span> box to reorder.
        </p>
        <p className="numeric">
          Showing {currentItems.length} products in {activeModule}
        </p>
      </div>

      {/* Table */}
      <div className="surface overflow-hidden rounded-sm">
        <Table>
          <THead>
            <TR>
              <TH className="w-10 text-center">Drag</TH>
              <TH className="w-32">Position</TH>
              <TH>Product</TH>
              <TH className="w-32">Product ID</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {currentItems.map((product, index) => {
              const image = primaryImage(product);
              const isFirst = index === 0;
              const isLast = index === currentItems.length - 1;
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index;

              return (
                <TR
                  key={product.id}
                  className={`transition-colors ${
                    isDragging ? 'opacity-40 bg-panel-raised' : ''
                  } ${isDragOver ? 'border-t-2 border-ember bg-panel' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverIndex !== index) {
                      setDragOverIndex(index);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverIndex === index) {
                      setDragOverIndex(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedIndex !== null && draggedIndex !== index) {
                      moveItem(draggedIndex, index);
                    }
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                >
                  {/* Drag Handle */}
                  <TD className="text-center align-middle">
                    <div
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', String(index));
                        setDraggedIndex(index);
                      }}
                      onDragEnd={() => {
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      className="inline-flex size-8 cursor-grab active:cursor-grabbing items-center justify-center rounded-sm text-fg-dim hover:bg-panel hover:text-fg"
                      title="Drag to reposition"
                    >
                      ⋮⋮
                    </div>
                  </TD>

                  {/* Position number & direct input */}
                  <TD>
                    <div className="flex items-center gap-2">
                      <span className="numeric inline-flex h-7 w-9 items-center justify-center rounded-xs bg-void font-mono text-xs font-bold text-ember shadow-hairline">
                        #{index + 1}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={currentItems.length}
                        defaultValue={index + 1}
                        key={`${product.id}-${index}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        onBlur={(e) => {
                          const val = e.currentTarget.value;
                          if (val && parseInt(val, 10) !== index + 1) {
                            handlePositionInputChange(index, val);
                          }
                        }}
                        className="h-7 w-14 rounded-xs bg-panel px-1.5 text-center font-mono text-xs text-fg shadow-hairline focus:outline-none focus:ring-1 focus:ring-ember"
                        title="Type a position number and press Enter to move"
                      />
                    </div>
                  </TD>

                  {/* Product Details */}
                  <TD>
                    <div className="flex items-center gap-3">
                      <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-sm bg-void p-1 shadow-hairline">
                        {image ? (
                          <Image
                            src={image}
                            alt=""
                            width={96}
                            height={96}
                            className="max-h-full w-auto max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-[9px] text-fg-ghost">No image</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/product/${product.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-sm font-semibold tracking-[0.04em] uppercase transition-colors hover:text-ember"
                        >
                          {product.name}
                        </Link>
                        <p className="numeric text-[11px] text-fg-dim">
                          {product.brand ? `${product.brand} · ` : ''}
                          {product.category || 'no category'}
                        </p>
                      </div>
                    </div>
                  </TD>

                  {/* Product ID */}
                  <TD>
                    <span className="font-mono text-xs font-bold tracking-wider text-fg-dim">
                      {product.id}
                    </span>
                  </TD>

                  {/* Status Badges */}
                  <TD>
                    <ProductStatusBadges product={product} />
                  </TD>

                  {/* Action Buttons */}
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveItem(index, 0)}
                        title="Move to top"
                        className="inline-flex h-8 px-2 items-center justify-center rounded-xs font-mono text-[10px] uppercase text-fg-dim shadow-hairline transition-colors hover:text-fg hover:bg-panel disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Top
                      </button>
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveItem(index, index - 1)}
                        title="Move up one position"
                        className="inline-flex size-8 items-center justify-center rounded-xs font-mono text-xs text-fg-dim shadow-hairline transition-colors hover:text-fg hover:bg-panel disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveItem(index, index + 1)}
                        title="Move down one position"
                        className="inline-flex size-8 items-center justify-center rounded-xs font-mono text-xs text-fg-dim shadow-hairline transition-colors hover:text-fg hover:bg-panel disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveItem(index, currentItems.length - 1)}
                        title="Move to bottom"
                        className="inline-flex h-8 px-2 items-center justify-center rounded-xs font-mono text-[10px] uppercase text-fg-dim shadow-hairline transition-colors hover:text-fg hover:bg-panel disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        End
                      </button>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
