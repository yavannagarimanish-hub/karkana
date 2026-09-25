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
      row[h.trim()] = values[idx] !== undefined ? values[idx].trim() : '';
    });
    rows.push(row);
  }
  return { headers, rows };
}

function parseCurrency(str) {
  if (!str) return null;
  const clean = str.replace(/[₹\s,]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

const csvPath = path.join(process.cwd(), 'data', 'karkana_138.csv');
const { rows } = parseCSV(fs.readFileSync(csvPath, 'utf8'));

const validation = {
  totalProducts: rows.length,
  duplicateIds: [],
  missingIds: [],
  missingNames: [],
  invalidPrices: [],
  incorrectDiscounts: [],
  missingImages: [],
  missingDescriptions: [],
  missingCategories: [],
  missingBrands: [],
  missingStockValues: [],
  otherSchemaViolations: [],
  errors: [],
  warnings: [],
  incompleteOptional: [],
  productsRequiringAttention: new Set(),
};

const seenIds = new Map();

rows.forEach((row, index) => {
  const rowNum = index + 2; // 1-based header is line 1
  const id = row['Product ID'];
  const name = row['Product Name'];
  const brand = row['Brand Name'];
  const category = row['Category'];
  const rawMrp = row['MRP'];
  const rawSellingPrice = row['Selling Price'];
  const rawDiscount = row['Discount %'];
  const mrp = parseCurrency(rawMrp);
  const sellingPrice = parseCurrency(rawSellingPrice);
  const image = row['Main Image'];
  const desc = row['Description'];
  const stock = row['Stock Quantity'];

  let productHasError = false;
  let productHasWarning = false;
  let productHasIncomplete = false;

  // 1. Missing ID
  if (!id) {
    validation.missingIds.push({ rowNum, name });
    validation.errors.push({ id: `ROW_${rowNum}`, field: 'Product ID', issue: 'Missing Product ID', severity: 'ERROR' });
    productHasError = true;
  } else {
    // 2. Duplicate ID
    if (seenIds.has(id)) {
      validation.duplicateIds.push({ id, firstRow: seenIds.get(id), duplicateRow: rowNum });
      validation.errors.push({ id, field: 'Product ID', issue: `Duplicate Product ID (also at row ${seenIds.get(id)})`, severity: 'ERROR' });
      productHasError = true;
    } else {
      seenIds.set(id, rowNum);
    }
  }

  const pId = id || `ROW_${rowNum}`;

  // 3. Missing Name
  if (!name) {
    validation.missingNames.push({ id: pId });
    validation.errors.push({ id: pId, field: 'Product Name', issue: 'Missing Product Name', severity: 'ERROR' });
    productHasError = true;
  } else {
    // Check leading/trailing spaces or typos in name
    if (name !== name.trim()) {
      validation.otherSchemaViolations.push({ id: pId, field: 'Product Name', issue: `Leading/trailing whitespace in name: "${name}"` });
      validation.warnings.push({ id: pId, field: 'Product Name', issue: `Leading/trailing whitespace in name: "${name}"`, severity: 'WARNING' });
      productHasWarning = true;
    }
  }

  // 4. Missing Brands
  if (!brand) {
    validation.missingBrands.push({ id: pId, name });
    validation.warnings.push({ id: pId, field: 'Brand Name', issue: 'Missing Brand Name', severity: 'WARNING' });
    productHasWarning = true;
  }

  // 5. Missing Categories
  if (!category) {
    validation.missingCategories.push({ id: pId, name });
    validation.errors.push({ id: pId, field: 'Category', issue: 'Missing Category', severity: 'ERROR' });
    productHasError = true;
  } else if (category === 'Others' || category === 'Other') {
    validation.otherSchemaViolations.push({ id: pId, field: 'Category', issue: `Generic category assigned: "${category}"` });
    validation.warnings.push({ id: pId, field: 'Category', issue: `Generic category: "${category}"`, severity: 'WARNING' });
    productHasWarning = true;
  }

  // 6. Invalid MRP / Selling Price
  if (mrp === null || mrp <= 0) {
    validation.invalidPrices.push({ id: pId, name, issue: `Invalid MRP: "${rawMrp}"` });
    validation.errors.push({ id: pId, field: 'MRP', issue: `Invalid MRP: "${rawMrp}"`, severity: 'ERROR' });
    productHasError = true;
  }
  if (sellingPrice === null || sellingPrice <= 0) {
    validation.invalidPrices.push({ id: pId, name, issue: `Invalid Selling Price: "${rawSellingPrice}"` });
    validation.errors.push({ id: pId, field: 'Selling Price', issue: `Invalid Selling Price: "${rawSellingPrice}"`, severity: 'ERROR' });
    productHasError = true;
  }
  if (mrp !== null && sellingPrice !== null && sellingPrice > mrp) {
    validation.invalidPrices.push({ id: pId, name, issue: `Selling price (₹${sellingPrice}) exceeds MRP (₹${mrp})` });
    validation.errors.push({ id: pId, field: 'Selling Price', issue: `Selling price exceeds MRP`, severity: 'ERROR' });
    productHasError = true;
  }

  // 7. Incorrect Discounts
  if (mrp !== null && sellingPrice !== null && mrp > 0) {
    const calculatedDiscount = Math.round(((mrp - sellingPrice) / mrp) * 100);
    const listedDiscount = parseInt(rawDiscount.replace('%', ''), 10);
    if (!isNaN(listedDiscount)) {
      if (Math.abs(calculatedDiscount - listedDiscount) > 1) {
        // Discrepancy > 1%
        validation.incorrectDiscounts.push({
          id: pId,
          name,
          mrp,
          sellingPrice,
          listedDiscount: `${listedDiscount}%`,
          calculatedDiscount: `${calculatedDiscount}%`,
          diff: calculatedDiscount - listedDiscount
        });
        validation.warnings.push({
          id: pId,
          field: 'Discount %',
          issue: `Discount mismatch: Listed ${listedDiscount}% vs calculated ${calculatedDiscount}% (MRP ₹${mrp}, SP ₹${sellingPrice})`,
          severity: 'WARNING'
        });
        productHasWarning = true;
      }
    } else if (rawDiscount) {
      validation.incorrectDiscounts.push({ id: pId, name, issue: `Unparseable discount string: "${rawDiscount}"` });
      validation.warnings.push({ id: pId, field: 'Discount %', issue: `Unparseable discount: "${rawDiscount}"`, severity: 'WARNING' });
      productHasWarning = true;
    }
  }

  // 8. Missing Images (filename given vs existing file on disk)
  if (!image) {
    validation.missingImages.push({ id: pId, name, issue: 'No image specified in catalogue' });
    validation.warnings.push({ id: pId, field: 'Main Image', issue: 'No image specified in catalogue', severity: 'WARNING' });
    productHasWarning = true;
  } else {
    // Check if image file exists in public/uploads/products/ or public/images/
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'uploads', 'products', image),
      path.join(process.cwd(), 'public', 'images', image),
      path.join(process.cwd(), 'public', image),
    ];
    const exists = possiblePaths.some(p => fs.existsSync(p));
    if (!exists) {
      validation.missingImages.push({ id: pId, name, image, issue: `Image file "${image}" not found on disk` });
      validation.warnings.push({ id: pId, field: 'Main Image', issue: `Image file "${image}" not present in assets`, severity: 'WARNING' });
      productHasWarning = true;
    }
  }

  // 9. Missing Stock Values
  if (!stock && stock !== 0) {
    validation.missingStockValues.push({ id: pId, name });
    validation.warnings.push({ id: pId, field: 'Stock Quantity', issue: 'Missing stock value (blank in catalogue)', severity: 'WARNING' });
    productHasWarning = true;
  }

  // 10. Missing Description & Optional Incomplete Fields
  if (!desc) {
    validation.missingDescriptions.push({ id: pId, name });
    validation.incompleteOptional.push({ id: pId, field: 'Description', issue: 'Description is empty', severity: 'INCOMPLETE' });
    productHasIncomplete = true;
  }
  if (!row['Short Description']) {
    validation.incompleteOptional.push({ id: pId, field: 'Short Description', issue: 'Short description is empty', severity: 'INCOMPLETE' });
    productHasIncomplete = true;
  }
  if (!row['Subcategory']) {
    validation.incompleteOptional.push({ id: pId, field: 'Subcategory', issue: 'Subcategory is unassigned', severity: 'INCOMPLETE' });
    productHasIncomplete = true;
  }
  if (!row['Safety Instructions']) {
    validation.incompleteOptional.push({ id: pId, field: 'Safety Instructions', issue: 'Safety instructions not provided', severity: 'INCOMPLETE' });
    productHasIncomplete = true;
  }
  if (!row['Unit']) {
    validation.incompleteOptional.push({ id: pId, field: 'Unit', issue: 'Unit specification is missing', severity: 'INCOMPLETE' });
    productHasIncomplete = true;
  }

  if (productHasError || productHasWarning || productHasIncomplete) {
    validation.productsRequiringAttention.add(pId);
  }
});

console.log('=== CATALOGUE VALIDATION SUMMARY ===');
console.log('Total Products:', validation.totalProducts);
console.log('Duplicate IDs:', validation.duplicateIds.length);
console.log('Missing IDs:', validation.missingIds.length);
console.log('Missing Names:', validation.missingNames.length);
console.log('Invalid Prices:', validation.invalidPrices.length);
console.log('Incorrect Discounts:', validation.incorrectDiscounts.length);
console.log('Missing Images (or not on disk):', validation.missingImages.length);
console.log('Missing Descriptions:', validation.missingDescriptions.length);
console.log('Missing Categories:', validation.missingCategories.length);
console.log('Missing Brands:', validation.missingBrands.length);
console.log('Missing Stock Values:', validation.missingStockValues.length);
console.log('Other Schema / Naming Violations:', validation.otherSchemaViolations.length);
console.log('-----------------------------------');
console.log('Total ERRORS count:', validation.errors.length);
console.log('Total WARNINGS count:', validation.warnings.length);
console.log('Total INCOMPLETE OPTIONAL count:', validation.incompleteOptional.length);
console.log('Total Products Requiring Attention:', validation.productsRequiringAttention.size);

// Save summary json
fs.writeFileSync('data/validation_report.json', JSON.stringify({
  ...validation,
  productsRequiringAttention: Array.from(validation.productsRequiringAttention)
}, null, 2));
