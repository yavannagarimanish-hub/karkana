import type { NextConfig } from 'next';

const r2Bucket = process.env.R2_BUCKET || process.env.B2_BUCKET || '';
const r2AccountId = process.env.R2_ACCOUNT_ID || '';
const cdnHost = process.env.CDN_HOST || '';

/** Object-storage hosts that `next/image` is allowed to optimise. */
const remotePatterns = [
  r2AccountId && r2Bucket
    ? { protocol: 'https' as const, hostname: `${r2AccountId}.r2.cloudflarestorage.com` }
    : null,
  cdnHost ? { protocol: 'https' as const, hostname: cdnHost } : null,
].filter((pattern): pattern is { protocol: 'https'; hostname: string } => pattern !== null);

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/**
 * Origins allowed to fetch Next's dev-only resources (HMR, devtools fonts).
 * Dev-only and inert in production. Set from the environment so no sandbox- or
 * tunnel-specific hostname is ever committed to the repository.
 */
const allowedDevOrigins = (process.env.KARKANA_ALLOWED_DEV_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),

  // Native/Node-only packages must never be pulled into a client bundle.
  serverExternalPackages: ['pg', '@aws-sdk/client-s3'],

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns,
  },

  turbopack: {
    resolveAlias: {},
  },

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
