import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAppServices } from '@/infra/db';
import { readCustomerSession } from '@/infra/auth/guards';
import { SITE } from '@/infra/config';
import { toSafeJsonLd } from '@/infra/seo/json-ld';
import { pricePaise, primaryImage } from '@/core/domain/product';
import { findFamilyForProductOrId } from '@/core/domain/catalog-families';
import { ProductGrid } from '@/ui/product-grid';
import { SectionHeader } from '@/ui/section-header';
import { ProductDetailView } from '@/features/product/product-detail-view';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const services = await getAppServices();
  let view = await services.catalogue.product(id);
  if (!view) {
    const allProducts = await services.repos.products.list({ includeHidden: false });
    const familyMatch = findFamilyForProductOrId(id, allProducts);
    if (familyMatch) {
      view = { product: familyMatch.selectedVariant.product, related: [] };
    }
  }
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
  const allProducts = await services.repos.products.list({ includeHidden: false });
  let view = await services.catalogue.product(id);
  const familyMatch = findFamilyForProductOrId(id, allProducts);

  if (!view && familyMatch) {
    view = { product: familyMatch.selectedVariant.product, related: [] };
  }
  if (!view) notFound();

  const { product, related } = view;
  const session = await readCustomerSession();
  const wishlisted = session ? await services.accounts.isWishlisted(session.sub, product.id) : false;

  const price = pricePaise(product);
  const image = primaryImage(product);

  const specs: { label: string; value: string }[] = [
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
          <span className="font-mono uppercase tracking-[0.14em] text-fg-muted">
            {familyMatch?.family.hasMultipleVariants ? familyMatch.family.title : product.name}
          </span>
        </nav>

        <ProductDetailView
          family={familyMatch ? familyMatch.family : null}
          initialProduct={product}
          initialVariantId={product.id}
          signedIn={Boolean(session)}
          wishlisted={wishlisted}
          specs={specs}
        />

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
