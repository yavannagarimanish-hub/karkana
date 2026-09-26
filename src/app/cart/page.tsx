'use client';

import React from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import SectionHeader from '@/components/SectionHeader';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, subtotal, totalCount, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="w-full bg-black min-h-[75vh] flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="w-12 h-[1px] bg-kred mb-8" />
        <h1 className="text-3xl sm:text-5xl font-bold uppercase tracking-ultra text-white mb-4">
          YOUR CART IS EMPTY
        </h1>
        <p className="text-white/40 text-xs sm:text-sm font-mono max-w-md tracking-wider leading-relaxed mb-12">
          No pyrotechnic formulations or bespoke commissions have been added to your session.
        </p>
        <Link
          href="/"
          className="px-8 py-4 bg-white text-black font-bold uppercase font-mono text-xs tracking-widest hover:bg-kred hover:text-white transition-all duration-300"
        >
          EXPLORE STOREFRONT
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-black min-h-screen py-12 sm:py-24 px-4 sm:px-12 max-w-7xl mx-auto">
      <SectionHeader
        number="CART"
        title="COMMISSION SUMMARY"
        subtitle={`RETAINING ${totalCount} ITEM${totalCount > 1 ? 'S' : ''} IN ACTIVE SELECTION`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
        {/* Left Column: Items List */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8">
          {items.map((item, index) => {
            const hasProdImage =
              item.product.images && item.product.images.length > 0 && item.product.images[0];

            return (
              <div
                key={`${item.productId}-${index}`}
                className="p-4 sm:p-8 border border-white/10 bg-white/[0.01] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              >
                {/* Product & Personalization Previews */}
                <div className="flex items-start sm:items-center space-x-3 sm:space-x-6">
                  {/* Product Thumbnail */}
                  <div className="relative w-16 h-16 sm:w-24 sm:h-24 bg-white/[0.02] border border-white/10 flex-shrink-0 flex items-center justify-center p-2">
                    {hasProdImage ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="max-w-full max-h-full w-auto h-auto object-contain"
                      />
                    ) : (
                      <span className="text-[9px] font-mono text-white/30 text-center uppercase p-1">
                        NO IMG
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono tracking-widest uppercase text-kred">
                      {item.product.module}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                      {item.product.name}
                    </h3>
                    <div className="text-xs font-mono text-white/60">
                      ₹{item.product.price.toLocaleString('en-IN')} each
                    </div>

                    {/* Personalization Details if present */}
                    {item.personalizationImage && (
                      <div className="mt-3 pt-3 border-t border-white/10 flex items-center space-x-3">
                        <div className="w-12 h-12 border border-kred/50 p-1 flex-shrink-0 bg-black flex items-center justify-center">
                          <img
                            src={item.personalizationImage}
                            alt="Custom Customer Upload"
                            className="max-w-full max-h-full w-auto h-auto object-contain"
                          />
                        </div>
                        <div className="text-[10px] font-mono text-white/50">
                          <span className="text-kred uppercase font-bold block">
                            CUSTOM PHOTO ATTACHED
                          </span>
                          {item.customizationNotes && (
                            <span className="truncate block max-w-xs text-white/70 italic">
                              &ldquo;{item.customizationNotes}&rdquo;
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quantity Controls & Total */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-white/5 gap-4">
                  <div className="text-base sm:text-lg font-mono font-bold text-white tracking-wider">
                    ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex items-center border border-white/20 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.quantity - 1,
                            item.personalizationImage
                          )
                        }
                        className="px-3 py-1.5 hover:bg-white hover:text-black transition-colors"
                      >
                        -
                      </button>
                      <span className="px-4 py-1.5 text-white font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.quantity + 1,
                            item.personalizationImage
                          )
                        }
                        className="px-3 py-1.5 hover:bg-white hover:text-black transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId, item.personalizationImage)}
                      className="text-xs font-mono uppercase text-white/40 hover:text-kred transition-colors"
                      title="Remove Item"
                    >
                      REMOVE
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4">
            <button
              type="button"
              onClick={clearCart}
              className="text-xs font-mono tracking-widest uppercase text-white/30 hover:text-kred transition-colors"
            >
              CLEAR ENTIRE CART
            </button>
            <Link
              href="/"
              className="text-xs font-mono tracking-widest uppercase text-white/60 hover:text-white transition-colors"
            >
              ← CONTINUE EXPLORING
            </Link>
          </div>
        </div>

        {/* Right Column: Order Summary & Checkout Trigger */}
        <div className="lg:col-span-4 p-5 sm:p-8 border border-white/10 bg-white/[0.01] space-y-6">
          <div className="text-xs font-mono uppercase tracking-widest text-kred">
            PAYMENT BREAKDOWN
          </div>

          <div className="space-y-3 font-mono text-xs border-b border-white/10 pb-6">
            <div className="flex justify-between text-white/60">
              <span>ITEMS TOTAL ({totalCount})</span>
              <span className="text-white">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>LOGISTICS / SHIPPING</span>
              <span className="text-white uppercase font-bold">FREE DELIVERY</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>PAYMENT METHOD</span>
              <span className="text-kred uppercase font-bold">CASH ON DELIVERY</span>
            </div>
          </div>

          <div className="flex justify-between items-baseline pt-2">
            <span className="text-xs font-mono tracking-widest uppercase text-white/40">
              TOTAL DUE
            </span>
            <span className="text-3xl font-mono font-bold text-white tracking-wider">
              ₹{subtotal.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-4 border border-white/10 bg-black text-[11px] font-mono text-white/50 leading-relaxed">
            Payment is collected strictly upon delivery. No advance online gateway or credit card required.
          </div>

          <Link
            href="/checkout"
            className="block w-full py-5 bg-white text-black font-bold uppercase tracking-widest text-xs font-mono text-center hover:bg-kred hover:text-white transition-all duration-300"
          >
            PROCEED TO CHECKOUT →
          </Link>
        </div>
      </div>
    </div>
  );
}
