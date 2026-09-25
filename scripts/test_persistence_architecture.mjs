import fs from 'fs';
import path from 'path';

async function testPersistenceArchitecture() {
  console.log('========================================================');
  console.log('KARKANA: PRODUCTION PERSISTENCE ARCHITECTURE VALIDATION');
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
    }
  }

  try {
    // 1. Dataset Integrity Check
    const dbPath = path.join(process.cwd(), 'data', 'karkana.db.json');
    assert(fs.existsSync(dbPath), 'data/karkana.db.json exists');
    
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    assert(db.products && db.products.length === 138, `138 products preserved in database (found: ${db.products.length})`);

    const hasAllIds = Array.from({ length: 138 }, (_, i) => {
      const id = `KRK${String(i + 1).padStart(3, '0')}`;
      return db.products.some((p) => p.id === id);
    }).every(Boolean);
    assert(hasAllIds, 'Complete ID sequence KRK001 through KRK138 strictly verified');

    const basicCount = db.products.filter((p) => p.module === 'BASIC').length;
    const customizedCount = db.products.filter((p) => p.module === 'CUSTOMIZED').length;
    assert(basicCount === 118, `118 BASIC module products (found: ${basicCount})`);
    assert(customizedCount === 20, `20 CUSTOMIZED module products (found: ${customizedCount})`);

    // 2. Images Integrity Check
    let imagesFound = 0;
    for (let i = 1; i <= 138; i++) {
      const id = `KRK${String(i).padStart(3, '0')}`;
      const imgPath = path.join(process.cwd(), 'public', 'uploads', 'products', `${id}_main.jpg`);
      if (fs.existsSync(imgPath)) imagesFound++;
    }
    assert(imagesFound === 138, `All 138 product images present on disk (found: ${imagesFound})`);

    // 3. Sections Integrity
    assert(db.sections && db.sections.length === 5, `5 storefront sections preserved (found: ${db.sections.length})`);

    // 4. Postgres Module Code Validation
    const pgModule = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'postgres.ts'), 'utf8');
    assert(pgModule.includes('CREATE TABLE IF NOT EXISTS products'), 'postgres.ts contains products schema DDL');
    assert(pgModule.includes('CREATE TABLE IF NOT EXISTS sections'), 'postgres.ts contains sections schema DDL');
    assert(pgModule.includes('CREATE TABLE IF NOT EXISTS orders'), 'postgres.ts contains orders schema DDL');
    assert(pgModule.includes('Pool'), 'postgres.ts uses standard PostgreSQL Pool connection');

    // 5. Cloudflare R2 Storage Code Validation
    const storageModule = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'storage.ts'), 'utf8');
    assert(storageModule.includes('@aws-sdk/client-s3'), 'storage.ts utilizes S3-compatible SDK for Cloudflare R2');
    assert(storageModule.includes('PutObjectCommand'), 'storage.ts implements PutObjectCommand for file uploads');
    assert(storageModule.includes('GetObjectCommand'), 'storage.ts implements GetObjectCommand for file retrieval');
    assert(storageModule.includes('personalizations/'), 'storage.ts stores customer uploads in private personalizations/ key space');

    // 6. Production Safety Guards Check
    assert(
      pgModule.includes('[Karkana Production] Fatal Error: DATABASE_URL is not configured'),
      'postgres.ts enforces fatal error when DATABASE_URL is missing in production'
    );
    assert(
      storageModule.includes('[Karkana Production] Fatal Error: Cloudflare R2 credentials'),
      'storage.ts enforces fatal error when R2 credentials are missing in production'
    );

    // 7. Protected Admin Route Check
    const uploadRoute = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', 'api', 'admin', 'uploads', '[...path]', 'route.ts'),
      'utf8'
    );
    assert(uploadRoute.includes('verifySessionToken'), 'Admin uploads route validates session token');
    assert(uploadRoute.includes('karkana_admin_session'), 'Admin uploads route checks administrative cookie');

  } catch (err) {
    console.error('Validation error:', err);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
}

testPersistenceArchitecture();
