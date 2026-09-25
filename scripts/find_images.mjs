import fs from 'fs';
import path from 'path';

const dir1 = 'C:\\Users\\yavan\\Downloads\\KARKANA PRODUCT IMG';
const dir2 = 'C:\\Users\\yavan\\Downloads';

const files1 = fs.existsSync(dir1) ? fs.readdirSync(dir1) : [];
const files2 = fs.existsSync(dir2) ? fs.readdirSync(dir2).filter(f => f.startsWith('KRK')) : [];

console.log('Total files in KARKANA PRODUCT IMG:', files1.length);
console.log('Total KRK files in Downloads:', files2.length);

const allSources = [];
files1.forEach(f => allSources.push({ name: f, fullPath: path.join(dir1, f), folder: 'KARKANA PRODUCT IMG' }));
files2.forEach(f => allSources.push({ name: f, fullPath: path.join(dir2, f), folder: 'Downloads' }));

// For KRK001 to KRK138, check what matches
const matched = {};
const unmatched = [];

allSources.forEach(file => {
  const match = file.name.match(/^(KRK\d+)/i);
  if (match) {
    const id = match[1].toUpperCase();
    if (!matched[id]) {
      matched[id] = [];
    }
    // Avoid exact duplicate path
    if (!matched[id].some(item => item.fullPath === file.fullPath)) {
      matched[id].push(file);
    }
  } else {
    unmatched.push(file);
  }
});

const missing = [];
for (let i = 1; i <= 138; i++) {
  const id = `KRK${String(i).padStart(3, '0')}`;
  if (!matched[id]) {
    missing.push(id);
  }
}

console.log('Unique Product IDs matched:', Object.keys(matched).length);
console.log('Missing Product IDs (out of 138):', missing.length, missing);
console.log('Unmatched files:', unmatched.length, unmatched);

// Print details of matched
for (let i = 1; i <= 138; i++) {
  const id = `KRK${String(i).padStart(3, '0')}`;
  if (matched[id]) {
    // console.log(id, '->', matched[id].map(m => m.name).join(', '));
  }
}
