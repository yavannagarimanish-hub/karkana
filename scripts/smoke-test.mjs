#!/usr/bin/env node
/**
 * End-to-end smoke test against a running server.
 *
 *   npm run dev &  (or: npm run build && npm start)
 *   node scripts/smoke-test.mjs [baseUrl]
 *
 * It exercises real HTTP paths — the proxy, the route handlers, the guards,
 * the repository layer and the pricing service — not re-implementations of them.
 */

const BASE = (process.argv[2] ?? process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');

/** Name used for the throwaway product; also how leftovers are recognised. */
const SMOKE_PRODUCT_NAME = 'Smoke Test Cracker';

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function req(method, path, { body, cookie, redirect = 'manual' } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect,
  });

  const setCookie = response.headers.getSetCookie?.() ?? [];
  let json = null;
  const text = await response.text();
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON */
  }

  return { status: response.status, json, text, headers: response.headers, setCookie };
}

function cookieFrom(setCookie, name) {
  const entry = setCookie.find((value) => value.startsWith(`${name}=`));
  return entry ? entry.split(';')[0] : null;
}

async function main() {
  console.log(`\nKarkana smoke test → ${BASE}\n`);

  /* ── Storefront ─────────────────────────────────────────────────────── */
  console.log('Storefront');

  const home = await req('GET', '/');
  check('GET / returns 200', home.status === 200, `got ${home.status}`);
  check('home renders the wordmark', /Karkana/i.test(home.text));
  check('home shows a live product count', /\d+\s*(products|items)/i.test(home.text));

  const basic = await req('GET', '/module/basic');
  check('GET /module/basic returns 200', basic.status === 200, `got ${basic.status}`);

  const bogusModule = await req('GET', '/module/nonexistent');
  check('unknown module 404s', bogusModule.status === 404, `got ${bogusModule.status}`);

  /* ── Every internal module link the UI emits must actually resolve ─────
     Guards against hardcoded slugs drifting from MODULE_SLUGS in the domain. */
  console.log('\nInternal links');

  const linkSources = [
    ['/', home],
    ['/search', await req('GET', '/search')],
    ['/search?q=rocket', await req('GET', '/search?q=rocket')],
    ['/search?q=zzzz', await req('GET', '/search?q=zzzz')],
  ];

  const broken = [];
  const seen = new Set();
  for (const [label, page] of linkSources) {
    const hrefs = [...page.text.matchAll(/href="(\/module\/[a-z0-9-]+)"/g)].map((match) => match[1]);
    for (const href of new Set(hrefs)) {
      if (seen.has(href)) continue;
      seen.add(href);
      const resolved = await req('GET', href);
      if (resolved.status !== 200) broken.push(`${href} (linked from ${label}) → ${resolved.status}`);
    }
  }

  check('module links were found to check', seen.size >= 3, `found ${seen.size}`);
  check('every emitted /module link resolves', broken.length === 0, broken.join('; '));

  /* ── Proxy guards (optimistic redirects) ────────────────────────────── */
  console.log('\nProxy redirects');

  const adminRoot = await req('GET', '/admin');
  check(
    '/admin redirects anonymous visitors to login',
    adminRoot.status === 307 && (adminRoot.headers.get('location') ?? '').includes('/admin/login'),
    `${adminRoot.status} → ${adminRoot.headers.get('location')}`,
  );

  const accountRoot = await req('GET', '/account');
  check(
    '/account redirects anonymous visitors to login',
    accountRoot.status === 307 && (accountRoot.headers.get('location') ?? '').includes('/account/login'),
    `${accountRoot.status} → ${accountRoot.headers.get('location')}`,
  );

  const adminLogin = await req('GET', '/admin/login');
  check('GET /admin/login is reachable', adminLogin.status === 200, `got ${adminLogin.status}`);

  /* ── Products API ───────────────────────────────────────────────────── */
  console.log('\nProducts API');

  const list = await req('GET', '/api/v1/products?pageSize=5');
  check('GET /api/v1/products returns 200', list.status === 200, `got ${list.status}`);
  check('product list is paginated', list.json?.page?.items?.length <= 5);
  check('product list exposes paise-ready prices', typeof list.json?.page?.items?.[0]?.price === 'number');

  const allAsGuest = await req('GET', '/api/v1/products?all=true&pageSize=96');
  check('anonymous `all=true` still returns 200', allAsGuest.status === 200, `got ${allAsGuest.status}`);
  check(
    'anonymous `all=true` returns a real page (not a vacuous pass)',
    (allAsGuest.json?.page?.items ?? []).length > 0,
    `${(allAsGuest.json?.page?.items ?? []).length} items`,
  );
  const guestSeesHidden = (allAsGuest.json?.page?.items ?? []).some((product) => product.isVisible === false);
  check('anonymous `all=true` cannot reveal hidden products', guestSeesHidden === false);

  const oversize = await req('GET', '/api/v1/products?pageSize=1000');
  check('pageSize above the 96 cap is rejected with 422', oversize.status === 422, `got ${oversize.status}`);

  const badQuery = await req('GET', '/api/v1/products?module=NOPE');
  check('invalid enum query returns 422', badQuery.status === 422, `got ${badQuery.status}`);

  /* ── Admin authorization ────────────────────────────────────────────── */
  console.log('\nAuthorization');

  const createWithoutAuth = await req('POST', '/api/v1/products', {
    body: { name: 'HACK', price: 1, module: 'BASIC' },
  });
  check('POST /api/v1/products without a session is 401', createWithoutAuth.status === 401, `got ${createWithoutAuth.status}`);

  const validationWithoutAuth = await req('GET', '/api/v1/validation');
  check('GET /api/v1/validation without a session is 401', validationWithoutAuth.status === 401, `got ${validationWithoutAuth.status}`);

  /* ── Cart pricing ───────────────────────────────────────────────────── */
  console.log('\nPricing');

  const sample = list.json?.page?.items?.[0];
  if (!sample) {
    check('a product exists to price', false, 'catalogue is empty');
  } else {
    const quote = await req('POST', '/api/v1/cart', {
      body: { lines: [{ productId: sample.id, quantity: 2 }] },
    });
    check('cart quote returns 200', quote.status === 200, `got ${quote.status}`);
    check(
      'subtotal equals unit price × quantity',
      quote.json?.totals?.subtotalPaise === Math.round(sample.price * 100) * 2,
      `${quote.json?.totals?.subtotalPaise} vs ${Math.round(sample.price * 100) * 2}`,
    );

    const badLine = await req('POST', '/api/v1/cart', {
      body: { lines: [{ productId: 'KRK999999', quantity: 1 }] },
    });
    check('unknown product is reported as unavailable', badLine.json?.unavailable?.length === 1);
  }

  /* ── Order placement (the v1 price-tampering hole) ──────────────────── */
  console.log('\nCheckout');

  if (sample) {
    const order = await req('POST', '/api/v1/orders', {
      body: {
        customerName: 'Smoke Test',
        mobile: '+91 98765 43210',
        address: {
          houseFlat: '12-3-456',
          streetLocality: 'Test Street',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500001',
        },
        // Deliberately attempts to smuggle a client-side total.
        items: [{ productId: sample.id, quantity: 2 }],
        totalAmount: 1,
        paymentMethod: 'COD',
      },
    });

    check('order placement returns 201', order.status === 201, `got ${order.status}: ${order.text.slice(0, 160)}`);
    check('order id has the KRK- shape', /^KRK-[A-Z0-9]{6}$/.test(order.json?.order?.id ?? ''), order.json?.order?.id);
    check(
      'server recomputes the total and ignores `totalAmount`',
      order.json?.order?.totalPaise === Math.round(sample.price * 100) * 2,
      `${order.json?.order?.totalPaise} vs ${Math.round(sample.price * 100) * 2}`,
    );
    check('mobile number is normalised to 10 digits', order.json?.order?.mobile === '9876543210', order.json?.order?.mobile);

    const fetched = await req('GET', `/api/v1/orders/${order.json?.order?.id}`);
    check('guest can read the order they just placed', fetched.status === 200, `got ${fetched.status}`);
    check('timeline is returned with the order', Array.isArray(fetched.json?.timeline) && fetched.json.timeline.length === 5);

    const statusWithoutAuth = await req('PATCH', `/api/v1/orders/${order.json?.order?.id}`, {
      body: { status: 'DELIVERED' },
    });
    check('status change without an admin session is 401', statusWithoutAuth.status === 401, `got ${statusWithoutAuth.status}`);

    const invalidOrder = await req('POST', '/api/v1/orders', {
      body: {
        customerName: '',
        mobile: '123',
        address: { houseFlat: '', streetLocality: '', city: '', state: '', pincode: '000' },
        items: [],
      },
    });
    check('invalid order payload returns 422 with field issues', invalidOrder.status === 422 && Array.isArray(invalidOrder.json?.issues));
  }

  /* ── Customer accounts ──────────────────────────────────────────────── */
  console.log('\nAccounts');

  const email = `smoke+${Date.now()}@karkana.test`;
  const register = await req('POST', '/api/v1/auth/register', {
    body: { name: 'Smoke Tester', email, phone: '9876543210', password: 'Sup3rSecret' },
  });
  check('registration returns 200', register.status === 200, `got ${register.status}: ${register.text.slice(0, 160)}`);

  const sessionCookie = cookieFrom(register.setCookie, 'karkana_session');
  check('registration sets an httpOnly session cookie', Boolean(sessionCookie) && /HttpOnly/i.test(register.setCookie.join(';')));

  const dup = await req('POST', '/api/v1/auth/register', {
    body: { name: 'Smoke Tester', email, phone: '9876543210', password: 'Sup3rSecret' },
  });
  check('duplicate email returns 409', dup.status === 409, `got ${dup.status}`);

  const wrongPassword = await req('POST', '/api/v1/auth/login', { body: { email, password: 'wrong' } });
  check('wrong password returns 401', wrongPassword.status === 401, `got ${wrongPassword.status}`);

  if (sessionCookie && sample) {
    const wishlist = await req('POST', '/api/v1/wishlist', {
      body: { productId: sample.id },
      cookie: sessionCookie,
    });
    check('wishlist toggle works when signed in', wishlist.status === 200 && wishlist.json?.wishlisted === true);

    const address = await req('POST', '/api/v1/addresses', {
      body: {
        label: 'Home',
        houseFlat: '12-3-456',
        streetLocality: 'Test Street',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500001',
      },
      cookie: sessionCookie,
    });
    check(
      'address creation returns 201 with an id',
      address.status === 201 && Boolean(address.json?.address?.id),
      `got ${address.status}: ${address.text.slice(0, 120)}`,
    );

    const addressList = await req('GET', '/api/v1/addresses', { cookie: sessionCookie });
    check(
      'saved address is listed for the customer',
      addressList.status === 200 && (addressList.json?.addresses ?? []).length >= 1,
      `got ${addressList.status}`,
    );
    check(
      'the first address becomes the default',
      (addressList.json?.addresses ?? []).some((entry) => entry.isDefault === true),
    );

    const accountPage = await req('GET', '/account', { cookie: sessionCookie });
    check('signed-in customer can load /account', accountPage.status === 200, `got ${accountPage.status}`);

    const sessionInfo = await req('GET', '/api/v1/auth/session', { cookie: sessionCookie });
    check('session endpoint reports the customer', sessionInfo.json?.customer?.email === email);
  }

  const wishlistAnonymous = await req('POST', '/api/v1/wishlist', { body: { productId: 'KRK001' } });
  check('wishlist requires a session', wishlistAnonymous.status === 401, `got ${wishlistAnonymous.status}`);

  /* ── Admin login ────────────────────────────────────────────────────── */
  console.log('\nAdmin');

  const adminBad = await req('POST', '/api/v1/auth/admin/login', {
    body: { username: 'admin', password: 'definitely-wrong' },
  });
  check(
    'admin login with wrong credentials is rejected',
    adminBad.status === 401 || adminBad.status === 503,
    `got ${adminBad.status}`,
  );

  // The success path only runs when the harness was given real credentials.
  const adminUser = process.env.SMOKE_ADMIN_USERNAME;
  const adminPass = process.env.SMOKE_ADMIN_PASSWORD;

  if (!adminUser || !adminPass) {
    console.log('  – skipped admin success flow (set SMOKE_ADMIN_USERNAME / SMOKE_ADMIN_PASSWORD)');
  } else {
    const adminLogin = await req('POST', '/api/v1/auth/admin/login', {
      body: { username: adminUser, password: adminPass },
    });
    const adminCookie = cookieFrom(adminLogin.setCookie, 'karkana_admin');

    check('admin login returns 200 with a cookie', adminLogin.status === 200 && Boolean(adminCookie), `got ${adminLogin.status}`);

    if (adminCookie) {
      /* Purge residue from any previously interrupted run, so the catalogue
         count assertions below are meaningful and this script is idempotent. */
      const leftovers = await req(
        'GET',
        `/api/v1/products?all=true&pageSize=96&search=${encodeURIComponent(SMOKE_PRODUCT_NAME)}`,
        { cookie: adminCookie },
      );
      const stale = (leftovers.json?.page?.items ?? []).filter(
        (product) => product.name === SMOKE_PRODUCT_NAME,
      );
      for (const leftover of stale) {
        await req('DELETE', `/api/v1/products/${leftover.id}`, { cookie: adminCookie });
      }
      if (stale.length > 0) {
        console.log(`  · purged ${stale.length} leftover smoke product(s)`);
      }

      const dashboard = await req('GET', '/api/v1/metrics', { cookie: adminCookie });
      check('metrics endpoint serves the admin dashboard', dashboard.status === 200, `got ${dashboard.status}`);

      const validation = await req('GET', '/api/v1/validation', { cookie: adminCookie });
      check(
        'validation report covers every product',
        validation.status === 200 && validation.json?.report?.totalProducts === 138,
        `got ${validation.status}, totalProducts=${validation.json?.report?.totalProducts}`,
      );

      const hidden = await req('GET', '/api/v1/products?all=true&pageSize=96', { cookie: adminCookie });
      check('admin `all=true` is accepted', hidden.status === 200, `got ${hidden.status}`);
      check(
        'admin listing reports the full catalogue count',
        hidden.json?.page?.totalItems === 138,
        `totalItems=${hidden.json?.page?.totalItems}`,
      );

      const created = await req('POST', '/api/v1/products', {
        cookie: adminCookie,
        body: {
          id: `KRK${900 + (Date.now() % 90)}`,
          name: SMOKE_PRODUCT_NAME,
          brand: 'KARKANA',
          category: 'Sparklers',
          price: 149,
          originalPrice: 199,
          module: 'BASIC',
          isVisible: false,
        },
      });
      const createdId = created.json?.product?.id;
      check('admin can create a product', created.status === 201 && Boolean(createdId), `got ${created.status}: ${created.text.slice(0, 140)}`);

      if (createdId) {
        const duplicate = await req('POST', '/api/v1/products', {
          cookie: adminCookie,
          body: { id: createdId, name: 'Dup', price: 1, module: 'BASIC' },
        });
        check('duplicate product id is rejected with 409', duplicate.status === 409, `got ${duplicate.status}`);

        const updated = await req('PATCH', `/api/v1/products/${createdId}`, {
          cookie: adminCookie,
          body: { price: 179 },
        });
        check('admin can update a product', updated.status === 200 && updated.json?.product?.price === 179, `got ${updated.status}`);

        const removed = await req('DELETE', `/api/v1/products/${createdId}`, { cookie: adminCookie });
        check('admin can delete a product', removed.status === 200, `got ${removed.status}`);
      }
    }

    /* ── Order state machine, driven as an operator ───────────────────── */
    console.log('\nOrder lifecycle');

    if (sample && adminUser && adminPass) {
      const adminSession = await req('POST', '/api/v1/auth/admin/login', {
        body: { username: adminUser, password: adminPass },
      });
      const operator = cookieFrom(adminSession.setCookie, 'karkana_admin');

      const placed = await req('POST', '/api/v1/orders', {
        body: {
          customerName: 'Lifecycle Test',
          mobile: '9876543210',
          address: {
            houseFlat: '12-3-456',
            streetLocality: 'Test Street',
            city: 'Hyderabad',
            state: 'Telangana',
            pincode: '500001',
          },
          items: [{ productId: sample.id, quantity: 1 }],
          paymentMethod: 'COD',
        },
      });
      const orderId = placed.json?.order?.id;

      if (operator && orderId) {
        const illegal = await req('PATCH', `/api/v1/orders/${orderId}`, {
          cookie: operator,
          body: { status: 'DELIVERED' },
        });
        check('NEW → DELIVERED is refused as an illegal transition', illegal.status === 409, `got ${illegal.status}`);

        const steps = ['CONFIRMED', 'PREPARING', 'DISPATCHED', 'DELIVERED'];
        let cursor = orderId;
        let allLegal = true;
        for (const status of steps) {
          const moved = await req('PATCH', `/api/v1/orders/${cursor}`, { cookie: operator, body: { status } });
          if (moved.status !== 200 || moved.json?.order?.status !== status) allLegal = false;
        }
        check('the happy path walks NEW → DELIVERED', allLegal);

        const terminal = await req('PATCH', `/api/v1/orders/${orderId}`, {
          cookie: operator,
          body: { status: 'CANCELLED' },
        });
        check('DELIVERED is terminal', terminal.status === 409, `got ${terminal.status}`);

        const codPaid = await req('GET', `/api/v1/orders/${orderId}`, { cookie: operator });
        check(
          'a delivered COD order is marked PAID',
          codPaid.json?.order?.paymentStatus === 'PAID',
          `got ${codPaid.json?.order?.paymentStatus}`,
        );
      }
    }
  }

  /* ── Summary ────────────────────────────────────────────────────────── */
  console.log(`\n${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log('Failures:');
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\nSmoke test crashed:', error);
  process.exit(1);
});
