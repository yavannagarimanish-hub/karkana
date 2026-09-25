'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Product } from '@/types';

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params?.id as string;
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [addedMessage, setAddedMessage] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/${productId}`);
        const data = await res.json();
        if (data.success && data.product) {
          setProduct(data.product);
        } else {
          setError(data.error || 'Product not found');
        }
      } catch (e) {
        console.error('Failed loading product:', e);
        setError('Failed to load product');
      } finally {
        setLoading(false);
      }
    }

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
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
        setUploadedPhotoUrl(data.url);
      } else {
        setValidationError(data.error || 'Failed to upload photo');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setValidationError('Error uploading photograph');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    if (product.module === 'PERSONALIZED') {
      if (!uploadedPhotoUrl) {
        setValidationError('Please upload your custom photograph to proceed.');
        return;
      }
    }

    setValidationError(null);
    addToCart(
      product,
      quantity,
      product.module === 'PERSONALIZED' ? uploadedPhotoUrl : undefined,
      product.module === 'PERSONALIZED' ? customInstructions.trim() : undefined
    );

    setAddedMessage(true);
    setTimeout(() => setAddedMessage(false), 4000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="font-mono text-xs tracking-widest text-white/40 uppercase animate-pulse">
          INITIALIZING PRODUCT SPECIFICATION...
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold uppercase tracking-widest text-white mb-4">
          PRODUCT NOT LOCATED
        </h2>
        <p className="text-white/40 text-xs font-mono mb-8">
          The requested product ID does not exist or has been removed from catalogue.
        </p>
        <Link
          href="/"
          className="px-6 py-3 border border-white/20 text-white font-mono text-xs tracking-widest uppercase hover:border-kred hover:text-kred transition-colors"
        >
          RETURN TO STOREFRONT
        </Link>
      </div>
    );
  }

  const isPersonalized = product.module === 'PERSONALIZED';
  const hasImage = product.images && product.images.length > 0 && product.images[0];

  return (
    <div className="w-full bg-black min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 sm:px-12 pt-12 pb-6 border-b border-white/10">
        <div className="flex items-center space-x-3 text-xs font-mono tracking-widest text-white/50">
          <Link href="/" className="hover:text-white transition-colors">
            HOME
          </Link>
          <span>/</span>
          <Link
            href={`/module/${product.module.toLowerCase()}`}
            className="hover:text-white transition-colors uppercase"
          >
            {product.module}
          </Link>
          <span>/</span>
          <span className="text-white uppercase truncate max-w-xs">{product.name}</span>
        </div>
      </div>

      {/* Main Editorial Grid: Left Image, Right Info */}
      <div className="max-w-7xl mx-auto px-6 sm:px-12 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start">
          {/* Left Column: Spacious Adaptive Product Imagery */}
          <div className="lg:col-span-7">
            <div className="relative w-full border border-white/10 bg-white/[0.015] p-6 sm:p-12 lg:p-16 flex items-center justify-center min-h-[480px]">
              {hasImage ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-auto max-h-[78vh] object-contain object-center transition-all duration-300"
                  style={{
                    aspectRatio: product.aspect_ratio ? `${product.aspect_ratio}` : 'auto',
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 py-24">
                  <div className="w-16 h-[1px] bg-white/20" />
                  <span className="text-white/30 text-xs font-mono tracking-widest uppercase">
                    NO PRODUCT IMAGE ASSIGNED
                  </span>
                  <span className="text-white/20 text-[11px] font-mono">
                    Can be uploaded via the Admin Portal at any time
                  </span>
                </div>
              )}

              {/* Status Badge */}
              <div className="absolute top-6 left-6 flex items-center space-x-2">
                <span className="px-3 py-1 text-[10px] font-mono tracking-widest uppercase bg-black/90 border border-white/20 text-white">
                  {product.module}
                </span>
                {product.orientation && (
                  <span className="hidden sm:inline-block px-2.5 py-1 text-[9px] font-mono tracking-widest uppercase bg-black/90 border border-white/10 text-white/40">
                    {product.orientation} FORMAT
                  </span>
                )}
              </div>

              {!product.in_stock && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                  <span className="text-kred font-mono text-sm tracking-widest uppercase border border-kred px-6 py-2">
                    OUT OF STOCK
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Editorial Information */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-xs font-mono tracking-widest text-kred uppercase">
                <span>{product.category || 'COMMEMORATIVE'}</span>
                <span>•</span>
                <span className={product.in_stock ? 'text-white/60' : 'text-kred'}>
                  {product.in_stock ? 'AVAILABLE TO ORDER' : 'CURRENTLY UNAVAILABLE'}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold uppercase tracking-widest text-white leading-tight">
                {product.name}
              </h1>

              {/* Pricing */}
              <div className="flex items-baseline space-x-4 pt-2">
                <span className="text-3xl font-mono font-bold text-white tracking-wider">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                {product.original_price && product.original_price > product.price && (
                  <span className="text-white/40 line-through text-lg font-mono">
                    ₹{product.original_price.toLocaleString('en-IN')}
                  </span>
                )}
                {product.original_price && product.original_price > product.price && (
                  <span className="text-xs font-mono text-kred tracking-widest uppercase">
                    SAVE ₹{(product.original_price - product.price).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="text-xs font-mono uppercase tracking-widest text-white/40">
                SPECIFICATION / NOTES
              </div>
              <p className="text-white/70 text-sm font-mono leading-relaxed whitespace-pre-line">
                {product.description ||
                  'Manufactured with premium pyrotechnic compositions adhering to strict acoustic and visual benchmarks.'}
              </p>
            </div>

            {/* PERSONALIZED MODULE: CUSTOMER UPLOAD SECTION */}
            {isPersonalized && (
              <div className="p-6 border border-kred/40 bg-kred/[0.02] space-y-6">
                <div className="space-y-1">
                  <div className="text-xs font-mono uppercase tracking-widest text-kred flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-kred animate-pulse" />
                    <span>PERSONALIZATION ASSETS</span>
                  </div>
                  <p className="text-xs font-mono text-white/50">
                    Upload your high-resolution photograph to be printed on this commemorative box.
                  </p>
                </div>

                {/* File Upload Box */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                    YOUR PHOTOGRAPH *
                  </label>
                  {uploadedPhotoUrl ? (
                    <div className="space-y-3">
                      <div className="relative w-full min-h-[200px] max-h-[380px] border border-white/20 p-2 overflow-hidden bg-black flex items-center justify-center">
                        <img
                          src={uploadedPhotoUrl}
                          alt="Uploaded customer photo"
                          className="max-w-full max-h-[360px] object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-white/60">Photo Attached</span>
                        <button
                          type="button"
                          onClick={() => setUploadedPhotoUrl('')}
                          className="text-kred hover:underline uppercase"
                        >
                          Replace Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-white/20 hover:border-kred transition-colors p-6 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        id="personalization-file"
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                      />
                      <label
                        htmlFor="personalization-file"
                        className="cursor-pointer block space-y-2"
                      >
                        <span className="text-xs font-mono uppercase tracking-widest text-white block">
                          {uploadingPhoto ? 'UPLOADING ASSET...' : 'CHOOSE PHOTOGRAPH (JPG/PNG)'}
                        </span>
                        <span className="text-[10px] font-mono text-white/40 block">
                          Maximum recommended resolution: 10MB
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Customization Instructions */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/70 mb-2">
                    CUSTOMIZATION INSTRUCTIONS (OPTIONAL)
                  </label>
                  <textarea
                    rows={3}
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="e.g. Include greeting: 'Happy Celebrations to The Sharma Family 2026', place photo centered."
                    className="w-full bg-black border border-white/20 p-3 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>
            )}

            {validationError && (
              <div className="p-4 border border-kred bg-kred/10 text-kred text-xs font-mono tracking-wider">
                {validationError}
              </div>
            )}

            {/* Quantity and Add To Cart */}
            <div className="pt-6 border-t border-white/10 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="text-xs font-mono uppercase tracking-widest text-white/60">
                  QTY:
                </div>
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

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!product.in_stock}
                className="w-full py-5 bg-white text-black font-bold uppercase tracking-widest text-sm hover:bg-kred hover:text-white transition-all duration-300 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-black"
              >
                {product.in_stock ? 'ADD TO CART' : 'CURRENTLY OUT OF STOCK'}
              </button>

              {addedMessage && (
                <div className="p-4 border border-white bg-white/[0.03] flex items-center justify-between">
                  <span className="text-xs font-mono text-white tracking-widest uppercase">
                    ITEM ADDED TO CART
                  </span>
                  <Link
                    href="/cart"
                    className="text-xs font-mono text-kred underline tracking-widest uppercase font-bold"
                  >
                    VIEW CART →
                  </Link>
                </div>
              )}

              {/* FULFILLMENT DISCLAIMER */}
              <div className="pt-4 flex items-center space-x-3 text-[11px] font-mono text-white/40">
                <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                <span>FULFILLMENT VIA CASH ON DELIVERY ONLY</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
