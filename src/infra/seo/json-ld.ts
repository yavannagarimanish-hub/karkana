/**
 * Serialize a value for inline JSON-LD (a `<script type="application/ld+json">`
 * element rendered through `dangerouslySetInnerHTML`).
 *
 * `JSON.stringify` alone is not sufficient: it leaves `<`, `>` and `&` intact,
 * so a value containing `</script>` closes the surrounding script element and
 * everything after it executes as markup. Escaping those characters to `\uXXXX`
 * keeps the JSON byte-identical when parsed while making breakout impossible.
 *
 * U+2028 / U+2029 are included because they are legal in JSON strings but were
 * treated as line terminators by JavaScript, which breaks inline evaluation.
 */
export function toSafeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export interface OrganizationStructuredDataOptions {
  name?: string;
  url?: string;
  logoUrl?: string;
  description?: string;
  telephone?: string;
  email?: string;
  city?: string;
}

/**
 * Builds Schema.org Organization structured data conforming to Google Search
 * Logo and Organization rich result specifications.
 */
export function buildOrganizationJsonLd(options?: OrganizationStructuredDataOptions) {
  const name = options?.name ?? 'Karkana';
  const url = options?.url ?? 'https://karkana.setacore.com';
  const logoUrl = options?.logoUrl ?? `${url.replace(/\/$/, '')}/icon.jpg`;
  const description =
    options?.description ??
    'Shop crackers online with Karkana. Explore basic, customized and personalized crackers with cash on delivery across India.';
  const telephone = options?.telephone ?? '+91-7207294554';
  const email = options?.email ?? 'info@setacore.com';
  const city = options?.city ?? 'Hyderabad';

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    alternateName: 'Karkana Crackers',
    url,
    logo: logoUrl,
    image: logoUrl,
    description,
    email,
    telephone,
    address: {
      '@type': 'PostalAddress',
      addressLocality: city,
      addressRegion: 'Telangana',
      addressCountry: 'IN',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone,
        contactType: 'customer service',
        areaServed: 'IN',
        availableLanguage: ['English', 'Telugu', 'Hindi'],
      },
    ],
  };
}

