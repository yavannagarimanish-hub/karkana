import { describe, expect, it } from 'vitest';
import { buildCspHeader, buildHstsHeader } from '../security-headers';

const base = { nonce: 'abc123', isDev: false, upgradeInsecureRequests: false };

describe('buildCspHeader', () => {
  it('never allows inline scripts, which is what stops XSS', () => {
    const csp = buildCspHeader(base);
    const scriptSrc = csp.split('; ').find((d) => d.startsWith('script-src'))!;

    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).toContain("'nonce-abc123'");
    expect(scriptSrc).toContain("'strict-dynamic'");
  });

  it('only adds unsafe-eval in development', () => {
    expect(buildCspHeader({ ...base, isDev: true })).toContain("'unsafe-eval'");
    expect(buildCspHeader(base)).not.toContain("'unsafe-eval'");
  });

  it('blocks plugins, base-tag hijacking and form exfiltration', () => {
    const csp = buildCspHeader(base);

    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
  });

  it('defaults every unspecified fetch to same-origin', () => {
    expect(buildCspHeader(base)).toContain("default-src 'self'");
  });

  it('permits blob and data images for next/image but nothing remote by default', () => {
    const csp = buildCspHeader(base);
    const imgSrc = csp.split('; ').find((d) => d.startsWith('img-src'))!;

    expect(imgSrc).toContain("'self'");
    expect(imgSrc).toContain('blob:');
    expect(imgSrc).toContain('data:');
    expect(imgSrc).not.toContain('https:');
  });

  it('adds configured object-storage hosts as https only', () => {
    const csp = buildCspHeader({ ...base, imageHosts: ['cdn.karkana.com'] });
    const imgSrc = csp.split('; ').find((d) => d.startsWith('img-src'))!;

    expect(imgSrc).toContain('https://cdn.karkana.com');
    expect(imgSrc).not.toContain('http://');
  });

  it('only upgrades insecure requests when told to', () => {
    expect(buildCspHeader(base)).not.toContain('upgrade-insecure-requests');
    expect(buildCspHeader({ ...base, upgradeInsecureRequests: true })).toContain(
      'upgrade-insecure-requests',
    );
  });

  it('produces a single-line header with no stray whitespace', () => {
    const csp = buildCspHeader(base);

    expect(csp).not.toContain('\n');
    expect(csp).not.toMatch(/  /);
    expect(csp.endsWith(';')).toBe(true);
  });

  it('interpolates the nonce exactly once', () => {
    const csp = buildCspHeader({ ...base, nonce: 'UNIQUENONCE' });

    expect(csp.match(/UNIQUENONCE/g)).toHaveLength(1);
  });
});

describe('buildHstsHeader', () => {
  it('defaults to one year with subdomains', () => {
    expect(buildHstsHeader()).toBe('max-age=31536000; includeSubDomains');
  });

  it('can omit includeSubDomains', () => {
    expect(buildHstsHeader(false)).toBe('max-age=31536000');
  });
});
