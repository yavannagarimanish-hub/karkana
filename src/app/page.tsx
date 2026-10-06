import type { Metadata } from 'next';
import { getAppServices } from '@/infra/db';
import { SITE } from '@/infra/config';
import {
  PRIMARY_SECTIONS,
  PRIMARY_SECTION_SLUGS,
  PRIMARY_SECTION_DESCRIPTIONS,
  buildProductFamilies,
} from '@/core/domain/catalog-families';
import { ProductGrid } from '@/ui/product-grid';
import { SectionHeader } from '@/ui/section-header';
import { HomepageRockets } from '@/features/home/homepage-rockets';
import { CategoryBar } from '@/ui/category-bar';
import { CategoryGrid, type CategorySummary } from '@/ui/category-card';
import { toSafeJsonLd, buildOrganizationJsonLd } from '@/infra/seo/json-ld';

export const metadata: Metadata = {
  title: 'Buy Crackers Online',
  description: `Browse the ${SITE.name} catalogue: basic, customized and personalized crackers with cash on delivery across India.`,
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const services = await getAppServices();
  const [home, products] = await Promise.all([
    services.catalogue.home(),
    services.repos.products.list({ includeHidden: false }),
  ]);
  const families = buildProductFamilies(products);

  const siteUrl = SITE.url.startsWith('https://') ? SITE.url : 'https://karkana.setacore.com';
  const organizationJsonLd = buildOrganizationJsonLd({
    name: SITE.name,
    url: siteUrl,
    logoUrl: `${siteUrl}/icon.jpg`,
    email: SITE.supportEmail,
    telephone: `+91-${SITE.supportPhone}`,
    city: SITE.city,
  });

  // Merchandising sections in the specified hierarchy
  const featured = home.sections.find((s) => s.section.key === 'featured');
  const popular = home.sections.find((s) => s.section.key === 'popular');
  const customized = home.sections.find((s) => s.section.key === 'customized');
  const personalized = home.sections.find((s) => s.section.key === 'personalized');

  // Summary counts for the 9 basic categories
  const categorySummaries: CategorySummary[] = PRIMARY_SECTIONS.map((sec) => {
    const secFamilies = families.filter((f) => f.section === sec);
    const skuCount = secFamilies.reduce((acc, f) => acc + f.variants.length, 0);
    return {
      section: sec,
      slug: PRIMARY_SECTION_SLUGS[sec],
      description: PRIMARY_SECTION_DESCRIPTIONS[sec],
      familyCount: secFamilies.length,
      skuCount,
    };
  });

  return (
    <>
      {/* ── Organization Structured Data (Google Search / Logo rich result) ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toSafeJsonLd(organizationJsonLd) }}
      />

      {/* ── Subtle background rocket animation (homepage only, strictly behind content) ── */}
      <HomepageRockets />

      {/* ── Content layer with elevated z-index ── */}
      <div className="relative z-10">
        {/* ── 9 Primary Sections Quick Category Bar ── */}
        <CategoryBar />

        {/* ── 1. FEATURED PRODUCTS (Above categories) ── */}
        {featured && featured.products.length > 0 && (
          <section
            key={featured.section.id}
            className="mx-auto max-w-7xl border-t border-hairline px-4 py-16 sm:px-8 sm:py-24 lg:px-12"
          >
            <SectionHeader
              index="01"
              title={featured.section.title}
              subtitle={featured.section.subtitle || undefined}
              actionVariant="button"
            />
            <ProductGrid products={featured.products} />
          </section>
        )}

        {/* ── 2. POPULAR CRACKERS (Above categories) ── */}
        {popular && popular.products.length > 0 && (
          <section
            key={popular.section.id}
            className="mx-auto max-w-7xl border-t border-hairline px-4 py-16 sm:px-8 sm:py-24 lg:px-12"
          >
            <SectionHeader
              index="02"
              title={popular.section.title}
              subtitle={popular.section.subtitle || undefined}
              actionVariant="button"
            />
            <ProductGrid products={popular.products} />
          </section>
        )}

        {/* ── 3. BASIC / SHOP BY CATEGORY (9 Category entry points) ── */}
        <section
          id="basic"
          className="mx-auto max-w-7xl border-t border-hairline px-4 py-16 sm:px-8 sm:py-24 lg:px-12 scroll-mt-28"
        >
          <SectionHeader
            index="03"
            title="BASIC CATALOGUE"
            subtitle="Explore essential celebration crackers across 9 distinct departments"
            href="/module/basic"
            linkLabel="View All"
            actionVariant="button"
          />
          <CategoryGrid categories={categorySummaries} />
        </section>

        {/* ── 4. CUSTOMIZED CATALOGUE ── */}
        {customized && customized.products.length > 0 && (
          <section
            key={customized.section.id}
            className="mx-auto max-w-7xl border-t border-hairline px-4 py-16 sm:px-8 sm:py-24 lg:px-12"
          >
            <SectionHeader
              index="04"
              title={customized.section.title}
              subtitle={customized.section.subtitle || undefined}
              href={`/module/${customized.section.key}`}
              linkLabel="View All"
              actionVariant="button"
            />
            <ProductGrid products={customized.products} />
          </section>
        )}

        {/* ── 5. PERSONALIZED CATALOGUE ── */}
        {personalized && personalized.products.length > 0 && (
          <section
            key={personalized.section.id}
            className="mx-auto max-w-7xl border-t border-hairline px-4 py-16 sm:px-8 sm:py-24 lg:px-12"
          >
            <SectionHeader
              index="05"
              title={personalized.section.title}
              subtitle={personalized.section.subtitle || undefined}
              href={`/module/${personalized.section.key}`}
              linkLabel="View All"
              actionVariant="button"
            />
            <ProductGrid products={personalized.products} />
          </section>
        )}

        {/* ── Support strip ── */}
        <section className="mx-auto max-w-7xl border-t border-hairline px-4 py-16 sm:px-8 lg:px-12">
          <div className="surface flex flex-col gap-6 rounded-sm p-6 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <h2 className="text-lg font-bold uppercase tracking-[0.08em] text-fg sm:text-xl">
                Ordering for an event?
              </h2>
              <p className="mt-2 max-w-xl text-sm text-fg-muted">
                Call the workshop and we will assemble a mixed box for your date. Cash on delivery,
                verified before dispatch.
              </p>
            </div>
            <a
              href={`tel:${SITE.supportPhone}`}
              className="numeric inline-flex h-12 shrink-0 items-center justify-center rounded-sm bg-ember px-6 text-sm font-bold text-fg transition-colors hover:bg-ember-hover"
            >
              {SITE.supportPhone}
            </a>
          </div>
        </section>
      </div>
    </>
  );
}

