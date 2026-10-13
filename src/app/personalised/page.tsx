import type { Metadata } from 'next';
import Link from 'next/link';
import { getAppServices } from '@/infra/db';
import { PersonalisedStudio } from '@/features/personalised/personalised-studio';

export const metadata: Metadata = {
  title: 'Personalised Fireworks Boxes · Create Your Own',
  description: 'Upload your photograph and print your family name directly on authentic handcrafted Sivakasi celebration boxes.',
  alternates: { canonical: '/personalised' },
};

export default async function PersonalisedPage() {
  const services = await getAppServices();
  const allProducts = await services.repos.products.list({ includeHidden: false });
  const templates = allProducts.filter((p) => p.module === 'PERSONALIZED');

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16 lg:px-12">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-[11px] text-fg-dim">
        <Link href="/" className="transition-colors hover:text-fg">
          Home
        </Link>
        <span aria-hidden>/</span>
        <span className="font-mono uppercase tracking-[0.14em] text-fg-muted">Personalised Atelier</span>
      </nav>

      <PersonalisedStudio templates={templates} isStandalonePage={true} />
    </div>
  );
}
