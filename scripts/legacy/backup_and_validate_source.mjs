import fs from 'fs';

const sourceFile = 'data/karkana.db.json';
const backupFile = `data/karkana.db.backup.${Date.now()}.json`;

fs.copyFileSync(sourceFile, backupFile);
console.log('Created backup file:', backupFile);

const db = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
console.log('Validating source dataset:');
console.log('Products count:', db.products.length);
if (db.products.length !== 138) {
  throw new Error('Expected 138 products, got ' + db.products.length);
}

const ids = new Set();
let basic = 0;
let customized = 0;
for (let i = 0; i < db.products.length; i++) {
  const p = db.products[i];
  if (ids.has(p.id)) {
    throw new Error('Duplicate ID: ' + p.id);
  }
  ids.add(p.id);
  const expectedId = 'KRK' + String(i + 1).padStart(3, '0');
  if (p.id !== expectedId) {
    throw new Error(`Expected ID ${expectedId} at index ${i}, got ${p.id}`);
  }
  if (p.module === 'BASIC') basic++;
  else if (p.module === 'CUSTOMIZED') customized++;
  else throw new Error(`Unexpected module ${p.module} on ${p.id}`);
  if (!p.images || !p.images.length || !p.images[0]) {
    throw new Error(`Missing image on ${p.id}`);
  }
}

console.log('ID range KRK001 - KRK138 verified strictly.');
console.log('BASIC count:', basic, '(expected 118)');
console.log('CUSTOMIZED count:', customized, '(expected 20)');
if (basic !== 118 || customized !== 20) {
  throw new Error('Module counts mismatch!');
}

console.log('Sections count:', db.sections.length, '(expected 5)');
if (db.sections.length !== 5) {
  throw new Error('Sections count mismatch!');
}

console.log('ALL PRE-MIGRATION SOURCE VALIDATIONS PASSED.');
