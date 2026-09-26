import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { PricingPolicy } from '@/core/domain/pricing';
import { rupeesToPaise } from '@/core/domain/money';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /** Absolute origin. Drives canonical URLs, sitemap, robots and Open Graph. */
  KARKANA_SITE_URL: z
    .string()
    .url()
    .default('http://localhost:3000')
    .transform((value) => value.replace(/\/+$/, '')),

  KARKANA_SESSION_SECRET: z.string().min(1).optional(),

  ADMIN_USERNAME: z.string().min(1).default('admin@karkana.com'),
  ADMIN_PASSWORD_HASH: z.string().min(1).optional(),

  DATABASE_URL: z.string().min(1).optional(),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),
  R2_REGION: z.string().optional(),
  CDN_HOST: z.string().optional(),

  /** Whole rupees; converted to paise for pricing. */
  KARKANA_PERSONALIZATION_FEE: z.coerce.number().int().min(0).default(0),
  KARKANA_SHIPPING_FEE: z.coerce.number().int().min(0).default(0),
  KARKANA_FREE_SHIPPING_OVER: z.coerce.number().int().min(0).optional(),
});

export const env = envSchema.parse(process.env);

export const isProduction = env.NODE_ENV === 'production';

/* ── Session secret ─────────────────────────────────────────────────────────
   v1 shipped a hardcoded fallback secret in source. That is gone: production
   refuses to start without one, development generates an ephemeral one.
   ─────────────────────────────────────────────────────────────────────────── */

const MIN_SECRET_LENGTH = 32;
let cachedSecret: string | null = null;

export function sessionSecret(): string {
  if (cachedSecret) return cachedSecret;

  const configured = env.KARKANA_SESSION_SECRET?.trim();
  if (configured && configured.length >= MIN_SECRET_LENGTH) {
    cachedSecret = configured;
    return cachedSecret;
  }

  if (isProduction) {
    throw new Error(
      `KARKANA_SESSION_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters in production. ` +
        'Generate one with: openssl rand -hex 32',
    );
  }

  cachedSecret = randomBytes(32).toString('hex');
  console.warn(
    `[karkana] KARKANA_SESSION_SECRET is not set, so using an ephemeral development secret. ` +
      `Sessions will not survive a restart. Set it in .env.local to stop this warning.`,
  );
  return cachedSecret;
}

/* ── Pricing policy ─────────────────────────────────────────────────────── */

export function pricingPolicyFromEnv(): PricingPolicy {
  return {
    personalizationFeePaise: rupeesToPaise(env.KARKANA_PERSONALIZATION_FEE),
    shippingPaise: rupeesToPaise(env.KARKANA_SHIPPING_FEE),
    freeShippingOverPaise:
      env.KARKANA_FREE_SHIPPING_OVER === undefined
        ? null
        : rupeesToPaise(env.KARKANA_FREE_SHIPPING_OVER),
  };
}

export function isPostgresConfigured(): boolean {
  return Boolean(env.DATABASE_URL);
}
