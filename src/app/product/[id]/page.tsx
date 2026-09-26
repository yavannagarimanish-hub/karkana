import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAppServices } from '@/infra/db';
import { readCustomerSession } from '@/infra/auth/guards';
import { SITE } from '@/infra/config';
import { toSafeJsonLd } from '@/infra/seo/json-ld';
import { formatINR } from '@/core/domain/money';
import { mrpPaise, pricePaise, primaryImage } from '@/core/domain/product';
import { discountPercent } from '@/core/domain/money';
import { Badge } from '@/ui/badge';
import { ProductGrid } from '@/ui/product-grid';
import { SectionHeader } from '@/ui/section-header';
import { BuyPanel } from '@/features/product/buy-panel';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const services = await getAppServices();
  const view = await services.catalogue.product(id);
  if (!view) return { title: 'Product not found' };

  const image = primaryImage(view.product);
  const description =
    view.product.shortDescription ||
    view.product.description ||
    `${view.product.name} from the ${SITE.name} ${view.product.category} range, with cash on delivery.`;

  return {
    title: view.product.name,
    description,
    alternates: { canonical: `/product/${view.product.id}` },
    openGraph: {
      title: view.product.name,
      description,
      type: 'website',
      ...(image ? { images: [{ url: image, alt: view.product.name }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const services = await getAppServices();
  const view = await services.catalogue.product(id);
  if (!view) notFound();

  const { product, related } = view;
  const session = await readCustomerSession();
  const wishlisted = session ? await services.accounts.isWishlisted(session.sub, product.id) : false;

  const price = pricePaise(product);
  const mrp = mrpPaise(product);
  const image = primaryImage(product);

  const specs: { label: string; value: string }[] = [
    { label: 'Product ID', value: product.id },
    { label: 'Module', value: product.module },
    { label: 'Category', value: product.category || 'Uncategorised' },
    ...(product.brand ? [{ label: 'Brand', value: product.brand }] : []),
    ...(product.subcategory ? [{ label: 'Subcategory', value: product.subcategory }] : []),
    ...(product.unit ? [{ label: 'Unit', value: product.unit }] : []),
    {
      label: 'Stock',
      value:
        product.stockQuantity === null
          ? product.inStock
            ? 'Available'
            : 'Unavailable'
          : `${product.stockQuantity} in stock`,
    },
    ...(product.orientation ? [{ label: 'Format', value: product.orientation }] : []),
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.id,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    image: image ? [image] : undefined,
    description: product.description || product.shortDescription || undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: (price / 100).toFixed(2),
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toSafeJsonLd(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-14 lg:px-12">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-[11px] text-fg-dim">
          <Link href="/" className="transition-colors hover:text-fg">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link href={`/module/${product.module.toLowerCase()}`} className="transition-colors hover:text-fg">
            {product.module.charAt(0) + product.module.slice(1).toLowerCase()}
          </Link>
          <span aria-hidden>/</span>
          <span className="font-mono uppercase tracking-[0.14em] text-fg-muted">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Gallery */}
          <div className="lg:col-span-7">
            <div className="surface relative flex aspect-square items-center justify-center overflow-hidden rounded-sm bg-void p-6 sm:p-12">
              {image ? (
                <Image
                  src={image}
                  alt={product.name}
                  width={product.imageWidth ?? 1400}
                  height={product.imageHeight ?? 1400}
                  priority
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="max-h-full w-auto max-w-full object-contain"
                />
              ) : (
                <span className="label">No image assigned</span>
              )}

              {!product.inStock && (
                <div className="absolute inset-0 grid place-items-center bg-void/80">
                  <span className="rounded-xs border border-status-danger px-4 py-1.5 font-mono text-xs uppercase tracking-[0.16em] text-status-danger">
                    Out of stock
                  </span>
                </div>
              )}
            </div>

            {product.safetyInstructions && (
              <div className="surface mt-4 rounded-sm p-5">
                <h2 className="label text-status-warn">Safety instructions</h2>
                <p className="mt-2 text-sm whitespace-pre-line text-fg-muted">
                  {product.safetyInstructions}
                </p>
              </div>
            )}
          </div>

          {/* Buy column */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={product.module === 'PERSONALIZED' ? 'ember' : 'neutral'}>
                  {product.module}
                </Badge>
                <Badge tone={product.inStock ? 'ok' : 'danger'}>
                  {product.inStock ? 'Available to order' : 'Unavailable'}
                </Badge>
                {product.category && <Badge tone="outline">{product.category}</Badge>}
              </div>

              <h1 className="mt-4 text-2xl leading-tight font-extrabold tracking-[0.01em] text-fg uppercase sm:text-4xl">
                {product.name}
              </h1>

              {product.shortDescription && (
                <p className="mt-3 text-sm text-fg-muted">{product.shortDescription}</p>
              )}

              <div className="mt-5 flex flex-wrap items-baseline gap-3">
                <span className="numeric text-3xl font-bold text-fg">{formatINR(price)}</span>
                {mrp && (
                  <>
                    <span className="numeric text-base text-fg-ghost line-through">{formatINR(mrp)}</span>
                    <Badge tone="ember">Save {formatINR(mrp - price)}</Badge>
                  </>
                )}
              </div>

              {mrp && (
                <p className="numeric mt-1 text-[11px] text-fg-dim">
                  {discountPercent(mrp, price)}% below MRP · inclusive of taxes
                </p>
              )}

              <div className="mt-8">
                <BuyPanel product={product} signedIn={Boolean(session)} wishlisted={wishlisted} />
              </div>

              <dl className="mt-8 divide-y divide-hairline border-y border-hairline">
                {specs.map((spec) => (
                  <div key={spec.label} className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="label">{spec.label}</dt>
                    <dd className="numeric text-right text-xs text-fg-muted">{spec.value}</dd>
                  </div>
                ))}
              </dl>

              {product.description && (
                <div className="mt-6">
                  <h2 className="label">Specification / notes</h2>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-fg-muted">
                    {product.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20 border-t border-hairline pt-14">
            <SectionHeader
              index="02"
              title="Related products"
              subtitle={`More from the ${product.category || product.module.toLowerCase()} range`}
              href={`/module/${product.module.toLowerCase()}`}
            />
            <ProductGrid products={related} priorityCount={0} />
          </section>
        )}
      </div>
    </>
  );
}
