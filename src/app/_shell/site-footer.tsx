import { getAppServices } from '@/infra/db';
import { SITE } from '@/infra/config';
import { Footer } from '@/ui/footer';

export async function SiteFooter({ className }: { className?: string }) {
  const services = await getAppServices();
  const home = await services.catalogue.home();

  return (
    <Footer
      className={className}
      moduleCounts={home.moduleCards.map((card) => ({
        slug: card.slug,
        label: card.module.charAt(0) + card.module.slice(1).toLowerCase(),
        count: card.count,
      }))}
      name={SITE.name}
      tagline={SITE.tagline}
      city={SITE.city}
      supportPhone={SITE.supportPhone}
      supportEmail={SITE.supportEmail}
    />
  );
}
