/**
 * Same crop, size and tone for every product image (from docs/IMAGE-PROMPTS.md, section 4).
 * Put raw photos in images-raw/ named by product id (e.g. hawar-local.png, hawar-local-boneless.png),
 * then run: node scripts/process-images.mjs
 * Writes public/images/products/{id}.webp (1600px) and {id}-640.webp, and updates src/data/product-images.json
 * so the site starts showing them (the old neutral placeholder is used for any product without a photo).
 */
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const IN = 'images-raw';
const OUT = 'public/images/products';
const MANIFEST = 'src/data/product-images.json';
await fs.mkdir(OUT, { recursive: true });

for (const file of await fs.readdir(IN)) {
  if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
  const id = path.parse(file).name;
  const base = sharp(path.join(IN, file))
    .rotate()
    .resize(1600, 1600, { fit: 'cover', position: 'attention' })
    .normalise({ lower: 1, upper: 99 })
    .modulate({ saturation: 1.04 })
    .sharpen({ sigma: 0.6 });
  await base.clone().webp({ quality: 82 }).toFile(path.join(OUT, `${id}.webp`));
  await base.clone().resize(640, 640).webp({ quality: 80 }).toFile(path.join(OUT, `${id}-640.webp`));
  console.log('done', id);
}

// Record which images exist (keep any "illustrative" marks you added by hand).
const ids = (await fs.readdir(OUT)).filter((f) => f.endsWith('.webp') && !f.endsWith('-640.webp')).map((f) => f.replace(/\.webp$/, '')).sort();
const current = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
await fs.writeFile(MANIFEST, JSON.stringify({ ...current, images: ids }, null, 2) + '\n');
console.log(`manifest: ${ids.length} image(s)`);
