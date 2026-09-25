'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Product } from '@/types';

interface PersonalizedExample {
  id: string;
  name: string;
  image: string;
  category: string;
}

interface PersonalizedExperienceProps {
  examples: PersonalizedExample[];
}

export default function PersonalizedExperience({ examples }: PersonalizedExperienceProps) {
  const router = useRouter();
  const { addToCart } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [activeExampleIndex, setActiveExampleIndex] = useState(0);

  const price = 499;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setValidationError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'personalization');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setPhotoUrl(data.url);
      } else {
        setValidationError(data.error || 'Failed to upload photograph');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setValidationError('Network error uploading photograph');
    } finally {
      setUploading(false);
    }
  };

  const handleAddToCart = () => {
    if (!photoUrl) {
      setValidationError('Please upload your photograph to imprint on the bespoke box.');
      return;
    }

    setValidationError(null);

    // Create virtual personalized product
    const personalizedProduct: Product = {
      id: `KRK_PERSONALIZED_${Date.now()}`,
      name: 'BESPOKE COMMEMORATIVE BOX',
      images: [photoUrl],
      description: customInstructions || 'Custom commissioned commemorative cracker box featuring customer photograph.',
      price: price,
      original_price: 999,
      module: 'PERSONALIZED',
      category: 'Bespoke Commissions',
      display_position: 1,
      is_featured: true,
      is_popular: true,
      is_visible: true,
      in_stock: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addToCart(personalizedProduct, quantity, photoUrl, customInstructions.trim());

    setAddedSuccess(true);
    setTimeout(() => {
      router.push('/cart');
    }, 1500);
  };

  return (
    <div className="space-y-24">
      {/* 1. Header Banner & Fixed Price Spec */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-baseline pb-16 border-b border-white/10">
        <div className="lg:col-span-8 space-y-4">
          <div className="inline-flex items-center space-x-2 font-mono text-xs text-kred uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-kred animate-ping" />
            <span>BESPOKE PACKAGING WORKSHOP</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold uppercase tracking-ultra text-white">
            COMMISSION YOUR BOX
          </h2>
          <p className="text-white/50 text-sm font-mono leading-relaxed max-w-2xl">
            Upload your personal photograph and customization directives. Our pyrotechnic artisans
            will imprint your image directly onto custom commemorative packaging boxes.
          </p>
        </div>

        <div className="lg:col-span-4 p-8 border border-white/10 bg-white/[0.01] space-y-2 text-right">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
            FLAT COMMISSION RATE
          </span>
          <div className="text-4xl sm:text-5xl font-mono font-bold text-white tracking-widest">
            ₹{price}
          </div>
          <span className="text-[11px] font-mono text-kred uppercase tracking-widest block font-bold">
            CASH ON DELIVERY INCLUDED
          </span>
        </div>
      </div>

      {/* 2. Interactive Commissioning Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        {/* Left Column: Photo Upload & Instructions */}
        <div className="lg:col-span-7 space-y-8">
          {/* Step 1: Photograph Upload */}
          <div className="p-8 border border-white/10 bg-white/[0.01] space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono uppercase tracking-widest text-kred">
                STEP 01 // UPLOAD PHOTOGRAPH *
              </span>
              {photoUrl && (
                <span className="text-[10px] font-mono text-white/60 uppercase">
                  ASSET ATTACHED
                </span>
              )}
            </div>

            {photoUrl ? (
              <div className="space-y-4">
                <div className="relative w-full min-h-[280px] max-h-[460px] border border-white/20 bg-black p-4 flex items-center justify-center overflow-hidden">
                  <img
                    src={photoUrl}
                    alt="Customer photograph preview"
                    className="max-w-full max-h-[420px] object-contain"
                  />
                  <div className="absolute bottom-4 right-4 bg-black/80 border border-white/20 px-3 py-1 text-[10px] font-mono text-white uppercase">
                    HIGH-RES READY
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-white/40">Tied strictly to your order</span>
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="text-kred uppercase hover:underline"
                  >
                    CHANGE PHOTOGRAPH ↺
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-white/20 hover:border-kred transition-colors p-10 text-center space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  id="customer-personalized-photo"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <label
                  htmlFor="customer-personalized-photo"
                  className="cursor-pointer block space-y-3"
                >
                  <div className="w-12 h-12 border border-white/20 rounded-full mx-auto flex items-center justify-center text-white/40 text-lg font-mono">
                    ↑
                  </div>
                  <span className="text-xs font-mono uppercase tracking-widest text-white block font-bold">
                    {uploading ? 'PROCESSING ASSET...' : 'CHOOSE PHOTOGRAPH (JPG / PNG)'}
                  </span>
                  <p className="text-[11px] font-mono text-white/40 max-w-sm mx-auto leading-relaxed">
                    Upload family, festive, portrait, or commemorative photos. Maximum recommended file size: 15MB.
                  </p>
                </label>
              </div>
            )}
          </div>

          {/* Step 2: Customization Instructions */}
          <div className="p-8 border border-white/10 bg-white/[0.01] space-y-6">
            <span className="text-xs font-mono uppercase tracking-widest text-kred block">
              STEP 02 // CUSTOMIZATION DIRECTIVES
            </span>

            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                PACKAGING DIRECTIVES (OPTIONAL)
              </label>
              <textarea
                rows={3}
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. Center portrait on lid, include gold greeting 'Happy Celebrations 2026 - From Raghav & Sunita'."
                className="w-full bg-black border border-white/20 p-3 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {/* Validation Banner */}
            {validationError && (
              <div className="p-4 border border-kred bg-kred/10 text-kred text-xs font-mono">
                {validationError}
              </div>
            )}
          </div>

          {/* Step 3: Quantity & Add to Cart */}
          <div className="p-8 border border-white/10 bg-white/[0.01] space-y-6">
            <span className="text-xs font-mono uppercase tracking-widest text-kred block">
              STEP 03 // QUANTITY & COMMISSION
            </span>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center space-x-4">
                <span className="text-xs font-mono uppercase tracking-widest text-white/60">
                  BOXES:
                </span>
                <div className="flex items-center border border-white/20 font-mono text-sm">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-4 py-2 hover:bg-white hover:text-black transition-colors"
                  >
                    -
                  </button>
                  <span className="px-6 py-2 text-white font-bold">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="px-4 py-2 hover:bg-white hover:text-black transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
                  SUBTOTAL
                </span>
                <span className="text-2xl font-mono font-bold text-white">
                  ₹{(price * quantity).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              className="w-full py-5 bg-white text-black font-bold uppercase font-mono tracking-widest text-xs hover:bg-kred hover:text-white transition-all duration-300"
            >
              {addedSuccess ? 'COMMISSION ADDED! REDIRECTING...' : `ADD TO CART — ₹${(price * quantity).toLocaleString('en-IN')}`}
            </button>

            <div className="text-[11px] font-mono text-white/40 flex items-center space-x-2 justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              <span>STRICT CASH ON DELIVERY // NO ADVANCE PAYMENT GATEWAYS</span>
            </div>
          </div>
        </div>

        {/* Right Column: Reference Example Gallery (KRK133–KRK138) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <span className="text-xs font-mono uppercase tracking-widest text-kred">
              REFERENCE EXAMPLES (KRK133–KRK138)
            </span>
            <span className="text-[10px] font-mono text-white/40 uppercase">
              {examples.length} INSPIRATIONS
            </span>
          </div>

          <p className="text-white/40 text-xs font-mono leading-relaxed">
            These examples demonstrate our bespoke box print finishes. Your commissioned box
            will feature your own uploaded photograph.
          </p>

          {/* Active Big Showcase */}
          {examples.length > 0 && (
            <div className="border border-white/10 bg-white/[0.01] p-6 space-y-4">
              <div className="relative w-full min-h-[360px] max-h-[500px] border border-white/10 bg-black/40 p-6 flex items-center justify-center overflow-hidden">
                <img
                  src={examples[activeExampleIndex]?.image || examples[0]?.image}
                  alt={examples[activeExampleIndex]?.name || 'Example Box'}
                  className="w-full h-auto max-h-[450px] object-contain transition-all duration-300"
                />
                <div className="absolute top-4 left-4 bg-black/80 border border-white/20 px-3 py-1 text-[9px] font-mono text-white uppercase">
                  {examples[activeExampleIndex]?.id} {'//'} REFERENCE
                </div>
              </div>

              <div>
                <h4 className="text-sm uppercase font-bold text-white tracking-widest">
                  {examples[activeExampleIndex]?.name}
                </h4>
                <div className="text-xs font-mono text-white/40 pt-1">
                  Custom Thematic Printing Example
                </div>
              </div>
            </div>
          )}

          {/* Thumbnail Strip */}
          <div className="grid grid-cols-6 gap-2 pt-2">
            {examples.map((ex, idx) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => setActiveExampleIndex(idx)}
                className={`relative aspect-square border p-1 bg-black/40 flex items-center justify-center overflow-hidden transition-all ${
                  activeExampleIndex === idx ? 'border-kred scale-105' : 'border-white/10 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={ex.image} alt={ex.name} className="max-w-full max-h-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
