import fs from 'fs';
import path from 'path';

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
      // Keep exact raw value without auto-trimming product names or other fields
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
const dbPath = path.join(process.cwd(), 'data', 'karkana.db.json');

const csvContent = fs.readFileSync(csvPath, 'utf8');
const { rows } = parseCSV(csvContent);

let db = { products: [], sections: [], orders: [] };
if (fs.existsSync(dbPath)) {
  try {
    db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (e) {
    console.error('Failed reading existing db, using template:', e);
  }
}

const now = new Date().toISOString();

const importedProducts = rows.map((r, idx) => {
  const brand = r['Brand Name'] || '';
  const isCustomized = brand.toUpperCase() === 'TFI' || brand.toUpperCase() === 'POLITICAL';
  
  return {
    id: r['Product ID'],
    name: r['Product Name'], // Raw name unmodified
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
    images: r['Main Image'] ? [r['Main Image']] : [],
    module: isCustomized ? 'CUSTOMIZED' : 'BASIC',
    display_position: idx + 1,
    is_featured: r['Featured'] === 'Yes',
    is_popular: r['Best Seller'] === 'Yes',
    is_visible: true,
    in_stock: false, // Stock quantity is blank in raw CSV
    safety_instructions: r['Safety Instructions'] || '',
    notes: r['Notes'] || '',
    search_keywords: r['Search Keywords'] || '',
    created_at: now,
    updated_at: now,
  };
});

db.products = importedProducts;

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`Successfully imported ${importedProducts.length} raw products into ${dbPath}`);
