'use client';

import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';
import { formatINR } from '@/core/domain/money';
import { useCart, type CartLine } from '@/features/cart/cart-provider';
import { Button } from '@/ui/button';
import { EmptyState } from '@/ui/empty-state';
import { QuantityStepper } from '@/ui/quantity-stepper';
import { ProductGridSkeleton } from '@/ui/skeleton';

interface QuoteLine {
  productId: string;
  productName: string;
  productImage: string | null;
  module: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  personalizationFeePaise: number;
  personalizationImage: string | null;
  customizationNotes: string | null;
}

interface Quote {
  lines: QuoteLine[];
  totals: {
    subtotalPaise: number;
    feesPaise: number;
    shippingPaise: number;
    totalPaise: number;
    itemCount: number;
  };
  unavailable: { productId: string; reason: string }[];
}

const REASON_LABEL: Record<string, string> = {
  UNKNOWN_PRODUCT: 'no longer exists',
  PRODUCT_HIDDEN: 'is no longer published',
  PRODUCT_OUT_OF_STOCK: 'is out of stock',
  INVALID_QUANTITY: 'has an invalid quantity',
};

/**
 * The cart always shows **server prices**. Quantities live in the client
 * store; money is re-quoted by `/api/v1/cart` on every change, so a stale
 * `localStorage` can never change what the customer is charged.
 */
export function CartView() {
  const { lines, hydrated, setQuantity, remove, clear } = useCart();
  const [quote, setQuote] = React.useState<Quote | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const signature = React.useMemo(
    () => JSON.stringify(lines.map((line) => [line.productId, line.quantity, line.personalizationImage])),
    [lines],
  );

  // An empty cart is derived rather than stored, so the effect never has to
  // synchronise state it can compute.
  const emptyCart = lines.length === 0;

  React.useEffect(() => {
    if (!hydrated || emptyCart) return;

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      // Raised inside the debounced callback rather than the effect body, so a
      // rapid quantity change never paints an intermediate loading frame.
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/v1/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lines: lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              personalizationImage: line.personalizationImage ?? null,
              customizationNotes: line.customizationNotes ?? null,
            })),
          }),
          signal: controller.signal,
        });

        const payload = (await response.json()) as Quote & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? 'Could not price your cart.');
        setQuote(payload);
      } catch (fetchError) {
        if ((fetchError as Error).name !== 'AbortError') {
          setError((fetchError as Error).message);
        }
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
    // `signature` is the stable dependency; `lines` is read inside the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, emptyCart, signature]);

  const EMPTY: Quote = {
    lines: [],
    totals: { subtotalPaise: 0, feesPaise: 0, shippingPaise: 0, totalPaise: 0, itemCount: 0 },
    unavailable: [],
  };
  const view: Quote = emptyCart ? EMPTY : (quote ?? EMPTY);


  const lineFor = (line: CartLine) =>
    view.lines.find(
      (quoted) =>
        quoted.productId === line.productId &&
        (quoted.personalizationImage ?? null) === (line.personalizationImage ?? null),
    );

  if (!hydrated || (loading && !emptyCart && quote === null)) {
    /*
     * The heading renders here too, so the server-rendered HTML always carries
     * exactly one h1 and the loaded view does not shift the page title in.
     */
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:px-12">
        <header className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-[0.02em] uppercase sm:text-3xl">
            Your cart
          </h1>
          <p className="numeric mt-2 text-xs text-fg-dim">Loading your cart</p>
        </header>
        <ProductGridSkeleton count={2} />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-8">
        <EmptyState
          as="h1"
          title="Your cart is empty"
          message="Add something from the catalogue and it will show up here with live prices."
          actionLabel="Browse the catalogue"
          actionHref="/"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:px-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[0.02em] uppercase sm:text-3xl">Your cart</h1>
          <p className="numeric mt-2 text-xs text-fg-dim">
            {view.totals.itemCount ?? 0} {view.totals.itemCount === 1 ? 'item' : 'items'} · prices
            verified against the live catalogue
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={clear}>
          Clear cart
        </Button>
      </header>

      {error && (
        <p role="alert" className="mb-6 rounded-sm border border-status-danger/50 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </p>
      )}

      {quote && quote.unavailable.length > 0 && (
        <div className="mb-6 rounded-sm border border-status-warn/40 bg-status-warn/10 p-4">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-status-warn">
            {quote.unavailable.length} {quote.unavailable.length === 1 ? 'item was' : 'items were'} removed
            from this quote
          </p>
          <ul className="mt-2 space-y-1 text-sm text-fg-muted">
            {quote.unavailable.map((entry) => (
              <li key={`${entry.productId}-${entry.reason}`}>
                <span className="numeric">{entry.productId}</span> {REASON_LABEL[entry.reason] ?? 'is unavailable'}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        <ul className="space-y-4 lg:col-span-8">
          {lines.map((line) => {
            const quoted = lineFor(line);

            return (
              <li key={`${line.productId}-${line.personalizationImage ?? ''}`} className="surface rounded-sm p-4">
                <div className="flex gap-4">
                  <Link
                    href={`/product/${line.productId}`}
                    className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-sm bg-void p-2 shadow-hairline sm:size-28"
                  >
                    {quoted?.productImage ? (
                      <Image
                        src={quoted.productImage}
                        alt={quoted.productName}
                        width={400}
                        height={400}
                        className="max-h-full w-auto max-w-full object-contain"
                      />
                    ) : (
                      <span className="label">No image</span>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/product/${line.productId}`}
                          className="line-clamp-2 text-sm font-semibold tracking-[0.04em] uppercase transition-colors hover:text-ember"
                        >
                          {quoted?.productName ?? line.productId}
                        </Link>
                        <p className="numeric mt-1 text-[11px] text-fg-dim">
                          {line.productId}
                          {quoted ? ` · ${formatINR(quoted.unitPricePaise)} each` : ''}
                        </p>
                      </div>

                      {quoted && (
                        <span className="numeric text-sm font-bold text-fg">
                          {formatINR(quoted.lineTotalPaise)}
                        </span>
                      )}
                    </div>

                    {line.customizationNotes && (
                      <p className="mt-2 rounded-sm bg-panel-raised p-2 text-xs text-fg-muted">
                        “{line.customizationNotes}”
                      </p>
                    )}
                    {line.personalizationImage && (
                      <p className="mt-2 text-[11px] text-ember">Personalized box · photo attached</p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <QuantityStepper
                        value={line.quantity}
                        onChange={(next) => setQuantity(line.productId, next, line.personalizationImage ?? null)}
                        label={`Quantity for ${quoted?.productName ?? line.productId}`}
                      />
                      <button
                        type="button"
                        onClick={() => remove(line.productId, line.personalizationImage ?? null)}
                        className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-dim transition-colors hover:text-status-danger"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="lg:col-span-4">
          <div className="surface sticky top-28 rounded-sm p-5">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-fg">Summary</h2>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-fg-muted">Subtotal</dt>
                <dd className="numeric text-fg">{formatINR(view.totals.subtotalPaise ?? 0)}</dd>
              </div>
              {(view.totals.feesPaise ?? 0) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-fg-muted">Personalization</dt>
                  <dd className="numeric text-fg">{formatINR(view.totals.feesPaise ?? 0)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-fg-muted">Shipping</dt>
                <dd className="numeric text-fg">
                  {(view.totals.shippingPaise ?? 0) === 0
                    ? 'Free'
                    : formatINR(view.totals.shippingPaise ?? 0)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-hairline pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd className="numeric text-fg">{formatINR(view.totals.totalPaise ?? 0)}</dd>
              </div>
            </dl>

            <Button
              href={quote && quote.totals.itemCount > 0 ? '/checkout' : undefined}
              block
              size="lg"
              className="mt-6"
              disabled={!quote || quote.totals.itemCount === 0}
            >
              {loading ? 'Re-pricing…' : 'Checkout'}
            </Button>

            <p className="mt-4 text-[11px] text-fg-dim">
              Cash on delivery. The total is recalculated on our side when you place the order.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
