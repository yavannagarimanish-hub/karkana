/**
 * Content Security Policy + HSTS construction for `src/proxy.ts`.
 *
 * Kept in its own dependency-free module so the proxy layer does not have to
 * import the env/config layers, and so the policy string can be unit tested
 * without booting Next.
 */

export interface CspOptions {
  /** Per-request nonce. Must be unique and unpredictable. */
  nonce: string;
  /** React uses `eval` for richer dev error stacks; never needed in prod. */
  isDev: boolean;
  /** Upgrade http subresources to https. Only meaningful once HTTPS exists. */
  upgradeInsecureRequests: boolean;
  /** Extra image hosts (object storage / CDN) allowed by `next/image`. */
  imageHosts?: string[];
}

/**
 * Build the `Content-Security-Policy` header value.
 *
 * `script-src` is the directive that actually stops XSS: `'nonce-…'` plus
 * `'strict-dynamic'` means only scripts Next itself emitted for this request
 * can run, and any script they load is trusted in turn. There is no
 * `'unsafe-inline'` here, so injected markup cannot execute.
 *
 * `style-src` does allow `'unsafe-inline'`, because React renders inline
 * `style` attributes (dynamic progress-bar widths) and inline style attributes
 * cannot carry a nonce. CSS cannot execute script, so the residual risk is
 * cosmetic rather than an execution primitive.
 */
export function buildCspHeader({
  nonce,
  isDev,
  upgradeInsecureRequests,
  imageHosts = [],
}: CspOptions): string {
  const imageSources = ['\'self\'', 'blob:', 'data:', ...imageHosts.map((host) => `https://${host}`)];

  const directives: string[] = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imageSources.join(' ')}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Matches X-Frame-Options: SAMEORIGIN; CSP wins where both are honoured.
    "frame-ancestors 'self'",
  ];

  if (upgradeInsecureRequests) directives.push('upgrade-insecure-requests');

  return `${directives.join('; ')};`;
}

/**
 * HSTS is only honoured by browsers when delivered over HTTPS, and sending it
 * over plain HTTP can poison a later HTTPS deployment. Callers must only set
 * the header when the request really is TLS.
 */
export function buildHstsHeader(includeSubdomains = true, maxAgeSeconds = 31536000): string {
  return `max-age=${maxAgeSeconds}${includeSubdomains ? '; includeSubDomains' : ''}`;
}
