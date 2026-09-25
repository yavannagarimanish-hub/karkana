import fs from 'fs';
import path from 'path';

function getDimensions(filePath) {
  const buf = fs.readFileSync(filePath);

  // PNG: bytes 16-24
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    return { width: w, height: h, format: 'png' };
  }

  // WebP: RIFF ... WEBP
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunkType = buf.toString('ascii', 12, 16);
    if (chunkType === 'VP8 ') {
      // Lossy WebP: start code 0x9D 0x01 0x2A at byte 23
      const w = buf.readUInt16LE(26) & 0x3fff;
      const h = buf.readUInt16LE(28) & 0x3fff;
      return { width: w, height: h, format: 'webp' };
    } else if (chunkType === 'VP8L') {
      // Lossless WebP: 1-byte signature (0x2F), then 14 bits width-1, 14 bits height-1
      const b1 = buf[21];
      const b2 = buf[22];
      const b3 = buf[23];
      const b4 = buf[24];
      const w = 1 + (((b2 & 0x3f) << 8) | b1);
      const h = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
      return { width: w, height: h, format: 'webp' };
    } else if (chunkType === 'VP8X') {
      // Extended WebP: 24-bit width-1 at byte 24, 24-bit height-1 at byte 27
      const w = 1 + buf.readUIntLE(24, 3);
      const h = 1 + buf.readUIntLE(27, 3);
      return { width: w, height: h, format: 'webp' };
    }
  }

  // JPEG: scan for any SOF marker (0xC0 through 0xCF, except 0xC4 DHT and 0xC8 JPG and 0xCC DAC)
  let offset = 2;
  while (offset < buf.length - 8) {
    if (buf[offset] === 0xFF) {
      const marker = buf[offset + 1];
      // Check SOF markers
      const isSOF = (marker >= 0xC0 && marker <= 0xC3) ||
                    (marker >= 0xC5 && marker <= 0xC7) ||
                    (marker >= 0xC9 && marker <= 0xCB) ||
                    (marker >= 0xCD && marker <= 0xCF);
      if (isSOF) {
        const h = buf.readUInt16BE(offset + 5);
        const w = buf.readUInt16BE(offset + 7);
        if (w > 0 && h > 0) {
          return { width: w, height: h, format: 'jpg' };
        }
      }
      // If standalone marker without length (SOI, EOI, RST0-7)
      if (marker === 0xD8 || marker === 0xD9 || (marker >= 0xD0 && marker <= 0xD7)) {
        offset += 2;
      } else {
        const len = buf.readUInt16BE(offset + 2);
        offset += 2 + len;
      }
    } else {
      offset++;
    }
  }

  return null;
}

const dbPath = path.join(process.cwd(), 'data', 'karkana.db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

let detected = 0;
let missed = 0;

db.products.forEach(p => {
  if (p.images && p.images.length > 0) {
    const imgFilename = path.basename(p.images[0]);
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'products', imgFilename);
    if (fs.existsSync(filePath)) {
      const dim = getDimensions(filePath);
      if (dim) {
        p.image_width = dim.width;
        p.image_height = dim.height;
        p.aspect_ratio = parseFloat((dim.width / dim.height).toFixed(3));
        p.orientation = p.aspect_ratio > 1.15 ? 'WIDE' : p.aspect_ratio < 0.85 ? 'TALL' : 'SQUARE';
        detected++;
      } else {
        console.warn(`Could not extract dimensions for ${imgFilename}`);
        missed++;
      }
    }
  }
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');

console.log(`Processed ${db.products.length} products. Successfully enriched ${detected} products with exact intrinsic dimensions. Missed: ${missed}`);

const orientations = { WIDE: 0, TALL: 0, SQUARE: 0 };
db.products.forEach(p => {
  if (p.orientation) orientations[p.orientation]++;
});
console.log('Catalogue Orientations Breakdown:', orientations);
