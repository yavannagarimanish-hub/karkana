'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { formatINR } from '@/core/domain/money';
import { useCart } from './cart-provider';

export function FloatingCartBar() {
  const pathname = usePathname();
  const { count, subtotalPaise, delivery, hydrated } = useCart();

  // If not hydrated, cart is empty, or already on /cart or /checkout, hide the floating bar
  if (!hydrated || count === 0 || pathname === '/cart' || pathname === '/checkout') {
    return null;
  }

  const { isBelowMinimum, isFreeDelivery, progressMessage, deliveryChargeLabel } = delivery;

  return (
    <aside
      aria-label="Floating cart summary"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-3 sm:px-6 lg:bottom-4"
    >
      <div className="pointer-events-auto flex w-full max-w-4xl items-center justify-between gap-3 rounded-sm border border-hairline-strong bg-void/95 p-3 shadow-lift backdrop-blur-md sm:gap-6 sm:px-5 sm:py-3.5 text-fg">
        {/* Left: Cart Info & Delivery Status */}
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          {/* Subtotal & Count */}
          <div className="flex items-baseline gap-2 shrink-0">
            <span className="numeric text-base font-extrabold tracking-tight text-fg sm:text-lg">
              {formatINR(subtotalPaise)}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-dim">
              ({count} {count === 1 ? 'item' : 'items'})
            </span>
          </div>

          <span className="hidden sm:inline-block h-3.5 w-px bg-hairline shrink-0" aria-hidden />

          {/* Delivery & Progress Messages */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            {isBelowMinimum ? (
              <span className="font-medium text-ember">
                {progressMessage}
              </span>
            ) : isFreeDelivery ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
                <span>Free delivery</span>
                <span className="text-fg-dim">·</span>
                <span className="numeric text-fg-muted">Delivery: ₹0</span>
              </span>
            ) : (
              <span className="inline-flex flex-wrap items-center gap-1.5">
                <span className="numeric font-medium text-fg-muted">
                  Delivery: {deliveryChargeLabel}
                </span>
                <span className="text-fg-dim">·</span>
                <span className="text-ember font-medium">
                  {progressMessage}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/cart"
            className="inline-flex h-9 items-center justify-center rounded-sm border border-hairline bg-panel px-3 text-xs font-semibold uppercase tracking-[0.08em] text-fg transition-colors hover:border-hairline-strong hover:bg-panel-raised"
          >
            View Cart
          </Link>

          {isBelowMinimum ? (
            <button
              type="button"
              disabled
              title="Minimum order of ₹599 required to checkout"
              aria-disabled="true"
              className="inline-flex h-9 items-center justify-center rounded-sm bg-panel-raised px-4 text-xs font-semibold uppercase tracking-[0.08em] text-fg-dim opacity-60 cursor-not-allowed"
            >
              Checkout
            </button>
          ) : (
            <Link
              href="/checkout"
              className="inline-flex h-9 items-center justify-center rounded-sm bg-ember px-4 text-xs font-semibold uppercase tracking-[0.08em] text-fg shadow-sm transition-colors hover:bg-ember-bright"
            >
              Checkout
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
