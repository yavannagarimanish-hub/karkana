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

const csvPath = path.join(process.cwd(), 'data', 'karkana_138.csv');
const content = fs.readFileSync(csvPath, 'utf8');
const { headers, rows } = parseCSV(content);

console.log('Headers:', headers);
console.log('Total rows:', rows.length);
console.log('First row:', rows[0]);
console.log('Row 18 (quotes in name):', rows[17]);
console.log('Row 119 (TFI):', rows[118]);
console.log('Row 138 (Political):', rows[137]);
