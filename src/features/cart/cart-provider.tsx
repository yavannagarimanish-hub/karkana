'use client';

import React from 'react';

import { calculateDelivery, type DeliveryCalculation } from '@/core/domain/pricing';

export const CART_STORAGE_KEY = 'karkana.cart.v2';

export interface CartLine {
  productId: string;
  quantity: number;
  personalizationImage?: string | null;
  customizationNotes?: string | null;
  unitPricePaise?: number;
  variantLabel?: string | null;
  parentTitle?: string | null;
}

export interface CartQuoteData {
  lines: Array<{
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
  }>;
  totals: {
    subtotalPaise: number;
    feesPaise: number;
    shippingPaise: number;
    totalPaise: number;
    itemCount: number;
  };
  unavailable: { productId: string; reason: string }[];
  minimumPaise?: number;
  shortfallPaise?: number;
  freeShippingOverPaise?: number | null;
  freeShippingShortfallPaise?: number;
}

export interface CartContextValue {
  lines: CartLine[];
  hydrated: boolean;
  count: number;
  subtotalPaise: number;
  delivery: DeliveryCalculation;
  quote: CartQuoteData | null;
  quoteLoading: boolean;
  add: (line: CartLine) => void;
  setQuantity: (productId: string, quantity: number, personalizationImage?: string | null) => void;
  remove: (productId: string, personalizationImage?: string | null) => void;
  clear: () => void;
  has: (productId: string) => boolean;
  registerPrice: (productId: string, unitPricePaise: number) => void;
}

const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let snapshot: CartLine[] | null = null;
const priceCache = new Map<string, number>();

function parse(raw: string): CartLine[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => {
      const unitPrice =
        typeof item.unitPricePaise === 'number' && Number.isFinite(item.unitPricePaise)
          ? item.unitPricePaise
          : undefined;
      const productId = String(item.productId ?? '');
      if (productId && unitPrice !== undefined) {
        priceCache.set(productId, unitPrice);
      }
      return {
        productId,
        quantity: Number(item.quantity ?? 1),
        personalizationImage: typeof item.personalizationImage === 'string' ? item.personalizationImage : null,
        customizationNotes: typeof item.customizationNotes === 'string' ? item.customizationNotes : null,
        unitPricePaise: unitPrice,
      };
    })
    .filter((line) => line.productId.length > 0 && line.quantity > 0);
}

function readStored(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    return raw ? parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(lines: CartLine[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Private browsing or a full quota: the cart simply will not persist.
  }
}

/**
 * The cart lives in a module-level store rather than in component state so that
 * reading it never needs a hydration effect, and so a cart change made before
 * React has mounted (a deep-linked product page) is not lost.
 */
function getSnapshot(): CartLine[] {
  if (snapshot === null) snapshot = readStored();
  return snapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(next: CartLine[]) {
  snapshot = next;
  persist(next);
  for (const listener of listeners) listener();
}

function lineKey(line: Pick<CartLine, 'productId' | 'personalizationImage'>): string {
  return `${line.productId}::${line.personalizationImage ?? ''}`;
}

const CartContext = React.createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const lines = React.useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const hydrated = React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const [rawQuote, setRawQuote] = React.useState<CartQuoteData | null>(null);
  const [quoteLoading, setQuoteLoading] = React.useState(false);

  const signature = React.useMemo(
    () => JSON.stringify(lines.map((l) => [l.productId, l.quantity, l.personalizationImage, l.customizationNotes])),
    [lines],
  );

  const count = lines.reduce((total, line) => total + line.quantity, 0);
  const emptyCart = lines.length === 0;
  const quote = emptyCart ? null : rawQuote;

  // Sync with /api/v1/cart
  React.useEffect(() => {
    if (!hydrated || emptyCart) return;

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setQuoteLoading(true);
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

        if (response.ok) {
          const payload = (await response.json()) as CartQuoteData;
          setRawQuote(payload);
          payload.lines.forEach((l) => {
            if (l.unitPricePaise) {
              priceCache.set(l.productId, l.unitPricePaise);
            }
          });
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[karkana] Failed to price cart:', err);
        }
      } finally {
        setQuoteLoading(false);
      }
    }, 100);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
    // `signature` is the stable dependency; `lines` is read inside the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, emptyCart, signature]);

  // Compute subtotal immediately (optimistic via cached prices + server authoritative when fresh)
  const estimatedSubtotal = lines.reduce((acc, line) => {
    const price = line.unitPricePaise ?? priceCache.get(line.productId) ?? 0;
    return acc + price * line.quantity;
  }, 0);

  const subtotalPaise =
    quote && quote.totals.itemCount === count && quote.totals.subtotalPaise > 0
      ? quote.totals.subtotalPaise
      : estimatedSubtotal;

  const delivery = calculateDelivery(subtotalPaise, quote?.totals.feesPaise ?? 0);

  const value = React.useMemo<CartContextValue>(() => {
    const registerPrice = (productId: string, unitPricePaise: number) => {
      priceCache.set(productId, unitPricePaise);
    };

    const add = (line: CartLine) => {
      if (line.unitPricePaise) {
        priceCache.set(line.productId, line.unitPricePaise);
      }
      const current = getSnapshot();
      const key = lineKey(line);
      const index = current.findIndex((item) => lineKey(item) === key);

      if (index >= 0) {
        const next = [...current];
        next[index] = {
          ...next[index]!,
          quantity: Math.min(99, next[index]!.quantity + line.quantity),
          unitPricePaise: line.unitPricePaise ?? next[index]!.unitPricePaise,
          variantLabel: line.variantLabel ?? next[index]!.variantLabel,
          parentTitle: line.parentTitle ?? next[index]!.parentTitle,
        };
        emit(next);
        return;
      }
      emit([...current, line]);
    };

    const setQuantity = (productId: string, quantity: number, personalizationImage?: string | null) => {
      const key = `${productId}::${personalizationImage ?? ''}`;
      emit(
        getSnapshot()
          .map((line) => (lineKey(line) === key ? { ...line, quantity } : line))
          .filter((line) => line.quantity > 0),
      );
    };

    const remove = (productId: string, personalizationImage?: string | null) => {
      const key = `${productId}::${personalizationImage ?? ''}`;
      emit(getSnapshot().filter((line) => lineKey(line) !== key));
    };

    return {
      lines,
      hydrated,
      count,
      subtotalPaise,
      delivery,
      quote,
      quoteLoading,
      add,
      setQuantity,
      remove,
      clear: () => {
        emit([]);
        setRawQuote(null);
      },
      has: (productId: string) => lines.some((line) => line.productId === productId),
      registerPrice,
    };
  }, [lines, hydrated, count, subtotalPaise, delivery, quote, quoteLoading]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = React.useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}
