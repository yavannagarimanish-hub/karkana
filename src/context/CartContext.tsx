'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CartItem, Product } from '@/types';

interface CartContextType {
  items: CartItem[];
  addToCart: (
    product: Product,
    quantity?: number,
    personalizationImage?: string,
    customizationNotes?: string
  ) => void;
  removeFromCart: (productId: string, personalizationImage?: string) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    personalizationImage?: string
  ) => void;
  clearCart: () => void;
  subtotal: number;
  totalCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'karkana_cart_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed reading cart from localStorage:', e);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.error('Failed writing cart to localStorage:', e);
      }
    }
  }, [items, mounted]);

  const addToCart = (
    product: Product,
    quantity = 1,
    personalizationImage?: string,
    customizationNotes?: string
  ) => {
    setItems((prev) => {
      // For personalized items, differentiate by image and notes
      const existingIndex = prev.findIndex(
        (item) =>
          item.productId === product.id &&
          item.personalizationImage === personalizationImage &&
          item.customizationNotes === customizationNotes
      );

      if (existingIndex > -1) {
        const copy = [...prev];
        copy[existingIndex].quantity += quantity;
        return copy;
      }

      return [
        ...prev,
        {
          productId: product.id,
          product,
          quantity,
          personalizationImage,
          customizationNotes,
        },
      ];
    });
  };

  const removeFromCart = (productId: string, personalizationImage?: string) => {
    setItems((prev) =>
      prev.filter(
        (item) =>
          !(
            item.productId === productId &&
            item.personalizationImage === personalizationImage
          )
      )
    );
  };

  const updateQuantity = (
    productId: string,
    quantity: number,
    personalizationImage?: string
  ) => {
    if (quantity <= 0) {
      removeFromCart(productId, personalizationImage);
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (
          item.productId === productId &&
          item.personalizationImage === personalizationImage
        ) {
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        subtotal,
        totalCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
