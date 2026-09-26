'use client';

import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';
import { primaryImage, pricePaise, mrpPaise, requiresPersonalization } from '@/core/domain/product';
import { formatINR, discountPercent } from '@/core/domain/money';
import type { Product } from '@/core/domain/product';
import { useCart } from '@/features/cart/cart-provider';
import { cn } from './cn';

export interface ProductCardProps {
  product: Product;
  /** Rendered in the top-right corner, e.g. a wishlist toggle. */
  action?: React.ReactNode;
  priority?: boolean;
  className?: string;
}

/**
 * Grocery-app style card, in the house palette (Instamart / BigBasket layout):
 * square image well, name, unit, then a price block on the left and an
 * ADD control on the right that turns into a quantity stepper once the item
 * is in the cart. Tapping the image or name still opens the detail page.
 *
 * PERSONALIZED items cannot be added from the grid (they need an uploaded
 * photograph), so their control is a link through to the product page.
 */
export function ProductCard({ product, action, priority, className }: ProductCardProps) {
  const { lines, hydrated, add, setQuantity } = useCart();

  const image = primaryImage(product);
  const price = pricePaise(product);
  const mrp = mrpPaise(product);
  const off = mrp ? discountPercent(mrp, price) : 0;
  const width = product.imageWidth ?? 1200;
  const height = product.imageHeight ?? 1200;
  const needsPersonalization = requiresPersonalization(product.module);

  const line = lines.find(
    (entry) => entry.productId === product.id && (entry.personalizationImage ?? null) === null,
  );
  const qty = hydrated && line ? line.quantity : 0;
  const purchasable = product.inStock && product.isVisible;

  const increment = () => add({ productId: product.id, quantity: 1 });
  const decrement = () => setQuantity(product.id, qty - 1);

  return (
    <div
      className={cn(
        'surface group relative flex flex-col overflow-hidden rounded-sm',
        'transition-shadow duration-200 hover:shadow-hairline-strong',
        className,
      )}
    >
      <Link
        href={`/product/${product.id}`}
        className="flex flex-1 flex-col focus-visible:shadow-[inset_0_0_0_1px_var(--color-ember)]"
        aria-label={product.name}
      >
        <div className="relative flex aspect-square items-center justify-center overflow-hidden border-b border-hairline bg-void p-3 sm:p-5">
          {image ? (
            <Image
              src={image}
              alt={product.name}
              width={width}
              height={height}
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="max-h-full w-auto max-w-full object-contain transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03]"
            />
          ) : (
            <span className="label">No image</span>
          )}

          {off > 0 && (
            <span className="numeric absolute top-2 left-2 rounded-xs bg-ember px-1.5 py-0.5 text-[10px] font-bold text-fg">
              {off}% OFF
            </span>
          )}

          {action && <div className="absolute top-2 right-2">{action}</div>}

          {!purchasable && (
            <div className="absolute inset-0 grid place-items-center bg-void/80">
              <span className="rounded-xs border border-status-danger px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-status-danger">
                Out of stock
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3">
          {product.category && <span className="label truncate">{product.category}</span>}
          <h3 className="line-clamp-2 min-h-[2.4em] text-[13px] leading-snug font-semibold tracking-[0.03em] text-fg uppercase">
            {product.name}
          </h3>
          {product.unit && <span className="truncate text-[11px] text-fg-dim">{product.unit}</span>}
        </div>
      </Link>

      <div className="flex items-end justify-between gap-2 border-t border-hairline p-3">
        <div className="numeric flex flex-col">
          <span className="text-sm font-bold text-fg">{formatINR(price)}</span>
          {mrp && mrp > price && (
            <span className="text-[11px] text-fg-ghost line-through">{formatINR(mrp)}</span>
          )}
        </div>

        {needsPersonalization ? (
          <Link
            href={`/product/${product.id}`}
            className="rounded-sm border border-ember px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ember transition-colors hover:bg-ember hover:text-fg"
          >
            Add
          </Link>
        ) : qty === 0 ? (
          <button
            type="button"
            onClick={increment}
            disabled={!purchasable}
            aria-label={`Add ${product.name} to cart`}
            className="rounded-sm border border-ember px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ember transition-colors hover:bg-ember hover:text-fg disabled:cursor-not-allowed disabled:border-hairline disabled:text-fg-dim disabled:hover:bg-transparent"
          >
            Add
          </button>
        ) : (
          <div className="numeric flex items-stretch overflow-hidden rounded-sm border border-ember bg-ember text-fg">
            <button
              type="button"
              onClick={decrement}
              aria-label={`Decrease quantity of ${product.name}`}
              className="px-2.5 py-1.5 font-bold transition-colors hover:bg-ember-hover"
            >
              −
            </button>
            <span aria-live="polite" className="grid min-w-7 place-items-center px-1 text-xs font-bold">
              {qty}
            </span>
            <button
              type="button"
              onClick={increment}
              aria-label={`Increase quantity of ${product.name}`}
              className="px-2.5 py-1.5 font-bold transition-colors hover:bg-ember-hover"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
