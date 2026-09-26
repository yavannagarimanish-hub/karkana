import { getAppServices } from '@/infra/db';
import { SITE } from '@/infra/config';
import { MODULE_SLUGS } from '@/core/domain/product';

export const dynamic = 'force-dynamic';

/**
 * llms.txt: a plain-text map of the site for LLM-based agents and assistants.
 * Generated from the live catalogue so counts never go stale.
 */
export async function GET(): Promise<Response> {
  const services = await getAppServices();
  const counts = await services.catalogue.counts();
  const url = SITE.url;

  const modules = await Promise.all(
    Object.values(MODULE_SLUGS).map(async (slug) => {
      const view = await services.catalogue.modulePage(slug);
      return { slug, count: view?.counts.total ?? 0 };
    }),
  );

  const body = `# ${SITE.name}

> ${SITE.name} is an independent ${SITE.city}-based retailer of crackers and pyrotechnic
> products. ${counts.total} products are sold across three collections, dispatched direct
> from the workshop, and paid for cash on delivery. Online card and UPI payment are not
> accepted.

## Site facts

- Products in catalogue: ${counts.total}
- Product ID range: ${counts.idRange ? `${counts.idRange.first} to ${counts.idRange.last}` : 'n/a'}
- Collections: ${modules.map((m) => `${m.slug} (${m.count})`).join(', ')}
- Payment: cash on delivery only
- Ships from: ${SITE.city}, India
- Support phone: ${SITE.supportPhone}
- Support email: ${SITE.supportEmail}
- Currency: Indian Rupees (INR), inclusive of taxes

## Important restrictions

- Purchasers must be 18 or older. Products are explosives and require adult supervision.
- Personalized products require the customer to upload a photograph before the item can be
  added to a cart. The image is printed on the box.
- Personalized items cannot be returned unless faulty, because they are made to order.

## Core pages

- Catalogue home: ${url}/
- Basic crackers: ${url}/module/${MODULE_SLUGS.BASIC}
- Customized: ${url}/module/${MODULE_SLUGS.CUSTOMIZED}
- Personalized: ${url}/module/${MODULE_SLUGS.PERSONALIZED}
- Search: ${url}/search?q=<term>
- Single product: ${url}/product/<ID> (for example ${url}/product/KRK001)
- Cart: ${url}/cart
- Checkout: ${url}/checkout
- Account sign in: ${url}/account/login
- Account register: ${url}/account/register

## Legal

- Privacy policy: ${url}/privacy-policy
- Terms and conditions: ${url}/terms

## API

The storefront is backed by a JSON API under ${url}/api/v1. Responses use a single
envelope: successful calls return {"success": true, ...data}, failures return
{"success": false, "error": "...", "code": "...", "issues": [...]}.

- GET  ${url}/api/v1/products      list products (supports ?module, ?search, ?sort, ?page)
- GET  ${url}/api/v1/products/<ID> one product
- POST ${url}/api/v1/cart          price a cart server-side
- POST ${url}/api/v1/orders        place an order (requires name, mobile, address, items)

Note: prices are always computed on the server. A client-supplied total is ignored.

## Machine-readable

- robots.txt: ${url}/robots.txt
- sitemap.xml: ${url}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
