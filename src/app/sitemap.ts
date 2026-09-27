import type { MetadataRoute } from 'next';
import { getAppServices } from '@/infra/db';
import { SITE } from '@/infra/config';
import { MODULE_SLUGS } from '@/core/domain/product';
import type { ModuleView } from '@/core/services/catalogue';

const siteUrl = SITE.url;

/**
 * Generated from the live catalogue so a new product appears in the sitemap
 * without anyone editing a file. Never expose admin or account routes.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  /*
   * Only routes a crawler is allowed to index belong here. `/cart`,
   * `/account/*`, `/checkout` and `/thank-you` are blocked in robots.ts, and
   * advertising a URL in the sitemap while disallowing it in robots.txt is a
   * signal conflict that costs crawl budget, so they are deliberately absent.
   */
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/search`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${siteUrl}/privacy-policy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const moduleRoutes: MetadataRoute.Sitemap = Object.values(MODULE_SLUGS).map((slug) => ({
    url: `${siteUrl}/module/${slug}`,
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  // Only published products are listed. Built from the public module pages so
  // hidden products can never leak into the sitemap. A database outage or a
  // stale schema must not take down a production build just to generate SEO
  // metadata; the static and module URLs are still useful on their own.
  let modulePages: (ModuleView | null)[];
  try {
    const services = await getAppServices();
    modulePages = await Promise.all(
      Object.keys(MODULE_SLUGS).map((slug) =>
        services.catalogue.modulePage(MODULE_SLUGS[slug as keyof typeof MODULE_SLUGS], {}, 1, 1000),
      ),
    );
  } catch (error) {
    console.error('[karkana] Could not load products for sitemap; using static routes:', error);
    return [...staticRoutes, ...moduleRoutes];
  }

  const seen = new Set<string>();
  const productRoutes: MetadataRoute.Sitemap = [];

  for (const view of modulePages) {
    if (!view) continue;
    for (const product of view.products) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      productRoutes.push({
        url: `${siteUrl}/product/${product.id}`,
        lastModified: product.updatedAt ? new Date(product.updatedAt) : undefined,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  return [...staticRoutes, ...moduleRoutes, ...productRoutes];
}
