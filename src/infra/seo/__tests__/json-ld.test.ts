import { describe, expect, it } from 'vitest';
import { toSafeJsonLd } from '../json-ld';

describe('toSafeJsonLd', () => {
  // Regression: JSON.stringify leaves `<`, `>` and `&` alone, so a product
  // name containing `</script>` closed the surrounding script element.
  const PAYLOADS = [
    '</script><script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    'Karkana & Co <b>bold</b>',
    '</SCRIPT >',
    '\u2028\u2029',
  ];

  it.each(PAYLOADS)('cannot break out of the script element: %s', (payload) => {
    const html = toSafeJsonLd({ name: payload });

    expect(html).not.toContain('<');
    expect(html).not.toContain('>');
    expect(html).not.toContain('&');
    expect(html).not.toContain('\u2028');
    expect(html).not.toContain('\u2029');
  });

  it('still produces JSON that parses back to the original value', () => {
    const payload = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: '</script><script>alert(1)</script> & <b>more</b>\u2028\u2029',
      offers: { price: 129900, priceCurrency: 'INR' },
    };

    expect(JSON.parse(toSafeJsonLd(payload))).toEqual(payload);
  });

  it('leaves ordinary data untouched apart from the escaped characters', () => {
    expect(toSafeJsonLd({ sku: 'KRK001', price: 129900 })).toBe('{"sku":"KRK001","price":129900}');
  });

  it('renders a hostile product name inertly inside a script element', () => {
    const html = `<script type="application/ld+json">${toSafeJsonLd({
      name: '</script><script>alert(document.cookie)</script>',
    })}</script>`;

    // Exactly one closing script tag: the one we wrote ourselves.
    expect(html.match(/<\/script>/gi)).toHaveLength(1);
  });
});
