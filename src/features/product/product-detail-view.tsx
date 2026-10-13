'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import type { Product } from '@/core/domain/product';
import type { ProductFamily, ProductVariant } from '@/core/domain/catalog-families';
import { formatINR, discountPercent } from '@/core/domain/money';
import { pricePaise, mrpPaise, primaryImage } from '@/core/domain/product';
import { useCart } from '@/features/cart/cart-provider';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { QuantityStepper } from '@/ui/quantity-stepper';
import { PersonalisedProductTemplate } from './personalised-template';

export interface ProductDetailViewProps {
  family: ProductFamily | null;
  initialProduct: Product;
  initialVariantId?: string;
  signedIn: boolean;
  wishlisted: boolean;
  specs: { label: string; value: string }[];
}

export function ProductDetailView({
  family,
  initialProduct,
  initialVariantId,
  signedIn,
  wishlisted,
  specs,
}: ProductDetailViewProps) {
  const router = useRouter();
  const { add } = useCart();

  // Active variant state
  const [selectedVariantId, setSelectedVariantId] = React.useState<string>(
    initialVariantId || family?.defaultVariant.id || initialProduct.id,
  );

  const activeVariant = React.useMemo<ProductVariant>(() => {
    if (family) {
      const match = family.variants.find((v) => v.id === selectedVariantId);
      if (match) return match;
    }
    return {
      id: initialProduct.id,
      label: initialProduct.unit || 'Standard',
      product: initialProduct,
      pricePaise: pricePaise(initialProduct),
      mrpPaise: mrpPaise(initialProduct),
      image: primaryImage(initialProduct),
      inStock: initialProduct.inStock,
    };
  }, [family, selectedVariantId, initialProduct]);

  const activeProduct = activeVariant.product;
  const price = activeVariant.pricePaise;
  const mrp = activeVariant.mrpPaise;
  const image = activeVariant.image || primaryImage(activeProduct);
  const purchasable = activeVariant.inStock;

  const [quantity, setQuantity] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);
  const [added, setAdded] = React.useState(false);
  const [saved, setSaved] = React.useState(wishlisted);

  const needsPhoto = activeProduct.module === 'PERSONALIZED';

  const addToCart = () => {
    setError(null);

    add({
      productId: activeVariant.id, // Underlying SKU
      quantity,
      unitPricePaise: price,
      variantLabel: activeVariant.label,
      parentTitle: family && family.hasMultipleVariants ? family.title : null,
    });

    setAdded(true);
    window.setTimeout(() => setAdded(false), 4000);
  };

  const toggleWishlist = async () => {
    const response = await fetch('/api/v1/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: activeVariant.id }),
    });
    if (response.ok) {
      const payload = (await response.json()) as { wishlisted?: boolean };
      setSaved(Boolean(payload.wishlisted));
    } else {
      router.push('/account/login');
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
      {/* Gallery */}
      <div className="lg:col-span-7">
        <div className="surface relative flex aspect-square items-center justify-center overflow-hidden rounded-sm bg-void p-6 sm:p-12">
          {image ? (
            <Image
              src={image}
              alt={family?.title ?? activeProduct.name}
              width={activeProduct.imageWidth ?? 1400}
              height={activeProduct.imageHeight ?? 1400}
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="max-h-full w-auto max-w-full object-contain transition-all duration-300"
            />
          ) : (
            <span className="label">No image assigned</span>
          )}

          {!purchasable && (
            <div className="absolute inset-0 grid place-items-center bg-void/80">
              <span className="rounded-xs border border-status-danger px-4 py-1.5 font-mono text-xs uppercase tracking-[0.16em] text-status-danger">
                Out of stock
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Buy column */}
      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-28">
          {/* 1. PRODUCT NAME — at the top */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={activeProduct.module === 'PERSONALIZED' ? 'ember' : 'neutral'}>
              {activeProduct.module}
            </Badge>
            <Badge tone={purchasable ? 'ok' : 'danger'}>
              {purchasable ? 'Available to order' : 'Unavailable'}
            </Badge>
            {activeProduct.category && <Badge tone="outline">{activeProduct.category}</Badge>}
            {family?.section && <Badge tone="outline">{family.section}</Badge>}
          </div>

          <h1 className="mt-3 text-2xl leading-tight font-extrabold tracking-[0.01em] text-fg uppercase sm:text-4xl">
            {family?.hasMultipleVariants ? family.title : activeProduct.name}
          </h1>

          {/* 2. PRICE — immediately below/near the product name */}
          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="numeric text-3xl font-bold text-fg">{formatINR(price)}</span>
            {mrp && mrp > price && (
              <>
                <span className="numeric text-base text-fg-ghost line-through">{formatINR(mrp)}</span>
                <Badge tone="ember">Save {formatINR(mrp - price)}</Badge>
              </>
            )}
          </div>

          {mrp && mrp > price && (
            <p className="numeric mt-1 text-[11px] text-fg-dim">
              {discountPercent(mrp, price)}% below MRP · inclusive of taxes
            </p>
          )}

          {family?.hasMultipleVariants && (
            <p className="mt-1.5 font-mono text-xs uppercase tracking-[0.12em] text-ember font-semibold">
              From {formatINR(family.fromPricePaise)} · {family.variants.length} options available
            </p>
          )}

          {/* 3. PRODUCT OPTIONS / VARIANTS — directly below the price */}
          {family && family.hasMultipleVariants && (
            <div className="mt-5 rounded-sm border border-hairline bg-panel p-4">
              <div className="flex items-center justify-between">
                <span className="label text-fg">Select Option / Size</span>
                <span className="numeric text-xs font-semibold text-fg-muted">
                  Selected: <strong className="text-white">{activeVariant.label}</strong>
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Select size or option">
                {family.variants.map((v) => {
                  const isSelected = v.id === selectedVariantId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => {
                        setSelectedVariantId(v.id);
                        setError(null);
                      }}
                      className={`group relative flex items-center gap-2 rounded-xs px-3 py-2 text-xs font-mono transition-all ${
                        isSelected
                          ? 'border border-ember bg-ember/15 text-white shadow-hairline'
                          : 'border border-hairline bg-panel-raised text-fg-muted hover:border-hairline-strong hover:text-white'
                      }`}
                    >
                      <span className="font-semibold uppercase tracking-wider">{v.label}</span>
                      <span className="text-[10px] text-fg-dim group-hover:text-fg-muted">
                        {formatINR(v.pricePaise)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. ADD TO CART / purchase controls */}
          <div className="mt-6 space-y-6">
            {needsPhoto ? (
              <PersonalisedProductTemplate product={activeProduct} />
            ) : (
              <>
                {error && (
                  <p role="alert" className="rounded-sm border border-status-danger/50 bg-status-danger/10 p-3 text-sm text-status-danger">
                    {error}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <QuantityStepper value={quantity} onChange={setQuantity} disabled={!purchasable} />

                  <Button
                    size="lg"
                    variant={purchasable ? 'solid' : 'outline'}
                    disabled={!purchasable}
                    onClick={addToCart}
                    className="flex-1"
                  >
                    {!purchasable ? 'Out of stock' : 'Add to cart'}
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
              </>
            )}

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
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg">
                Added {activeVariant.label} to cart
              </span>
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

            {/* Mobile bottom sticky buy bar */}
            {!needsPhoto && (
              <div className="fixed inset-x-0 bottom-16 z-30 border-t border-hairline bg-void/95 px-4 py-3 backdrop-blur-md lg:hidden">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="numeric text-base leading-tight font-bold text-fg">
                      {formatINR(price * quantity)}
                    </p>
                    <p className="label truncate text-fg-dim">
                      {quantity} &times; {formatINR(price)} ({activeVariant.label})
                    </p>
                  </div>

                  <Button
                    size="lg"
                    variant={purchasable ? 'solid' : 'outline'}
                    disabled={!purchasable}
                    onClick={addToCart}
                    className="shrink-0"
                  >
                    {!purchasable ? 'Out of stock' : 'Add to cart'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 5. PRODUCT DESCRIPTION / other product information */}
          {(activeProduct.shortDescription || family?.description) && (
            <p className="mt-8 text-sm text-fg-muted leading-relaxed">
              {activeProduct.shortDescription || family?.description}
            </p>
          )}

          <dl className="mt-6 divide-y divide-hairline border-y border-hairline">
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="label">Product / SKU ID</dt>
              <dd className="numeric text-right text-xs text-fg-muted">{activeVariant.id}</dd>
            </div>
            {specs.map((spec) => (
              <div key={spec.label} className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="label">{spec.label}</dt>
                <dd className="numeric text-right text-xs text-fg-muted">{spec.value}</dd>
              </div>
            ))}
          </dl>

          {activeProduct.description && (
            <div className="mt-6">
              <h2 className="label">Specification / notes</h2>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-fg-muted">
                {activeProduct.description}
              </p>
            </div>
          )}

          {/* 6. SAFETY INSTRUCTIONS — BELOW THE MAIN PRODUCT INFORMATION */}
          {activeProduct.safetyInstructions && (
            <div className="surface mt-8 rounded-sm border border-hairline p-5">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-status-warn" />
                <h2 className="label text-status-warn">Safety instructions</h2>
              </div>
              <p className="mt-2.5 text-sm whitespace-pre-line text-fg-muted leading-relaxed">
                {activeProduct.safetyInstructions}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

