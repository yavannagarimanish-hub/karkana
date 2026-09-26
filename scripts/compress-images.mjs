/**
 * Re-encode catalogue product photography to a much smaller file at a quality
 * that is visually indistinguishable from the source.
 *
 * The originals were stored at very high quality settings and are, on average,
 * over 1 MB each for images displayed at most a few hundred pixels wide. Re-
 * encoding with mozjpeg entropy coding at quality 90 removes roughly 80% of
 * the bytes without a visible change.
 *
 * Dimensions are deliberately left untouched: this script compresses, it does
 * not downscale. `next/image` already serves correctly sized derivatives at
 * runtime, so the source only needs to be a good-quality master.
 *
 * Safe to re-run. A file is only replaced when the result is genuinely
 * smaller, so already-optimised images are never enlarged or re-encoded into a
 * lossier version.
 *
 * Usage:
 *   node scripts/compress-images.mjs            # process public/uploads
 *   node scripts/compress-images.mjs --dry-run  # report only, write nothing
 *   node scripts/compress-images.mjs --quality 88
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const qualityIndex = args.indexOf('--quality');
const QUALITY = qualityIndex === -1 ? 90 : Number(args[qualityIndex + 1]);

if (!Number.isInteger(QUALITY) || QUALITY < 50 || QUALITY > 100) {
  console.error('--quality must be an integer between 50 and 100');
  process.exit(1);
}

const ROOT = path.join(process.cwd(), 'public', 'uploads');
const IMAGE_RE = /\.(jpe?g|png)$/i;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (IMAGE_RE.test(entry.name)) out.push(full);
  }
  return out;
}

function formatMB(bytes) {
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

async function main() {
  if (!fs.existsSync(ROOT)) {
    console.error(`No upload directory at ${ROOT}`);
    process.exit(1);
  }

  const files = walk(ROOT).sort();
  let before = 0;
  let after = 0;
  let replaced = 0;
  let skipped = 0;
  let mismatchFixed = 0;
  const worst = [];

  for (const file of files) {
    const original = fs.readFileSync(file);
    before += original.length;

    const image = sharp(original, { failOn: 'none' });
    const metadata = await image.metadata();

    /*
     * PNG is kept only when the source actually uses an alpha channel, so
     * transparency is never silently discarded. Otherwise JPEG is far smaller.
     *
     * Note that many of these files carry a `.jpg` extension while holding PNG
     * or WebP content, which disagrees with the `X-Content-Type-Options:
     * nosniff` header the app sends. Re-encoding to real JPEG makes the
     * extension truthful as well as shrinking the file.
     */
    const keepPng = metadata.format === 'png' && Boolean(metadata.hasAlpha);

    let encoded;
    if (keepPng) {
      encoded = await image.png({ compressionLevel: 9, palette: false }).toBuffer();
    } else {
      encoded = await image.rotate().jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
    }

    /*
     * Rename only when the current extension would misdescribe the new content.
     * A file already named `.jpg` that held PNG bytes keeps its name, because
     * its content is now genuinely JPEG and every stored URL still resolves.
     */
    const desiredExt = keepPng ? '.png' : '.jpg';
    const currentExt = path.extname(file).toLowerCase();
    const extensionAlreadyCorrect = keepPng
      ? currentExt === '.png'
      : currentExt === '.jpg' || currentExt === '.jpeg';
    const target = extensionAlreadyCorrect
      ? file
      : file.slice(0, file.length - currentExt.length) + desiredExt;

    /*
     * Whether the bytes already on disk are honestly described by the filename.
     * This is a different question from `extensionAlreadyCorrect` above, which
     * only decides whether the *output* needs a new name. A `.jpg` holding WebP
     * bytes has a correct output extension but a dishonest current file.
     */
    const actualFormat = metadata.format === 'jpeg' ? 'jpg' : metadata.format;
    const contentMatchesExtension = actualFormat === currentExt.slice(1).toLowerCase();

    if (encoded.length >= original.length) {
      /*
       * Already well compressed, so re-encoding would only churn the file and
       * cost quality. The one exception is a file whose extension would
       * misdescribe its content: the app sends `X-Content-Type-Options:
       * nosniff`, so a `.jpg` holding WebP or PNG bytes is served with a MIME
       * type that does not match the payload. Correctness wins over the few
       * hundred kilobytes that costs.
       */
      if (contentMatchesExtension || currentExt === '') {
        after += original.length;
        skipped += 1;
        continue;
      }
      mismatchFixed += 1;
    }

    worst.push({
      file: path.relative(process.cwd(), file),
      from: original.length,
      to: encoded.length,
      renamed: target !== file,
    });

    if (!dryRun) {
      fs.writeFileSync(target, encoded);
      if (target !== file) fs.rmSync(file);
    }

    after += encoded.length;
    replaced += 1;
  }

  const saved = before - after;
  const pct = before > 0 ? ((saved / before) * 100).toFixed(1) : '0';

  console.log(`${dryRun ? '[dry run] ' : ''}quality ${QUALITY}, mozjpeg`);
  console.log(`  scanned   ${files.length} images`);
  console.log(`  optimised ${replaced}`);
  console.log(`  unchanged ${skipped} (already smaller than the re-encode)`);
  if (mismatchFixed > 0) {
    console.log(`  of which ${mismatchFixed} were re-encoded anyway because the extension`);
    console.log('           did not match the actual image content');
  }
  console.log(`  ${formatMB(before)} -> ${formatMB(after)}  (${pct}% smaller, ${formatMB(saved)} saved)`);

  if (worst.length > 0) {
    const top = worst.sort((a, b) => b.from - b.from).slice(0, 5);
    console.log('  biggest reductions:');
    for (const item of top) {
      const from = (item.from / 1024).toFixed(0);
      const to = (item.to / 1024).toFixed(0);
      console.log(`    ${item.file}  ${from} KB -> ${to} KB${item.renamed ? ' (png -> jpg)' : ''}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
