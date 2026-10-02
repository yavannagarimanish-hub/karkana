'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { pricePaise, type Product } from '@/core/domain/product';
import { formatINR } from '@/core/domain/money';
import { useCart } from '@/features/cart/cart-provider';
import { Button } from '@/ui/button';
import { Field, Textarea } from '@/ui/field';
import { QuantityStepper } from '@/ui/quantity-stepper';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export interface BuyPanelProps {
  product: Product;
  /** True when a customer session exists, enabling the wishlist toggle. */
  signedIn: boolean;
  wishlisted: boolean;
}

/**
 * Add-to-cart + personalization upload. Personalized boxes cannot be added
 * without a photograph; the same rule is enforced again server-side by
 * `priceOrder` in `core/domain/pricing.ts`.
 */
export function BuyPanel({ product, signedIn, wishlisted }: BuyPanelProps) {
  const router = useRouter();
  const { add } = useCart();

  const [quantity, setQuantity] = React.useState(1);
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [added, setAdded] = React.useState(false);
  const [saved, setSaved] = React.useState(wishlisted);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const needsPhoto = product.module === 'PERSONALIZED';

  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPG, PNG or WebP).');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('That image is larger than 10 MB. Please choose a smaller file.');
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', 'personalization');

      const response = await fetch('/api/v1/uploads', { method: 'POST', body: form });
      const payload = (await response.json()) as { success?: boolean; url?: string; error?: string };

      if (!response.ok || !payload.success || !payload.url) {
        throw new Error(payload.error ?? 'Upload failed');
      }
      setPhotoUrl(payload.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addToCart = () => {
    setError(null);

    if (needsPhoto && !photoUrl) {
      setError('Upload your photograph first. It is printed on the box.');
      return;
    }

    add({
      productId: product.id,
      quantity,
      personalizationImage: photoUrl,
      customizationNotes: notes.trim() || null,
      unitPricePaise: pricePaise(product),
    });

    setAdded(true);
    window.setTimeout(() => setAdded(false), 4000);
  };

  const toggleWishlist = async () => {
    const response = await fetch('/api/v1/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id }),
    });
    if (response.ok) {
      const payload = (await response.json()) as { wishlisted?: boolean };
      setSaved(Boolean(payload.wishlisted));
    } else {
      router.push('/account/login');
    }
  };

  return (
    <div className="space-y-6">
      {needsPhoto && (
        <section
          aria-labelledby="personalization-heading"
          className="rounded-sm border border-ember/40 bg-ember-wash p-5"
        >
          <h2
            id="personalization-heading"
            className="live-dot font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ember"
          >
            Personalization
          </h2>
          <p className="mt-2 text-sm text-fg-muted">
            Upload a photograph and we print it on this box. Maximum 10 MB.
          </p>

          <div className="mt-4">
            <input
              ref={fileInputRef}
              id="personalization-photo"
              type="file"
              accept="image/*"
              onChange={uploadPhoto}
              disabled={uploading}
              className="sr-only"
            />

            {photoUrl ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- user upload, dimensions unknown */}
                <img
                  src={photoUrl}
                  alt="Your uploaded photograph"
                  className="max-h-72 w-full rounded-sm bg-void object-contain p-2 shadow-hairline"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-fg-muted">Photo attached</span>
                  <button
                    type="button"
                    onClick={() => setPhotoUrl(null)}
                    className="font-mono uppercase tracking-[0.14em] text-ember hover:underline"
                  >
                    Replace
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="personalization-photo"
                className="flex cursor-pointer flex-col items-center gap-2 rounded-sm border border-dashed border-hairline-strong p-8 text-center transition-colors hover:border-ember"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg">
                  {uploading ? 'Uploading…' : 'Choose a photograph'}
                </span>
                <span className="text-[11px] text-fg-dim">JPG, PNG or WebP · up to 10 MB</span>
              </label>
            )}
          </div>

          <div className="mt-4">
            <Field label="Printing instructions (optional)" htmlFor="customization-notes">
              <Textarea
                id="customization-notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="e.g. Add the greeting “Happy Diwali, Sharma family” below the photo."
              />
            </Field>
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-sm border border-status-danger/50 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper value={quantity} onChange={setQuantity} disabled={!product.inStock} />

        <Button
          size="lg"
          variant={product.inStock ? 'solid' : 'outline'}
          disabled={!product.inStock || uploading}
          onClick={addToCart}
          className="flex-1"
        >
          {!product.inStock ? 'Out of stock' : uploading ? 'Uploading photo…' : 'Add to cart'}
        </Button>

        <button
          type="button"
          onClick={toggleWishlist}
          aria-pressed={saved}
          className="grid size-11 place-items-center rounded-sm text-lg shadow-hairline-strong transition-colors hover:text-ember"
          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          {saved ? '♥' : '♡'}
        </button>
      </div>

      {!signedIn && (
        <p className="text-xs text-fg-dim">
          <Link href="/account/login" className="text-fg-muted underline underline-offset-4 hover:text-ember">
            Sign in
          </Link>{' '}
          to keep a wishlist and see this order in your history.
        </p>
      )}

      <div
        role="status"
        aria-live="polite"
        className={`flex items-center justify-between rounded-sm border border-hairline-strong bg-panel p-4 transition-opacity duration-200 ${
          added ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg">Added to cart</span>
        <Link
          href="/cart"
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-ember underline underline-offset-4"
        >
          View cart →
        </Link>
      </div>

      <ul className="space-y-2 border-t border-hairline pt-5 text-xs text-fg-dim">
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-1.5 rounded-full bg-ember" />
          Cash on delivery only
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-1.5 rounded-full bg-fg-ghost" />
          Dispatched direct from the workshop
        </li>
      </ul>

      {/*
        Sticky mobile buy bar, the way Swiggy and Zomato keep the primary
        action pinned while the customer scrolls a long product page. Sits
        above the bottom tab bar. Desktop uses the inline controls above.
      */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-hairline bg-void/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="numeric text-base leading-tight font-bold text-fg">
              {formatINR(pricePaise(product) * quantity)}
            </p>
            <p className="label truncate text-fg-dim">
              {quantity} &times; {formatINR(pricePaise(product))}
            </p>
          </div>

          <Button
            size="lg"
            variant={product.inStock ? 'solid' : 'outline'}
            disabled={!product.inStock || uploading || (needsPhoto && !photoUrl)}
            onClick={addToCart}
            className="shrink-0"
          >
            {!product.inStock ? 'Out of stock' : uploading ? 'Uploading…' : 'Add to cart'}
          </Button>
        </div>

        {needsPhoto && !photoUrl && (
          <p className="mt-2 text-[11px] text-status-warn">
            Upload your photograph above first. It is printed on the box.
          </p>
        )}
      </div>
    </div>
  );
}
