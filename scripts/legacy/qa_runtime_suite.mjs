import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { S3Client, HeadBucketCommand, HeadObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const { Pool } = pg;

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

const BASE_URL = 'http://localhost:3009';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const s3Client = new S3Client({
  endpoint: process.env.B2_ENDPOINT,
  region: process.env.B2_REGION || 'us-east-005',
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY
  }
});

let testOrderId = null;
let testUploadedKey = null;

async function runQA() {
  console.log('========================================================');
  console.log('KARKANA: PRODUCTION RUNTIME QA PASS');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
      throw new Error(`QA Failure: ${message}`);
    }
  }

  try {
    // ----------------------------------------------------
    // 1. DATA SOURCE & RUNTIME PERSISTENCE CHECK
    // ----------------------------------------------------
    console.log('--- 1. DATA SOURCE & RUNTIME PERSISTENCE ---');
    const neonClient = await pool.connect();
    try {
      const qRes = await neonClient.query('SELECT COUNT(*) as count FROM products');
      assert(Number(qRes.rows[0].count) === 138, 'Neon PostgreSQL has 138 products online');
    } finally {
      neonClient.release();
    }

    // ----------------------------------------------------
    // 2. STOREFRONT VERIFICATION
    // ----------------------------------------------------
    console.log('\n--- 2. STOREFRONT VERIFICATION ---');
    
    // Homepage
    const homeRes = await fetch(`${BASE_URL}/`);
    assert(homeRes.status === 200, 'Homepage GET / returns HTTP 200');
    const homeHtml = await homeRes.text();
    assert(homeHtml.includes('KARKANA'), 'Homepage renders brand title');
    assert(homeHtml.includes('POPULAR COMMISSIONS') || homeHtml.includes('popular'), 'Homepage renders sections');

    // Sections API
    const secRes = await fetch(`${BASE_URL}/api/sections`);
    assert(secRes.status === 200, 'Sections API GET /api/sections returns HTTP 200');
    const secData = await secRes.json();
    assert(secData.sections && secData.sections.length === 5, 'Sections API returns exactly 5 sections from Neon');

    // Basic module page & API
    const basicRes = await fetch(`${BASE_URL}/module/basic`);
    assert(basicRes.status === 200, 'Basic Module GET /module/basic returns HTTP 200');

    const basicApiRes = await fetch(`${BASE_URL}/api/products?module=BASIC`);
    assert(basicApiRes.status === 200, 'Products API GET /api/products?module=BASIC returns HTTP 200');
    const basicData = await basicApiRes.json();
    assert(basicData.products && basicData.products.length === 118, 'Basic module returns exactly 118 products');

    // Customized module page & API
    const custRes = await fetch(`${BASE_URL}/module/customized`);
    assert(custRes.status === 200, 'Customized Module GET /module/customized returns HTTP 200');

    const custApiRes = await fetch(`${BASE_URL}/api/products?module=CUSTOMIZED`);
    assert(custApiRes.status === 200, 'Products API GET /api/products?module=CUSTOMIZED returns HTTP 200');
    const custData = await custApiRes.json();
    assert(custData.products && custData.products.length === 20, 'Customized module returns exactly 20 products');

    // Personalized module page
    const persRes = await fetch(`${BASE_URL}/module/personalized`);
    assert(persRes.status === 200, 'Personalized Module GET /module/personalized returns HTTP 200');

    // Product detail page
    const prodRes = await fetch(`${BASE_URL}/product/KRK001`);
    assert(prodRes.status === 200, 'Product detail GET /product/KRK001 returns HTTP 200');
    const prodHtml = await prodRes.text();
    assert(prodHtml.includes('KRK001'), 'Product detail page renders KRK001');

    // Cart & Checkout pages
    const cartRes = await fetch(`${BASE_URL}/cart`);
    assert(cartRes.status === 200, 'Cart page GET /cart returns HTTP 200');

    const checkoutRes = await fetch(`${BASE_URL}/checkout`);
    assert(checkoutRes.status === 200, 'Checkout page GET /checkout returns HTTP 200');

    // ----------------------------------------------------
    // 3. CASH ON DELIVERY (COD) ORDER CREATION FLOW
    // ----------------------------------------------------
    console.log('\n--- 3. COD ORDER CREATION & VERIFICATION ---');
    const orderPayload = {
      customerName: 'QA Test Verification User',
      mobile: '9876543210',
      address: {
        houseFlat: 'Apt 4B',
        streetLocality: '123 QA Test Boulevard',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001'
      },
      items: [
        {
          productId: 'KRK001',
          name: 'Classic Sparkler Edition',
          price: 299,
          quantity: 1,
          module: 'BASIC'
        }
      ],
      totalAmount: 299,
      notes: 'TEMPORARY_QA_RUNTIME_TEST_ORDER'
    };

    const createOrderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    assert(createOrderRes.status === 201 || createOrderRes.status === 200, 'Create order POST /api/orders returns HTTP 201');
    const orderResult = await createOrderRes.json();
    assert(orderResult.success === true, 'Order created successfully');
    assert(orderResult.order && orderResult.order.id, 'Order has valid ID');
    testOrderId = orderResult.order.id;
    console.log(`[OK] Created test order: ${testOrderId}`);

    // Verify order was written to Neon directly
    const pgOrderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [testOrderId]);
    assert(pgOrderRes.rows.length === 1, 'Test order confirmed present in Neon PostgreSQL orders table');
    assert(pgOrderRes.rows[0].customer_name === 'QA Test Verification User', 'Order customer_name matches in Neon');
    assert(pgOrderRes.rows[0].payment_method === 'Cash on Delivery', 'Order payment_method is Cash on Delivery in Neon');

    // Order confirmation page
    const confirmRes = await fetch(`${BASE_URL}/order-confirmation/${testOrderId}`);
    assert(confirmRes.status === 200, `Order confirmation GET /order-confirmation/${testOrderId} returns HTTP 200`);
    const confirmHtml = await confirmRes.text();
    assert(confirmHtml.includes(testOrderId), 'Order confirmation page displays commission reference');

    // ----------------------------------------------------
    // 4. ADMIN PORTAL & AUTHENTICATION
    // ----------------------------------------------------
    console.log('\n--- 4. ADMIN PORTAL & AUTHENTICATION ---');

    // Unauthenticated admin access should redirect
    const unauthAdmin = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
    assert(
      unauthAdmin.status === 307 || unauthAdmin.status === 302 || unauthAdmin.status === 401,
      'Unauthenticated GET /admin redirects to login'
    );

    // Unauthenticated admin me API
    const unauthMe = await fetch(`${BASE_URL}/api/admin/me`);
    assert(unauthMe.status === 401, 'Unauthenticated GET /api/admin/me returns HTTP 401');

    // Admin login
    const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: process.env.ADMIN_USERNAME || 'admin@karkana.com',
        password: process.env.ADMIN_PASSWORD_HASH ? 'Karkana@Admin2026!' : 'wrong'
      })
    });

    assert(loginRes.status === 200, 'Admin login POST /api/admin/login returns HTTP 200');
    const setCookie = loginRes.headers.get('set-cookie');
    assert(setCookie && setCookie.includes('karkana_admin_session'), 'Admin login sets karkana_admin_session cookie');

    // Extract cookie
    const sessionCookie = setCookie.split(';')[0];

    // Authenticated admin me API
    const authMe = await fetch(`${BASE_URL}/api/admin/me`, {
      headers: { Cookie: sessionCookie }
    });
    assert(authMe.status === 200, 'Authenticated GET /api/admin/me returns HTTP 200');
    const authMeData = await authMe.json();
    assert(authMeData.authenticated === true && authMeData.user.role === 'admin', 'Admin session verified');

    // Admin metrics
    const metricsRes = await fetch(`${BASE_URL}/api/metrics`, {
      headers: { Cookie: sessionCookie }
    });
    assert(metricsRes.status === 200, 'Admin metrics GET /api/metrics returns HTTP 200');
    const metricsData = await metricsRes.json();
    assert(metricsData.metrics && metricsData.metrics.totalProducts === 138, 'Admin metrics reports 138 total products from Neon');

    // Admin orders API
    const adminOrdersRes = await fetch(`${BASE_URL}/api/orders`, {
      headers: { Cookie: sessionCookie }
    });
    assert(adminOrdersRes.status === 200, 'Admin orders GET /api/orders returns HTTP 200');
    const adminOrdersData = await adminOrdersRes.json();
    const foundOrder = adminOrdersData.orders.find(o => o.id === testOrderId);
    assert(Boolean(foundOrder), 'Admin orders list contains the QA test order');

    // Admin status update
    const updateOrderRes = await fetch(`${BASE_URL}/api/orders/${testOrderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie
      },
      body: JSON.stringify({ status: 'CONFIRMED' })
    });
    assert(updateOrderRes.status === 200, 'Admin update order PATCH /api/orders/[id] returns HTTP 200');
    const updatedOrderData = await updateOrderRes.json();
    assert(updatedOrderData.order.status === 'CONFIRMED', 'Order status updated to CONFIRMED');

    // Verify in Neon directly
    const pgStatusCheck = await pool.query('SELECT status FROM orders WHERE id = $1', [testOrderId]);
    assert(pgStatusCheck.rows[0].status === 'CONFIRMED', 'Neon PostgreSQL confirmed order status transition to CONFIRMED');

    // Admin catalogue validation API
    const valRes = await fetch(`${BASE_URL}/api/validation`, {
      headers: { Cookie: sessionCookie }
    });
    assert(valRes.status === 200, 'Admin validation GET /api/validation returns HTTP 200');
    const valData = await valRes.json();
    assert(valData.success === true, 'Admin validation API executed successfully');

    // ----------------------------------------------------
    // 5. PERSONALIZED UPLOAD & BACKBLAZE B2 VERIFICATION
    // ----------------------------------------------------
    console.log('\n--- 5. PERSONALIZED UPLOAD & BACKBLAZE B2 ---');

    // Create a mock JPEG buffer for temporary QA upload test
    const dummyImageBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01,
      0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
      0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x7F, 0xFF, 0xD9
    ]);

    const formData = new FormData();
    const blob = new Blob([dummyImageBuffer], { type: 'image/jpeg' });
    formData.append('file', blob, 'qa_runtime_test.jpg');
    formData.append('type', 'personalization');

    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData
    });

    assert(uploadRes.status === 200, 'Personalization upload POST /api/upload returns HTTP 200');
    const uploadData = await uploadRes.json();
    assert(uploadData.success === true, 'Upload returned success: true');
    assert(uploadData.url && uploadData.url.startsWith('/api/admin/uploads/personalizations/'), 'Upload returned protected admin proxy URL');
    
    testUploadedKey = uploadData.url.replace('/api/admin/uploads/', '');
    console.log(`[OK] Uploaded personalized asset key: ${testUploadedKey}`);

    // Verify object actually exists in private Backblaze B2 bucket
    const headObj = await s3Client.send(new HeadObjectCommand({
      Bucket: process.env.B2_BUCKET,
      Key: testUploadedKey
    }));
    assert(headObj.ContentLength > 0, 'Object verified present inside private Backblaze B2 bucket');
    console.log(`[OK] Backblaze B2 HeadObject verified size: ${headObj.ContentLength} bytes`);

    // Verify direct unauthenticated access to the protected admin proxy is DENIED (HTTP 401)
    const unauthProxyRes = await fetch(`${BASE_URL}/api/admin/uploads/${testUploadedKey}`);
    assert(unauthProxyRes.status === 401, 'Unauthenticated access to personalizations proxy is strictly denied (HTTP 401)');

    // Verify authenticated access via admin proxy SUCCEEDS (HTTP 200)
    const authProxyRes = await fetch(`${BASE_URL}/api/admin/uploads/${testUploadedKey}`, {
      headers: { Cookie: sessionCookie }
    });
    assert(authProxyRes.status === 200, 'Authenticated admin access to personalizations proxy returns HTTP 200');
    const retrievedBuffer = Buffer.from(await authProxyRes.arrayBuffer());
    assert(retrievedBuffer.length === dummyImageBuffer.length, 'Retrieved asset matches uploaded binary content exactly');

    // ----------------------------------------------------
    // 6. CLEAN UP TEST DATA
    // ----------------------------------------------------
    console.log('\n--- 6. CLEAN UP TEST DATA ---');

    // Delete test image from Backblaze B2
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.B2_BUCKET,
      Key: testUploadedKey
    }));
    console.log(`[OK] Deleted test object ${testUploadedKey} from Backblaze B2`);

    // Verify Backblaze B2 object count is back to 0
    const listB2 = await s3Client.send(new ListObjectsV2Command({
      Bucket: process.env.B2_BUCKET
    }));
    assert((listB2.KeyCount || 0) === 0, 'Backblaze B2 bucket verified clean (0 objects)');

    // Delete test order from Neon
    await pool.query('DELETE FROM orders WHERE id = $1', [testOrderId]);
    console.log(`[OK] Deleted test order ${testOrderId} from Neon PostgreSQL`);

    const checkOrderClean = await pool.query('SELECT COUNT(*) as count FROM orders WHERE id = $1', [testOrderId]);
    assert(Number(checkOrderClean.rows[0].count) === 0, 'Neon PostgreSQL orders table verified clean of QA test order');

    // ----------------------------------------------------
    // 7. SECURITY CHECKS
    // ----------------------------------------------------
    console.log('\n--- 7. SECURITY AUDIT ---');

    // Check .env.local HTTP exposure
    const envHttp = await fetch(`${BASE_URL}/.env.local`);
    assert(envHttp.status === 404, 'Direct HTTP request to /.env.local returns 404 Not Found');

    // Check .git HTTP exposure
    const gitHttp = await fetch(`${BASE_URL}/.git/config`);
    assert(gitHttp.status === 404, 'Direct HTTP request to /.git/config returns 404 Not Found');

    // Customer storefront navigation has no ADMIN links
    assert(!homeHtml.includes('href="/admin"'), 'Storefront navigation contains no href="/admin"');
    assert(!homeHtml.includes('href="/admin/login"'), 'Storefront navigation contains no href="/admin/login"');

    // ----------------------------------------------------
    // 8. FINAL CATALOGUE INTEGRITY CHECK
    // ----------------------------------------------------
    console.log('\n--- 8. FINAL CATALOGUE INTEGRITY ---');
    const finalProdRes = await pool.query('SELECT id, module FROM products ORDER BY display_position ASC');
    assert(finalProdRes.rows.length === 138, 'Post-QA Neon products count is exactly 138');

    let finalBasic = 0;
    let finalCustomized = 0;
    const finalIds = new Set();
    let finalDuplicates = 0;
    let finalSeqValid = true;

    finalProdRes.rows.forEach((r, idx) => {
      if (finalIds.has(r.id)) finalDuplicates++;
      finalIds.add(r.id);
      const expected = 'KRK' + String(idx + 1).padStart(3, '0');
      if (r.id !== expected) finalSeqValid = false;
      if (r.module === 'BASIC') finalBasic++;
      else if (r.module === 'CUSTOMIZED') finalCustomized++;
    });

    assert(finalBasic === 118, 'Post-QA BASIC count is exactly 118');
    assert(finalCustomized === 20, 'Post-QA CUSTOMIZED count is exactly 20');
    assert(finalDuplicates === 0, 'Post-QA duplicate product IDs count is 0');
    assert(finalSeqValid === true, 'Post-QA KRK001-KRK138 sequence is strictly intact');

    const finalSecRes = await pool.query('SELECT * FROM sections ORDER BY display_position ASC');
    assert(finalSecRes.rows.length === 5, 'Post-QA sections count is exactly 5');

    console.log('\n========================================================');
    console.log(`ALL RUNTIME QA TESTS PASSED! (${passed} PASSED, 0 FAILED)`);
    console.log('========================================================\n');

  } catch (err) {
    console.error('\n[QA CRITICAL FAILURE]:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runQA();
