import Link from 'next/link';
import type { Metadata } from 'next';
import { getAppServices } from '@/infra/db';
import { SITE } from '@/infra/config';
import { formatINR } from '@/core/domain/money';
import { Badge } from '@/ui/badge';
import { EmptyState } from '@/ui/empty-state';
import { ProductGrid } from '@/ui/product-grid';
import { SectionHeader } from '@/ui/section-header';

export const metadata: Metadata = {
  title: 'Buy Crackers Online',
  description: `Browse the ${SITE.name} catalogue: basic, customized and personalized crackers dispatched from ${SITE.city} with cash on delivery across India.`,
  alternates: { canonical: '/' },
};

const MODULE_COPY: Record<string, { blurb: string; tone: 'neutral' | 'ember' }> = {
  BASIC: {
    blurb:
      'The classics: sparklers, chakkars, flower pots and ground spinners, built for clean sound and bright burn.',
    tone: 'neutral',
  },
  CUSTOMIZED: {
    blurb:
      'Themed packaging editions: cinematic, commemorative and seasonal designs curated in the workshop.',
    tone: 'neutral',
  },
  PERSONALIZED: {
    blurb:
      'Your photograph printed on the box. Upload an image, add instructions, and we build the packaging around it.',
    tone: 'ember',
  },
};

export default async function HomePage() {
  const services = await getAppServices();
  const home = await services.catalogue.home();

  // Modules with no visible products are not advertised at all.
  const liveModules = home.moduleCards.filter((card) => card.count > 0);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-7xl px-4 pt-14 pb-16 sm:px-8 sm:pt-24 sm:pb-24 lg:px-12">
          <p className="live-dot label">Season catalogue · {SITE.city}</p>

          <h1 className="mt-6 max-w-4xl text-[2.5rem] leading-[1.02] font-extrabold tracking-[-0.02em] uppercase sm:text-6xl lg:text-7xl">
            Karkana
            <span className="block text-fg-ghost">Crackers</span>
          </h1>

          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">
            Engineered pyrotechnics in three modules: classical formulations, themed editions,
            and boxes built around your own photograph. Cash on delivery, dispatched direct from
            the workshop.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="#modules"
              className="inline-flex h-11 items-center rounded-sm bg-fg px-5 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-void transition-colors hover:bg-ember hover:text-fg"
            >
              Explore modules
            </Link>
            <Link
              href="/search"
              className="inline-flex h-11 items-center rounded-sm px-5 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-fg shadow-hairline-strong transition-colors hover:text-ember"
            >
              Search {home.counts.total} products
            </Link>
          </div>

          <dl className="mt-12 grid grid-cols-2 gap-px border-t border-hairline sm:grid-cols-4">
            {[
              { label: 'Products', value: home.counts.total },
              { label: 'Categories', value: home.counts.categories.length },
              { label: 'Modules live', value: liveModules.length },
              {
                label: 'From',
                value:
                  liveModules.length > 0
                    ? formatINR(
                        Math.min(
                          ...liveModules
                            .map((card) => card.fromPricePaise)
                            .filter((price): price is number => price !== null),
                        ) || 0,
                      )
                    : 'n/a',
              },
            ].map((stat) => (
              <div key={stat.label} className="pt-5">
                <dt className="label">{stat.label}</dt>
                <dd className="numeric mt-1 text-xl font-bold text-fg sm:text-2xl">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Modules (generated from the live catalogue) ──────────────────── */}
      <section id="modules" className="mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-24 lg:px-12">
        <SectionHeader
          index="01"
          title="Modules"
          subtitle="Three ways to buy. Counts below are the live catalogue, not marketing copy."
        />

        {liveModules.length === 0 ? (
          <EmptyState
            title="The catalogue is empty"
            message="No products are visible yet. Add and publish products from the control centre."
            actionLabel="Open control centre"
            actionHref="/admin"
          />
        ) : (
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            {liveModules.map((card, index) => {
              const copy = MODULE_COPY[card.module] ?? MODULE_COPY.BASIC!;
              const label = card.module.charAt(0) + card.module.slice(1).toLowerCase();

              return (
                <Link
                  key={card.module}
                  href={`/module/${card.slug}`}
                  className={`group surface flex flex-col rounded-sm p-6 transition-[box-shadow,background-color] duration-200 hover:bg-panel-raised sm:p-8 ${
                    copy.tone === 'ember'
                      ? 'shadow-[inset_0_0_0_1px_rgba(255,0,51,0.35)] hover:shadow-[inset_0_0_0_1px_var(--color-ember)]'
                      : 'hover:shadow-hairline-strong'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="numeric text-4xl font-extrabold text-fg-ghost transition-colors group-hover:text-ember sm:text-5xl">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <Badge tone={copy.tone}>
                      {card.count} {card.count === 1 ? 'item' : 'items'}
                    </Badge>
                  </div>

                  <h2 className="mt-10 text-xl font-bold uppercase tracking-[0.08em] text-fg sm:text-2xl">
                    {label}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-fg-muted">{copy.blurb}</p>

                  {card.idRange && (
                    <p className="numeric mt-4 text-[11px] text-fg-dim">
                      {card.idRange.first} – {card.idRange.last}
                    </p>
                  )}

                  {card.topCategories.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {card.topCategories.map((category) => (
                        <Badge key={category} tone="outline">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-8 flex items-center justify-between border-t border-hairline pt-5">
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-muted group-hover:text-fg">
                      {card.fromPricePaise !== null
                        ? `From ${formatINR(card.fromPricePaise)}`
                        : 'Open module'}
                    </span>
                    <span aria-hidden className="text-ember transition-transform duration-200 group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

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
    </>
  );
}
