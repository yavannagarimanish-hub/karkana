'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import SectionHeader from '@/components/SectionHeader';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, totalCount, clearCart } = useCart();

  const [formData, setFormData] = useState({
    customerName: '',
    mobile: '',
    houseFlat: '',
    streetLocality: '',
    city: '',
    state: '',
    pincode: '',
    instructions: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="w-full bg-black min-h-[70vh] flex flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-widest text-white mb-4">
          YOUR CART IS EMPTY
        </h1>
        <p className="text-white/40 text-xs font-mono mb-8">
          Please add products before proceeding to checkout.
        </p>
        <Link
          href="/"
          className="px-6 py-3 border border-white/20 text-white font-mono text-xs uppercase tracking-widest hover:border-kred hover:text-kred transition-colors"
        >
          RETURN TO CATALOGUE
        </Link>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic validation
    if (
      !formData.customerName.trim() ||
      !formData.mobile.trim() ||
      !formData.houseFlat.trim() ||
      !formData.streetLocality.trim() ||
      !formData.city.trim() ||
      !formData.state.trim() ||
      !formData.pincode.trim()
    ) {
      setErrorMessage('Please fill in all required delivery address fields.');
      return;
    }

    if (!/^\d{10}$/.test(formData.mobile.trim().replace(/\D/g, ''))) {
      setErrorMessage('Please enter a valid 10-digit mobile number for dispatch coordination.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        customerName: formData.customerName.trim(),
        mobile: formData.mobile.trim(),
        address: {
          houseFlat: formData.houseFlat.trim(),
          streetLocality: formData.streetLocality.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
          instructions: formData.instructions.trim(),
        },
        items: items.map((item) => ({
          productId: item.productId,
          productName: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          module: item.product.module,
          productImage: item.product.images?.[0] || '',
          personalizationImage: item.personalizationImage,
          customizationNotes: item.customizationNotes,
        })),
        totalAmount: subtotal,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (data.success && data.order) {
        clearCart();
        router.push(`/order-confirmation/${data.order.id}`);
      } else {
        setErrorMessage(data.error || 'Failed to place order. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Order placement error:', err);
      setErrorMessage('An unexpected error occurred while placing your order.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-black min-h-screen py-16 sm:py-24 px-6 sm:px-12 max-w-7xl mx-auto">
      <SectionHeader
        number="04"
        title="CHECKOUT & DISPATCH"
        subtitle="STRICT CASH ON DELIVERY // NO ADVANCE PAYMENT GATEWAYS"
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          {/* Left Column: Delivery Form */}
          <div className="lg:col-span-7 space-y-10">
            {/* Customer Identification */}
            <div className="p-8 border border-white/10 bg-white/[0.01] space-y-6">
              <div className="text-xs font-mono uppercase tracking-widest text-kred">
                1. RECIPIENT INFORMATION
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                    FULL NAME *
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Vikramaditya Rathore"
                    className="w-full bg-black border border-white/20 p-3 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                    CONTACT MOBILE NUMBER *
                  </label>
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    required
                    placeholder="10-digit mobile number"
                    className="w-full bg-black border border-white/20 p-3 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="p-8 border border-white/10 bg-white/[0.01] space-y-6">
              <div className="text-xs font-mono uppercase tracking-widest text-kred">
                2. PHYSICAL DISPATCH ADDRESS
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                      HOUSE / FLAT / SUITE NO. *
                    </label>
                    <input
                      type="text"
                      name="houseFlat"
                      value={formData.houseFlat}
                      onChange={handleChange}
                      required
                      placeholder="e.g. Villa 42, Floor 3"
                      className="w-full bg-black border border-white/20 p-3 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                      STREET / LOCALITY / AREA *
                    </label>
                    <input
                      type="text"
                      name="streetLocality"
                      value={formData.streetLocality}
                      onChange={handleChange}
                      required
                      placeholder="e.g. Jubilee Hills Road No. 36"
                      className="w-full bg-black border border-white/20 p-3 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                      CITY *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                      placeholder="e.g. Hyderabad"
                      className="w-full bg-black border border-white/20 p-3 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                      STATE *
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      required
                      placeholder="e.g. Telangana"
                      className="w-full bg-black border border-white/20 p-3 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                      PINCODE *
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      required
                      placeholder="e.g. 500033"
                      className="w-full bg-black border border-white/20 p-3 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                    DELIVERY INSTRUCTIONS / LANDMARKS (OPTIONAL)
                  </label>
                  <textarea
                    rows={2}
                    name="instructions"
                    value={formData.instructions}
                    onChange={handleChange}
                    placeholder="e.g. Gate code, deliver after 6 PM, leave with reception"
                    className="w-full bg-black border border-white/20 p-3 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-4 border border-kred bg-kred/10 text-kred text-xs font-mono">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Right Column: Order Review & COD Confirmation */}
          <div className="lg:col-span-5 space-y-8">
            <div className="p-8 border border-white/10 bg-white/[0.01] space-y-6">
              <div className="text-xs font-mono uppercase tracking-widest text-kred">
                COMMISSION REVIEW ({totalCount} ITEMS)
              </div>

              <div className="space-y-4 max-h-72 overflow-y-auto pr-2 border-b border-white/10 pb-6">
                {items.map((item, idx) => (
                  <div
                    key={`${item.productId}-${idx}`}
                    className="flex justify-between items-start text-xs font-mono space-x-4"
                  >
                    <div className="space-y-1">
                      <div className="text-white font-bold uppercase">{item.product.name}</div>
                      <div className="text-white/40">
                        QTY: {item.quantity} × ₹{item.product.price.toLocaleString('en-IN')}
                      </div>
                      {item.personalizationImage && (
                        <div className="text-[10px] text-kred flex items-center space-x-1">
                          <span>✦</span>
                          <span>CUSTOM PHOTO ATTACHED</span>
                        </div>
                      )}
                    </div>
                    <div className="text-white font-bold">
                      ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-3 font-mono text-xs border-b border-white/10 pb-6">
                <div className="flex justify-between text-white/60">
                  <span>SUBTOTAL</span>
                  <span className="text-white">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>SHIPPING & HANDLING</span>
                  <span className="text-white font-bold">₹0 (COMPLIMENTARY)</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>PAYMENT METHOD</span>
                  <span className="text-kred font-bold">CASH ON DELIVERY</span>
                </div>
              </div>

              {/* Total Due */}
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-xs font-mono tracking-widest uppercase text-white/50">
                  TOTAL COD AMOUNT
                </span>
                <span className="text-3xl font-mono font-bold text-white tracking-wider">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>

              {/* COD Explainer Notice */}
              <div className="p-4 border border-white/20 bg-black text-[11px] font-mono text-white/60 leading-relaxed space-y-2">
                <div className="text-white uppercase font-bold flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-kred" />
                  <span>CASH ON DELIVERY ASSURANCE</span>
                </div>
                <p>
                  No card details or advance payments are ever requested. You settle the full order amount directly in cash when the delivery agent delivers your package.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 bg-white text-black font-bold uppercase tracking-widest text-xs font-mono hover:bg-kred hover:text-white transition-all duration-300 disabled:opacity-50"
              >
                {isSubmitting ? 'PROCESSING COMMISSION...' : 'PLACE CASH ON DELIVERY ORDER →'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
