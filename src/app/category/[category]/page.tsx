import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAppServices } from '@/infra/db';
import { SITE } from '@/infra/config';
import {
  PRIMARY_SECTION_SLUGS,
  PRIMARY_SECTION_DESCRIPTIONS,
  sectionFromSlug,
  buildProductFamilies,
} from '@/core/domain/catalog-families';
import { CategoryBar } from '@/ui/category-bar';
import { FamilyGrid } from '@/ui/family-grid';

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  return Object.values(PRIMARY_SECTION_SLUGS).map((slug) => ({
    category: slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const section = sectionFromSlug(category);
  if (!section) return { title: 'Category not found' };

  const desc = PRIMARY_SECTION_DESCRIPTIONS[section];
  const title = `${section} Crackers`;

  return {
    title,
    description: `Browse ${title} at ${SITE.name}. ${desc}. Cash on delivery across India.`,
    alternates: { canonical: `/category/${PRIMARY_SECTION_SLUGS[section]}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const section = sectionFromSlug(category);
  if (!section) notFound();

  const services = await getAppServices();
  const allProducts = await services.repos.products.list({ includeHidden: false });
  const allFamilies = buildProductFamilies(allProducts);
  const families = allFamilies.filter((f) => f.section === section);
  const totalSkus = families.reduce((acc, f) => acc + f.variants.length, 0);
  const description = PRIMARY_SECTION_DESCRIPTIONS[section];

  return (
    <div className="relative z-10">
      {/* Category Navigation Bar */}
      <CategoryBar activeSection={section} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12 lg:px-12">
        {/* Breadcrumb & Navigation Header */}
        <div className="border-b border-hairline pb-6 sm:pb-8">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-dim">
            <Link href="/#basic" className="hover:text-ember transition-colors">
              ← Back to Catalogue
            </Link>
            <span>/</span>
            <span className="text-ember">{section}</span>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <h1 className="font-display text-2xl sm:text-4xl font-extrabold uppercase tracking-[0.02em] text-fg">
              {section}
            </h1>
            <p className="numeric font-mono text-xs text-fg-dim">
              {families.length} {families.length === 1 ? 'family' : 'families'} · {totalSkus} items
            </p>
          </div>

          <p className="mt-2 max-w-2xl text-xs sm:text-sm text-fg-muted leading-relaxed">
            {description}. Verified before dispatch with cash on delivery across India.
          </p>
        </div>

        {/* 3-Column Mobile & Responsive Product Family Grid */}
        <div className="mt-8 sm:mt-12">
          <FamilyGrid families={families} priorityCount={6} />
        </div>
      </main>

      {/* Support Strip */}
      <section className="mx-auto max-w-7xl border-t border-hairline px-4 py-16 sm:px-8 lg:px-12 mt-16">
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
  );
}
