'use client';

import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';
import type { ProductFamily } from '@/core/domain/catalog-families';
import { formatINR, discountPercent } from '@/core/domain/money';
import { requiresPersonalization } from '@/core/domain/product';
import { useCart } from '@/features/cart/cart-provider';
import { cn } from './cn';

export interface FamilyCardProps {
  family: ProductFamily;
  priority?: boolean;
  className?: string;
}

/**
 * Customer-facing family card:
 * Displays product family name, variant count, starting price, and "View options"
 * for grouped families, or instant "Add" / stepper for single-variant items.
 */
export function FamilyCard({ family, priority, className }: FamilyCardProps) {
  const { lines, hydrated, add, setQuantity } = useCart();

  const defaultVariant = family.defaultVariant;
  const image = defaultVariant.image;
  const price = family.fromPricePaise;
  const mrp = defaultVariant.mrpPaise;
  const off = mrp && mrp > price ? discountPercent(mrp, price) : 0;
  const width = defaultVariant.product.imageWidth ?? 1200;
  const height = defaultVariant.product.imageHeight ?? 1200;
  const needsPersonalization = requiresPersonalization(defaultVariant.product.module);

  const line = lines.find(
    (entry) => entry.productId === defaultVariant.id && (entry.personalizationImage ?? null) === null,
  );
  const qty = hydrated && line ? line.quantity : 0;
  const purchasable = family.inStock;

  const increment = () => add({ productId: defaultVariant.id, quantity: 1, unitPricePaise: price });
  const decrement = () => setQuantity(defaultVariant.id, qty - 1);

  const productUrl = `/product/${defaultVariant.id}`;

  return (
    <div
      className={cn(
        'surface group relative flex flex-col overflow-hidden rounded-sm',
        'transition-shadow duration-200 hover:shadow-hairline-strong',
        className,
      )}
    >
      <Link
        href={productUrl}
        className="flex flex-1 flex-col focus-visible:shadow-[inset_0_0_0_1px_var(--color-ember)]"
        aria-label={family.title}
      >
        <div className="relative flex aspect-square items-center justify-center overflow-hidden border-b border-hairline bg-void p-1.5 sm:p-5">
          {image ? (
            <Image
              src={image}
              alt={family.title}
              width={width}
              height={height}
              priority={priority}
              sizes="(max-width: 640px) 33vw, (max-width: 1024px) 33vw, 20vw"
              className="max-h-full w-auto max-w-full object-contain transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 text-center p-2">
              <span className="label text-[9px] sm:text-label text-fg-ghost">No image</span>
            </div>
          )}

          {family.hasMultipleVariants ? (
            <span className="numeric absolute top-1 left-1 sm:top-2 sm:left-2 rounded-xs bg-ember px-1 py-0.5 sm:px-1.5 text-[7px] sm:text-[9px] font-bold text-fg leading-none tracking-tight">
              {family.variants.length} VARIANTS
            </span>
          ) : off > 0 ? (
            <span className="numeric absolute top-1 left-1 sm:top-2 sm:left-2 rounded-xs bg-ember px-1 py-0.5 sm:px-1.5 text-[8px] sm:text-[10px] font-bold text-fg leading-none">
              {off}% OFF
            </span>
          ) : null}

          {!purchasable && (
            <div className="absolute inset-0 grid place-items-center bg-void/80 p-1 text-center">
              <span className="rounded-xs border border-status-danger px-1 py-0.5 sm:px-3 sm:py-1 font-mono text-[8px] sm:text-[11px] uppercase tracking-[0.08em] sm:tracking-[0.16em] text-status-danger leading-tight">
                Out of stock
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-0.5 sm:gap-1 p-1.5 sm:p-3">
          <span className="label truncate text-[8px] sm:text-[9px] text-fg-dim">
            {family.section}
          </span>
          <h3 className="line-clamp-2 min-h-[2.4em] text-[10px] sm:text-[13px] leading-tight sm:leading-snug font-semibold tracking-[0.02em] sm:tracking-[0.03em] text-fg uppercase">
            {family.title}
          </h3>
          {family.hasMultipleVariants ? (
            <span className="truncate text-[8px] sm:text-[10px] text-ember font-mono font-medium">
              {family.variants.length} options available
            </span>
          ) : (
            <span className="truncate text-[8px] sm:text-[10px] text-fg-dim">
              {defaultVariant.label && defaultVariant.label !== 'Standard' ? defaultVariant.label : '1 option'}
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1 sm:gap-2 border-t border-hairline p-1.5 sm:p-3">
        <div className="numeric flex sm:flex-col items-baseline sm:items-start gap-1 sm:gap-0">
          {family.hasMultipleVariants && (
            <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-fg-dim">From</span>
          )}
          <span className="text-xs sm:text-sm font-bold text-fg">{formatINR(price)}</span>
          {!family.hasMultipleVariants && mrp && mrp > price && (
            <span className="text-[9px] sm:text-[11px] text-fg-ghost line-through">
              {formatINR(mrp)}
            </span>
          )}
        </div>

        {family.hasMultipleVariants ? (
          <Link
            href={productUrl}
            className="flex items-center justify-center rounded-sm border border-ember px-1.5 py-1 sm:px-3 sm:py-1.5 font-mono text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.04em] sm:tracking-[0.08em] text-ember transition-colors hover:bg-ember hover:text-fg text-center whitespace-nowrap"
          >
            View options
          </Link>
        ) : needsPersonalization ? (
          <Link
            href={productUrl}
            className="flex items-center justify-center rounded-sm border border-ember px-2 py-1 sm:px-4 sm:py-1.5 font-mono text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.08em] sm:tracking-[0.14em] text-ember transition-colors hover:bg-ember hover:text-fg text-center"
          >
            Add
          </Link>
        ) : qty === 0 ? (
          <button
            type="button"
            onClick={increment}
            disabled={!purchasable}
            aria-label={`Add ${family.title} to cart`}
            className="flex items-center justify-center rounded-sm border border-ember px-2 py-1 sm:px-4 sm:py-1.5 font-mono text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.08em] sm:tracking-[0.14em] text-ember transition-colors hover:bg-ember hover:text-fg disabled:cursor-not-allowed disabled:border-hairline disabled:text-fg-dim disabled:hover:bg-transparent text-center"
          >
            Add
          </button>
        ) : (
          <div className="numeric flex items-stretch justify-center overflow-hidden rounded-sm border border-ember bg-ember text-fg">
            <button
              type="button"
              onClick={decrement}
              aria-label={`Decrease quantity of ${family.title}`}
              className="px-1.5 py-0.5 sm:px-2.5 sm:py-1.5 text-xs font-bold transition-colors hover:bg-ember-hover"
            >
              −
            </button>
            <span aria-live="polite" className="grid min-w-5 sm:min-w-7 place-items-center px-0.5 sm:px-1 text-[10px] sm:text-xs font-bold">
              {qty}
            </span>
            <button
              type="button"
              onClick={increment}
              aria-label={`Increase quantity of ${family.title}`}
              className="px-1.5 py-0.5 sm:px-2.5 sm:py-1.5 text-xs font-bold transition-colors hover:bg-ember-hover"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

