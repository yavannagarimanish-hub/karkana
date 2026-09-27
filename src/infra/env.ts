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
  /** Optional second operator login, accepted alongside ADMIN_USERNAME. */
  ADMIN_USERNAME_ALT: z.string().optional(),
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
  /**
   * Minimum merchandise value in whole rupees before an order can be placed.
   * Enforced server-side; the cart and checkout show the shortfall. 0 disables.
   */
  KARKANA_MIN_ORDER: z.coerce.number().int().min(0).default(530),
});

/**
 * Alternative environment-variable names accepted as aliases, so a deployment
 * can use either the canonical KARKANA_* / R2_* names or the shorter names some
 * operators prefer. A canonical name always wins; an alias is used only when
 * its canonical counterpart is unset.
 *
 *   ADMIN_SESSION_SECRET                                  -> KARKANA_SESSION_SECRET
 *   B2_BUCKET / B2_REGION / B2_ENDPOINT /
 *   B2_ACCESS_KEY_ID / B2_SECRET_ACCESS_KEY               -> R2_*
 *   VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL            -> KARKANA_SITE_URL (https)
 *
 * DATABASE_URL gets the same treatment, because deployments that prefix every
 * variable (the Vercel `karkana_*` env) never define the plain name. Each
 * source below is accepted bare and with a `karkana_` prefix, first configured
 * wins, pooled flavours preferred over direct ones:
 *
 *   DATABASE_URL (canonical) > karkana_DATABASE_URL >
 *   POSTGRES_URL > POSTGRES_PRISMA_URL >
 *   DATABASE_URL_UNPOOLED > POSTGRES_URL_NON_POOLING > POSTGRES_URL_NO_SSL
 *
 * As a last resort the URL is composed from the libpq-style PGHOST / PGUSER /
 * PGPASSWORD / PGDATABASE / PGPORT parameters (POSTGRES_HOST / POSTGRES_USER /
 * POSTGRES_PASSWORD / POSTGRES_DATABASE also recognised).
 *
 * ADMIN_SALT is deliberately NOT aliased: passwords use a unique per-password
 * salt stored inside each PBKDF2 hash (see src/infra/auth/password.ts), so a
 * single global salt would weaken security. It can be removed from the env.
 *
 * NOTE: the Vercel fallback yields the *.vercel.app origin. For correct
 * canonicals/sitemap on a custom domain, still set KARKANA_SITE_URL explicitly.
 */
function resolveAliases(raw: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const resolved: NodeJS.ProcessEnv = { ...raw };

  const fallback = (canonical: string, alias: string) => {
    if (!resolved[canonical] && resolved[alias]) resolved[canonical] = resolved[alias];
  };

  fallback('KARKANA_SESSION_SECRET', 'ADMIN_SESSION_SECRET');
  fallback('R2_BUCKET', 'B2_BUCKET');
  fallback('R2_REGION', 'B2_REGION');
  fallback('R2_ENDPOINT', 'B2_ENDPOINT');
  fallback('R2_ACCESS_KEY_ID', 'B2_ACCESS_KEY_ID');
  fallback('R2_SECRET_ACCESS_KEY', 'B2_SECRET_ACCESS_KEY');

  // Postgres connection string. First configured wins; pooled flavours come
  // before direct ones. Every name is honoured bare and `karkana_`-prefixed.
  fallback('DATABASE_URL', 'karkana_DATABASE_URL');
  for (const alias of [
    'POSTGRES_URL',
    'POSTGRES_PRISMA_URL',
    'DATABASE_URL_UNPOOLED',
    'POSTGRES_URL_NON_POOLING',
    'POSTGRES_URL_NO_SSL',
  ]) {
    fallback('DATABASE_URL', alias);
    fallback('DATABASE_URL', `karkana_${alias}`);
  }

  // Last resort: compose the URL from libpq-style parameters so a deployment
  // that only exports PGHOST/PGUSER/… (bare or prefixed) still connects.
  if (!resolved.DATABASE_URL) {
    const pick = (...names: string[]): string | undefined => {
      for (const name of names) {
        const value = resolved[name] ?? resolved[`karkana_${name}`];
        if (value) return value;
      }
      return undefined;
    };

    const host = pick('PGHOST', 'PGHOST_UNPOOLED', 'POSTGRES_HOST');
    if (host) {
      const user = pick('PGUSER', 'POSTGRES_USER');
      const password = pick('PGPASSWORD', 'POSTGRES_PASSWORD');
      const database = pick('PGDATABASE', 'POSTGRES_DATABASE');
      const port = pick('PGPORT');

      const auth = user
        ? `${encodeURIComponent(user)}${password ? `:${encodeURIComponent(password)}` : ''}@`
        : '';
      const hostPart = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
      const portPart = port ? `:${port}` : '';
      const dbPart = database ? `/${database}` : '';

      resolved.DATABASE_URL = `postgresql://${auth}${hostPart}${portPart}${dbPart}`;
    }
  }

  if (!resolved.KARKANA_SITE_URL) {
    const vercelHost = resolved.VERCEL_PROJECT_PRODUCTION_URL ?? resolved.VERCEL_URL;
    if (vercelHost) resolved.KARKANA_SITE_URL = `https://${vercelHost}`;
  }

  return resolved;
}

export const env = envSchema.parse(resolveAliases(process.env));

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
    minOrderPaise: rupeesToPaise(env.KARKANA_MIN_ORDER),
  };
}

export function isPostgresConfigured(): boolean {
  return Boolean(env.DATABASE_URL);
}
