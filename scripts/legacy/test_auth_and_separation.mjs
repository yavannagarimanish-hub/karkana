import http from 'http';
const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log('KARKANA: AUTHENTICATION & SEPARATION VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Customer Storefront
    const homeRes = await fetch(`${BASE_URL}/`, { redirect: 'manual' });
    assert(homeRes.status === 200, 'Customer storefront opens with HTTP 200');

    const homeHtml = await homeRes.text();
    assert(!homeHtml.includes('href="/admin"'), 'No href="/admin" found on customer homepage');
    assert(!homeHtml.includes('CONTROL CENTRE'), 'No CONTROL CENTRE found in customer footer');

    // 2. Unauthenticated Admin Page Access
    const adminRes = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
    assert(adminRes.status === 307, 'Unauthenticated /admin redirects with HTTP 307');
    const redirectLocation = adminRes.headers.get('location') || '';
    assert(redirectLocation.endsWith('/admin/login'), `Redirect target is /admin/login (actual: ${redirectLocation})`);

    const subAdminPages = ['/admin/products', '/admin/orders', '/admin/ordering', '/admin/sections', '/admin/validation'];
    for (const page of subAdminPages) {
      const res = await fetch(`${BASE_URL}${page}`, { redirect: 'manual' });
      assert(res.status === 307 && (res.headers.get('location') || '').endsWith('/admin/login'),
        `Unauthenticated ${page} blocked and redirected to /admin/login`);
    }

    // 3. Unauthenticated Admin API Access
    const valApiRes = await fetch(`${BASE_URL}/api/validation`);
    assert(valApiRes.status === 401, 'Unauthenticated GET /api/validation blocked with HTTP 401');

    const reorderApiRes = await fetch(`${BASE_URL}/api/products/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: [] })
    });
    assert(reorderApiRes.status === 401, 'Unauthenticated POST /api/products/reorder blocked with HTTP 401');

    const ordersApiRes = await fetch(`${BASE_URL}/api/orders`);
    assert(ordersApiRes.status === 401, 'Unauthenticated GET /api/orders blocked with HTTP 401');

    const productCreateRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unauthorized test' })
    });
    assert(productCreateRes.status === 401, 'Unauthenticated POST /api/products blocked with HTTP 401');

    // 4. Public Customer Product API
    const publicProductsRes = await fetch(`${BASE_URL}/api/products`);
    assert(publicProductsRes.status === 200, 'Customer GET /api/products is publicly accessible (HTTP 200)');

    // 5. Admin Login Flow
    const wrongLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword' })
    });
    assert(wrongLoginRes.status === 401, 'Wrong password rejected with HTTP 401');

    const correctLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Karkana@Admin2026!' })
    });
    assert(correctLoginRes.status === 200, 'Correct credentials accepted with HTTP 200');

    const setCookie = correctLoginRes.headers.get('set-cookie') || '';
    assert(setCookie.includes('karkana_admin_session='), 'karkana_admin_session cookie issued');

    // Extract cookie value
    const match = setCookie.match(/karkana_admin_session=([^;]+)/);
    const sessionCookie = match ? match[1] : '';

    const authHeaders = {
      'Cookie': `karkana_admin_session=${sessionCookie}`
    };

    // 6. Authenticated Access to Admin Pages & APIs
    const authAdminRes = await fetch(`${BASE_URL}/admin`, { headers: authHeaders, redirect: 'manual' });
    assert(authAdminRes.status === 200, 'Authenticated GET /admin loads existing dashboard (HTTP 200)');

    const authProductsRes = await fetch(`${BASE_URL}/admin/products`, { headers: authHeaders, redirect: 'manual' });
    assert(authProductsRes.status === 200, 'Authenticated GET /admin/products loads inventory (HTTP 200)');

    const authValRes = await fetch(`${BASE_URL}/api/validation`, { headers: authHeaders });
    assert(authValRes.status === 200, 'Authenticated GET /api/validation succeeds with HTTP 200');

    const authOrdersRes = await fetch(`${BASE_URL}/api/orders`, { headers: authHeaders });
    assert(authOrdersRes.status === 200, 'Authenticated GET /api/orders succeeds with HTTP 200');

    // 7. Subdomain routing check
    const subdomainRes = await new Promise((resolve) => {
      const r = http.request(`${BASE_URL}/`, {
        headers: { 'Host': 'admin.karkana.com' }
      }, (res) => {
        resolve({ status: res.statusCode, location: res.headers.location || '' });
      });
      r.end();
    });
    assert(subdomainRes.status === 307 && subdomainRes.location.endsWith('/admin/login'),
      'admin.karkana.com root request routes to admin and enforces login');

    // 8. Logout
    const logoutRes = await fetch(`${BASE_URL}/api/admin/logout`, {
      method: 'POST',
      headers: authHeaders
    });
    assert(logoutRes.status === 200, 'POST /api/admin/logout succeeds with HTTP 200');

    const logoutCookie = logoutRes.headers.get('set-cookie') || '';
    assert(logoutCookie.includes('Max-Age=0') || logoutCookie.includes('expires='), 'Logout expires session cookie');

    const postLogoutRes = await fetch(`${BASE_URL}/admin`, {
      headers: { 'Cookie': 'karkana_admin_session=' },
      redirect: 'manual'
    });
    assert(postLogoutRes.status === 307 && (postLogoutRes.headers.get('location') || '').endsWith('/admin/login'),
      'Access to /admin after logout is blocked and redirects to /admin/login');

  } catch (err) {
    console.error('Test execution failed with error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
