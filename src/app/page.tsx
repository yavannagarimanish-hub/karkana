import type { Metadata } from 'next';
import { getAppServices } from '@/infra/db';
import { SITE } from '@/infra/config';
import { ProductGrid } from '@/ui/product-grid';
import { SectionHeader } from '@/ui/section-header';
import { HomepageRockets } from '@/features/home/homepage-rockets';

export const metadata: Metadata = {
  title: 'Buy Crackers Online',
  description: `Browse the ${SITE.name} catalogue: basic, customized and personalized crackers with cash on delivery across India.`,
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const services = await getAppServices();
  const home = await services.catalogue.home();

  return (
    <>
      {/* ── Subtle background rocket animation (homepage only, strictly behind content) ── */}
      <HomepageRockets />

      {/* ── Content layer with elevated z-index ── */}
      <div className="relative z-10">
        {/* ── Catalogue sections (only the ones with products) ─────────────── */}
      {home.sections.map((entry, index) => (
        <section
          key={entry.section.id}
          className="mx-auto max-w-7xl border-t border-hairline px-4 py-16 sm:px-8 sm:py-24 lg:px-12"
        >
          <SectionHeader
            index={String(index + 2).padStart(2, '0')}
            title={entry.section.title}
            subtitle={entry.section.subtitle || undefined}
            href={
              entry.section.key === 'popular' || entry.section.key === 'featured'
                ? undefined
                : `/module/${entry.section.key}`
            }
            linkLabel="View all"
          />
          <ProductGrid products={entry.products} />
        </section>
      ))}

      {/* ── Support strip ────────────────────────────────────────────────── */}
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
