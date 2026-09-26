'use client';

import React from 'react';

export const CART_STORAGE_KEY = 'karkana.cart.v2';

export interface CartLine {
  productId: string;
  quantity: number;
  personalizationImage?: string | null;
  customizationNotes?: string | null;
}

export interface CartContextValue {
  lines: CartLine[];
  hydrated: boolean;
  count: number;
  add: (line: CartLine) => void;
  setQuantity: (productId: string, quantity: number, personalizationImage?: string | null) => void;
  remove: (productId: string, personalizationImage?: string | null) => void;
  clear: () => void;
  has: (productId: string) => boolean;
}

const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let snapshot: CartLine[] | null = null;

function parse(raw: string): CartLine[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      productId: String(item.productId ?? ''),
      quantity: Number(item.quantity ?? 1),
      personalizationImage: typeof item.personalizationImage === 'string' ? item.personalizationImage : null,
      customizationNotes: typeof item.customizationNotes === 'string' ? item.customizationNotes : null,
    }))
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

  const value = React.useMemo<CartContextValue>(() => {
    const add = (line: CartLine) => {
      const current = getSnapshot();
      const key = lineKey(line);
      const index = current.findIndex((item) => lineKey(item) === key);

      if (index >= 0) {
        const next = [...current];
        next[index] = { ...next[index]!, quantity: Math.min(99, next[index]!.quantity + line.quantity) };
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
      count: lines.reduce((total, line) => total + line.quantity, 0),
      add,
      setQuantity,
      remove,
      clear: () => emit([]),
      has: (productId: string) => lines.some((line) => line.productId === productId),
    };
  }, [lines, hydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = React.useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}
