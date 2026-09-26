import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIES } from './infra/auth/cookie-names';
import { buildCspHeader, buildHstsHeader } from './infra/http/security-headers';

/**
 * Next 16 renamed `middleware.ts` to `proxy.ts` (Node.js runtime, no `runtime`
 * config) and documents it as unsuitable for authorization. This file therefore
 * does only what the docs bless:
 *
 *   1. subdomain rewrites,
 *   2. *optimistic* redirects for a better UX,
 *   3. per-request security headers (CSP nonce, HSTS).
 *
 * The authoritative checks live in `src/infra/auth/guards.ts` and run in every
 * protected route handler, Server Action and admin layout.
 */

const ADMIN_HOSTS = ['admin.karkana.com', 'admin.localhost:3000', 'admin.localhost'];
const PUBLIC_ACCOUNT_PATHS = new Set(['/account/login', '/account/register']);

/** Object-storage / CDN hosts that `next/image` may fetch from. */
function imageHosts(): string[] {
  const hosts: string[] = [];
  const bucket = process.env.R2_BUCKET || process.env.B2_BUCKET || '';
  const accountId = process.env.R2_ACCOUNT_ID || '';
  if (bucket && accountId) hosts.push(`${accountId}.r2.cloudflarestorage.com`);
  const cdn = process.env.CDN_HOST || '';
  if (cdn) hosts.push(cdn.replace(/^https?:\/\//, '').replace(/\/$/, ''));
  return hosts;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get('host') ?? '').toLowerCase();
  const isDev = process.env.NODE_ENV === 'development';

  /*
   * A fresh nonce per request. Next reads the CSP off the *request* headers and
   * stamps its own inline scripts with the matching nonce, so injected markup
   * cannot execute. The root layout renders dynamically, which nonces require.
   */
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCspHeader({
    nonce,
    isDev,
    // Only upgrade once TLS is in front of the app; over plain HTTP the
    // directive would break every subresource.
    upgradeInsecureRequests: request.headers.get('x-forwarded-proto') === 'https',
    imageHosts: imageHosts(),
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const hsts =
    request.headers.get('x-forwarded-proto') === 'https' ? buildHstsHeader() : null;

  /** Attach the security headers to any response this proxy returns. */
  function secured(response: NextResponse): NextResponse {
    response.headers.set('Content-Security-Policy', csp);
    if (hsts) response.headers.set('Strict-Transport-Security', hsts);
    return response;
  }

  /* 1. admin.<domain> serves the control centre at its root. */
  if (ADMIN_HOSTS.some((candidate) => host === candidate || host.startsWith(candidate))) {
    if (!pathname.startsWith('/admin')) {
      const url = request.nextUrl.clone();
      url.pathname = pathname === '/' ? '/admin' : `/admin${pathname}`;
      url.search = request.nextUrl.search;
      return secured(NextResponse.rewrite(url, { request: { headers: requestHeaders } }));
    }
  }

  const hasAdminCookie = Boolean(request.cookies.get(SESSION_COOKIES.admin));
  const hasCustomerCookie = Boolean(request.cookies.get(SESSION_COOKIES.customer));

  /* 2. Optimistic redirects — presence of the cookie only, never its validity. */
  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !hasAdminCookie) {
    return secured(NextResponse.redirect(new URL('/admin/login', request.url)));
  }

  if (pathname.startsWith('/account') && !PUBLIC_ACCOUNT_PATHS.has(pathname) && !hasCustomerCookie) {
    const url = new URL('/account/login', request.url);
    url.searchParams.set('next', pathname);
    return secured(NextResponse.redirect(url));
  }

  /* 3. Signed in already? Skip the login screens. */
  if (pathname === '/admin/login' && hasAdminCookie) {
    return secured(NextResponse.redirect(new URL('/admin', request.url)));
  }
  if (pathname === '/account/login' && hasCustomerCookie) {
    return secured(NextResponse.redirect(new URL('/account', request.url)));
  }

  return secured(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: [
    /*
     * Everything except Next's own assets, the favicon and uploaded media.
     * The `.*\\..*` clause keeps static files out of the proxy entirely.
     */
    '/((?!_next/static|_next/image|favicon.ico|uploads/|.*\\..*).*)',
  ],
};
