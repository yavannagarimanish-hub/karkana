import type { MetadataRoute } from 'next';
import { SITE } from '@/infra/config';

const siteUrl = SITE.url;

/**
 * robots.txt is generated rather than committed so the sitemap URL always
 * matches the deployed host.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Account and operator areas carry no indexable content.
          '/account',
          '/admin',
          '/checkout',
          '/cart',
          '/thank-you',
          // API surface: never crawlable, and crawling it wastes budget.
          '/api/',
        ],
      },
    ],
    sitemap: `${siteUrl.replace(/\/$/, '')}/sitemap.xml`,
    host: siteUrl.replace(/\/$/, ''),
  };
}
