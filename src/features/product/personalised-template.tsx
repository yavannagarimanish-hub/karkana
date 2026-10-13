'use client';

import * as React from 'react';
import type { Product } from '@/core/domain/product';
import { pricePaise, primaryImage } from '@/core/domain/product';
import { formatINR } from '@/core/domain/money';
import { useCart } from '@/features/cart/cart-provider';
import { Button } from '@/ui/button';
import { Field, Input } from '@/ui/field';
import { QuantityStepper } from '@/ui/quantity-stepper';

export interface PersonalisedProductTemplateProps {
  product: Product;
  onAddedToCart?: () => void;
}

export function PersonalisedProductTemplate({
  product,
  onAddedToCart,
}: PersonalisedProductTemplateProps) {
  const { add } = useCart();

  const [customerName, setCustomerName] = React.useState('');
  const [greeting, setGreeting] = React.useState('Happy Diwali');
  const [photoPreviewUrl, setPhotoPreviewUrl] = React.useState<string | null>(null);
  const [photoKey, setPhotoKey] = React.useState<string | null>(null);

  // Transform controls
  const [scale, setScale] = React.useState(100);
  const [offsetX, setOffsetX] = React.useState(0);
  const [offsetY, setOffsetY] = React.useState(0);

  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState(1);
  const [added, setAdded] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const templateImage = primaryImage(product) || '/uploads/products/KRK132_main.jpg';
  const unitPrice = pricePaise(product);
  const totalPrice = unitPrice * quantity;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    setUploadProgress(20);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', 'personalization');

      setUploadProgress(50);
      const response = await fetch('/api/v1/uploads', {
        method: 'POST',
        body: form,
      });

      setUploadProgress(90);
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Upload failed. Please choose a valid image file.');
      }

      setPhotoPreviewUrl(payload.previewUrl || payload.url);
      setPhotoKey(payload.key);
      setScale(100);
      setOffsetX(0);
      setOffsetY(0);
      setUploadProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddToCart = () => {
    setError(null);

    if (!photoKey && !photoPreviewUrl) {
      setError('Please upload your photograph to personalize this box.');
      return;
    }

    if (!customerName.trim()) {
      setError('Please enter the name to be printed on your box.');
      return;
    }

    const structuredDetails = {
      name: customerName.trim(),
      greeting: greeting.trim(),
      scale,
      offsetX,
      offsetY,
      templateId: product.id,
      templateName: product.name,
    };

    add({
      productId: product.id,
      quantity,
      personalizationImage: photoKey || photoPreviewUrl,
      customizationNotes: `Printed Name: ${structuredDetails.name}${structuredDetails.greeting ? ` (${structuredDetails.greeting})` : ''} | Layout: ${structuredDetails.scale}% zoom, X:${structuredDetails.offsetX}px, Y:${structuredDetails.offsetY}px`,
      unitPricePaise: unitPrice,
      variantLabel: 'Personalized Box',
      parentTitle: product.name,
    });

    setAdded(true);
    onAddedToCart?.();
    window.setTimeout(() => setAdded(false), 4500);
  };

  return (
    <div className="space-y-8 rounded-sm border border-hairline bg-panel p-5 sm:p-7">
      <div className="border-b border-hairline pb-4">
        <span className="live-dot font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ember">
          Personalised Box Builder
        </span>
        <h2 className="mt-1 text-xl font-bold uppercase tracking-[0.04em] text-fg sm:text-2xl">
          {product.name}
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          Your personal photograph and custom name are printed directly onto this celebration box.
        </p>
      </div>

      {/* ── Interactive Live Preview ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-fg">
            Live Box Preview
          </label>
          <span className="text-[11px] text-fg-dim">
            {photoPreviewUrl ? 'Real-time rendering' : 'Awaiting your photograph'}
          </span>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-sm border border-hairline-strong bg-void shadow-2xl">
          {/* Background template artwork */}
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- template image */}
            <img
              src={templateImage}
              alt={product.name}
              className="size-full object-cover opacity-90"
            />
            {/* Overlay vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
          </div>

          {/* Photograph placement portal */}
          <div className="absolute inset-x-8 top-12 bottom-24 z-10 flex items-center justify-center overflow-hidden rounded-sm border border-dashed border-ember/70 bg-black/60 backdrop-blur-xs">
            {photoPreviewUrl ? (
              <div
                className="relative size-full select-none"
                style={{
                  transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale / 100})`,
                  transition: 'transform 0.05s ease-out',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- customer photo */}
                <img
                  src={photoPreviewUrl}
                  alt="Customer photograph"
                  className="size-full object-contain pointer-events-none"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <span className="text-3xl text-ember">📷</span>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-fg">
                  Your Photo Prints Here
                </p>
                <p className="mt-1 text-[11px] text-fg-muted">
                  Upload below to see your photo inside this frame
                </p>
              </div>
            )}
          </div>

          {/* Name Plaque at bottom of box */}
          <div className="absolute inset-x-4 bottom-3 z-20 rounded-xs border border-ember/60 bg-black/85 px-3 py-2 text-center backdrop-blur-sm shadow-md">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ember">
              {greeting}
            </p>
            <p className="truncate text-sm font-extrabold tracking-wide text-white uppercase sm:text-base">
              {customerName.trim() || 'YOUR NAME HERE'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Photo Adjustments Controls (Scale and Pan) ── */}
      {photoPreviewUrl && (
        <div className="rounded-sm border border-hairline bg-panel-raised p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-fg">
              Photo Adjustments
            </span>
            <button
              type="button"
              onClick={() => {
                setScale(100);
                setOffsetX(0);
                setOffsetY(0);
              }}
              className="text-[11px] font-mono uppercase tracking-[0.12em] text-ember hover:underline"
            >
              Reset Position
            </button>
          </div>

          {/* Scale Slider */}
          <div>
            <div className="flex justify-between text-xs text-fg-muted">
              <span>Zoom / Scale</span>
              <span className="font-mono">{scale}%</span>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(50, s - 10))}
                className="grid size-7 place-items-center rounded-xs border border-hairline text-sm text-fg hover:border-ember"
                aria-label="Zoom out"
              >
                −
              </button>
              <input
                type="range"
                min="50"
                max="200"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer accent-ember"
              />
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(200, s + 10))}
                className="grid size-7 place-items-center rounded-xs border border-hairline text-sm text-fg hover:border-ember"
                aria-label="Zoom in"
              >
                +
              </button>
            </div>
          </div>

          {/* Position Nudge Controls */}
          <div>
            <div className="flex justify-between text-xs text-fg-muted">
              <span>Reposition (Pan)</span>
              <span className="font-mono text-[11px]">X: {offsetX}px · Y: {offsetY}px</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5 max-w-[150px] mx-auto">
              <div />
              <button
                type="button"
                onClick={() => setOffsetY((y) => y - 10)}
                className="rounded-xs border border-hairline p-1.5 text-xs text-fg hover:border-ember"
                aria-label="Move up"
              >
                ▲
              </button>
              <div />
              <button
                type="button"
                onClick={() => setOffsetX((x) => x - 10)}
                className="rounded-xs border border-hairline p-1.5 text-xs text-fg hover:border-ember"
                aria-label="Move left"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => {
                  setOffsetX(0);
                  setOffsetY(0);
                }}
                className="rounded-xs border border-hairline p-1.5 text-[10px] text-fg-dim hover:text-fg"
                aria-label="Center"
              >
                ●
              </button>
              <button
                type="button"
                onClick={() => setOffsetX((x) => x + 10)}
                className="rounded-xs border border-hairline p-1.5 text-xs text-fg hover:border-ember"
                aria-label="Move right"
              >
                ▶
              </button>
              <div />
              <button
                type="button"
                onClick={() => setOffsetY((y) => y + 10)}
                className="rounded-xs border border-hairline p-1.5 text-xs text-fg hover:border-ember"
                aria-label="Move down"
              >
                ▼
              </button>
              <div />
            </div>
          </div>
        </div>
      )}

      {/* ── Photo Upload Area ── */}
      <div>
        <input
          ref={fileInputRef}
          id="personalised-photo-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          onChange={handleFileChange}
          disabled={uploading}
          className="sr-only"
        />

        {photoPreviewUrl ? (
          <div className="flex items-center justify-between rounded-sm border border-hairline bg-panel-raised p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-status-ok" />
              <span className="text-fg font-medium">Photograph attached successfully</span>
            </div>
            <label
              htmlFor="personalised-photo-input"
              className="cursor-pointer font-mono uppercase tracking-[0.12em] text-ember hover:underline"
            >
              Replace Photo
            </label>
          </div>
        ) : (
          <label
            htmlFor="personalised-photo-input"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed border-hairline-strong p-8 text-center transition-colors hover:border-ember bg-void/50"
          >
            <span className="text-2xl text-ember">⬆</span>
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-fg font-semibold">
              {uploading ? 'Processing & Validating Photo…' : 'Choose Your Photograph'}
            </span>
            <span className="text-[11px] text-fg-dim">
              JPG, PNG, WebP or iPhone HEIC · Up to 10 MB
            </span>
            {uploading && (
              <div className="mt-2 w-48 overflow-hidden rounded-full bg-panel-raised">
                <div
                  className="h-1 bg-ember transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </label>
        )}
      </div>

      {/* ── Custom Name & Greeting Inputs ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name to be printed" htmlFor="customer-name" required hint="e.g. The Sharma Family">
          <Input
            id="customer-name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Enter full name"
            maxLength={60}
            required
          />
        </Field>

        <Field label="Celebration Greeting" htmlFor="celebration-greeting" hint="Printed above name">
          <Input
            id="celebration-greeting"
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            placeholder="e.g. Happy Diwali"
            maxLength={40}
          />
        </Field>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-sm border border-status-danger/50 bg-status-danger/10 p-3 text-sm text-status-danger"
        >
          {error}
        </p>
      )}

      {/* ── Quantity, Price, and Purchase CTA ── */}
      <div className="border-t border-hairline pt-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
          <div>
            <span className="label text-fg-dim">Total Price</span>
            <p className="numeric text-2xl font-extrabold text-fg sm:text-3xl">
              {formatINR(totalPrice)}
            </p>
            <p className="text-[11px] text-fg-dim">
              {quantity} &times; {formatINR(unitPrice)} · Cash on delivery
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-fg-muted font-mono uppercase">Quantity:</span>
            <QuantityStepper value={quantity} onChange={setQuantity} disabled={uploading} />
          </div>
        </div>

        <Button
          size="lg"
          variant="solid"
          disabled={uploading}
          onClick={handleAddToCart}
          className="w-full text-base font-bold uppercase tracking-wider py-4"
        >
          {uploading ? 'Processing Upload…' : 'Add Personalised Box to Cart'}
        </Button>
      </div>

      {added && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between rounded-sm border border-status-ok/40 bg-status-ok/10 p-4 text-xs font-mono uppercase tracking-[0.14em] text-status-ok"
        >
          <span>✓ Personalised box added to cart</span>
          <a href="/cart" className="text-white underline underline-offset-4 hover:text-ember">
            Proceed to Checkout →
          </a>
        </div>
      )}
    </div>
  );
}
