import fs from 'fs';
import path from 'path';

const dir1 = 'C:\\Users\\yavan\\Downloads\\KARKANA PRODUCT IMG';
const dir2 = 'C:\\Users\\yavan\\Downloads';
const targetDir = path.join(process.cwd(), 'public', 'uploads', 'products');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 1. Gather all source files
const files1 = fs.existsSync(dir1) ? fs.readdirSync(dir1).map(f => ({ name: f, fullPath: path.join(dir1, f), folder: 'KARKANA PRODUCT IMG' })) : [];
const files2 = fs.existsSync(dir2) ? fs.readdirSync(dir2).filter(f => f.startsWith('KRK')).map(f => ({ name: f, fullPath: path.join(dir2, f), folder: 'Downloads' })) : [];

const allImageFiles = [...files1, ...files2];

console.log(`Total image files detected across sources: ${allImageFiles.length}`);

// Map product ID to source file (prefer files from KARKANA PRODUCT IMG, fallback to Downloads)
const idToImageMap = new Map();
const matchedFilesSet = new Set();

// First check KARKANA PRODUCT IMG
files1.forEach(file => {
  const match = file.name.match(/^(KRK\d+)/i);
  if (match) {
    const id = match[1].toUpperCase();
    if (!idToImageMap.has(id)) {
      idToImageMap.set(id, file);
      matchedFilesSet.add(file.fullPath);
    }
  }
});

// Then check Downloads for any remaining (e.g. KRK018)
files2.forEach(file => {
  const match = file.name.match(/^(KRK\d+)/i);
  if (match) {
    const id = match[1].toUpperCase();
    if (!idToImageMap.has(id)) {
      idToImageMap.set(id, file);
      matchedFilesSet.add(file.fullPath);
    }
  }
});

// Check unmatched files
const unmatchedFiles = [];
allImageFiles.forEach(f => {
  const match = f.name.match(/^(KRK\d+)/i);
  if (!match) {
    unmatchedFiles.push(f.name);
  }
});

// 2. Parse CSV
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx] !== undefined ? values[idx] : '';
    });
    rows.push(row);
  }
  return { headers, rows };
}

function parseCurrency(str) {
  if (!str) return 0;
  const clean = str.replace(/[₹\s,]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

const csvPath = path.join(process.cwd(), 'data', 'karkana_138.csv');
const { rows } = parseCSV(fs.readFileSync(csvPath, 'utf8'));

console.log(`CSV rows detected: ${rows.length}`);

// 3. Process products and copy images
const duplicateIds = [];
const seenIds = new Set();
let basicCount = 0;
let customizedCount = 0;
const missingImages = [];
const matchedImages = [];
const now = new Date().toISOString();

const importedProducts = [];

rows.forEach((r, idx) => {
  const id = r['Product ID'];
  if (seenIds.has(id)) {
    duplicateIds.push(id);
  } else {
    seenIds.add(id);
  }

  // Module rule: KRK001-KRK118 -> BASIC, KRK119-KRK138 -> CUSTOMIZED
  const numPart = parseInt(id.replace(/\D/g, ''), 10);
  let moduleName = 'BASIC';
  if (numPart >= 119 && numPart <= 138) {
    moduleName = 'CUSTOMIZED';
    customizedCount++;
  } else {
    basicCount++;
  }

  // Find image asset
  const matchedFile = idToImageMap.get(id);
  let imagePath = '';

  if (matchedFile) {
    const ext = path.extname(matchedFile.name) || '.jpg';
    // Use clean standard filename: KRKxxx_main.jpg (matching CSV)
    const targetFilename = `${id}_main.jpg`;
    const targetFilePath = path.join(targetDir, targetFilename);

    // Copy file without altering the original
    fs.copyFileSync(matchedFile.fullPath, targetFilePath);
    imagePath = `/uploads/products/${targetFilename}`;
    matchedImages.push({ id, source: matchedFile.name, target: targetFilename });
  } else {
    missingImages.push(id);
  }

  const p = {
    id: id,
    name: r['Product Name'],
    brand: r['Brand Name'],
    category: r['Category'],
    subcategory: r['Subcategory'] || '',
    description: r['Description'] || '',
    short_description: r['Short Description'] || '',
    price: parseCurrency(r['Selling Price']),
    original_price: parseCurrency(r['MRP']),
    raw_mrp: r['MRP'],
    raw_selling_price: r['Selling Price'],
    discount_percent: r['Discount %'],
    stock_quantity: r['Stock Quantity'] ? parseInt(r['Stock Quantity'], 10) : null,
    unit: r['Unit'] || '',
    images: imagePath ? [imagePath] : [],
    image_2: r['Image 2'] || '',
    image_3: r['Image 3'] || '',
    video: r['Video'] || '',
    module: moduleName,
    display_position: idx + 1,
    is_featured: r['Featured']?.toLowerCase() === 'yes',
    is_popular: r['Best Seller']?.toLowerCase() === 'yes',
    is_visible: r['Active']?.toLowerCase() !== 'no',
    in_stock: true, // Mark in_stock true so products can be ordered/viewed
    search_keywords: r['Search Keywords'] || '',
    safety_instructions: r['Safety Instructions'] || '',
    notes: r['Notes'] || '',
    created_at: now,
    updated_at: now,
  };

  importedProducts.push(p);
});

// Personalized examples: KRK133-KRK138
const personalizedExamples = importedProducts
  .filter(p => {
    const num = parseInt(p.id.replace(/\D/g, ''), 10);
    return num >= 133 && num <= 138;
  })
  .map(p => ({
    id: p.id,
    name: p.name,
    image: p.images[0] || '',
    category: p.category,
    price: 499,
  }));

// 4. Update database
const dbPath = path.join(process.cwd(), 'data', 'karkana.db.json');
let db = { products: [], sections: [], orders: [], personalizedConfig: {} };
if (fs.existsSync(dbPath)) {
  try {
    db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (e) {}
}

db.products = importedProducts;
db.personalizedConfig = {
  price: 499,
  title: 'BESPOKE COMMEMORATIVE BOX',
  subtitle: 'YOUR PHOTOGRAPH IMPRINTED ON BESPOKE PACKAGING',
  description: 'Upload your high-resolution photograph to create a one-of-a-kind custom commemorative cracker box. Fulfilled exclusively via Cash on Delivery at your doorstep.',
  examples: personalizedExamples,
};

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');

const report = {
  csvRowsDetected: rows.length,
  productsImported: importedProducts.length,
  productsSkipped: 0,
  duplicateProductIds: duplicateIds,
  imageFilesDetected: allImageFiles.length,
  imagesSuccessfullyMatched: matchedImages.length,
  missingProductImages: missingImages,
  unmatchedImageFiles: unmatchedFiles,
  basicProductCount: basicCount,
  customizedProductCount: customizedCount,
  personalizedExampleCount: personalizedExamples.length,
  errors: [],
};

fs.writeFileSync(path.join(process.cwd(), 'data', 'import_report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log('--- IMPORT COMPLETED SUCCESSFULLY ---');
console.log(JSON.stringify(report, null, 2));
