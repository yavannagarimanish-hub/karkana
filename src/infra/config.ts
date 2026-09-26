import { env } from './env';

/** Site-wide constants. Overridable by environment so no page hardcodes them. */
export const SITE = {
  name: 'Karkana',
  /** Absolute origin, from env. Used for canonicals, sitemap, robots and OG tags. */
  url: env.KARKANA_SITE_URL,
  tagline: 'Pyrotechnic atelier',
  city: process.env.KARKANA_CITY ?? 'Hyderabad',
  supportPhone: process.env.KARKANA_SUPPORT_PHONE ?? '7207294554',
  supportEmail: process.env.KARKANA_SUPPORT_EMAIL ?? 'hello@karkana.com',
  /** Admin host used for the subdomain rewrite in `src/proxy.ts`. */
  adminHost: process.env.KARKANA_ADMIN_HOST ?? 'admin.karkana.com',
} as const;

export const isStorageConfigured = () => Boolean(env.R2_BUCKET && env.R2_ACCESS_KEY_ID);
