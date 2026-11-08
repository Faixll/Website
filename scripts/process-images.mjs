/**
 * Product photos → public/images/products/{name}.webp (3:4 portrait, 900×1200, the shape of the client's photos).
 * Put raw photos in images-raw/ named by product id (e.g. hawar-local.jpg). Extra photos for the product page
 * gallery are named {id}-{anything}.jpg (e.g. burger-beef-open.jpg); a photo for one option is {id}-{optionId}.jpg.
 * Then run: node scripts/process-images.mjs
 * The photos are already colour-graded by the designer, so they are only resized/cropped (no re-grading).
 * Updates src/data/product-images.json so the site starts showing them; products without a photo keep the
 * branded placeholder.
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
  const name = path.parse(file).name;
  await sharp(path.join(IN, file))
    .rotate()
    .resize(900, 1200, { fit: 'cover', position: 'centre', withoutEnlargement: false })
    .sharpen({ sigma: 0.5 })
    .webp({ quality: 84 })
    .toFile(path.join(OUT, `${name}.webp`));
  console.log('done', name);
}

const ids = (await fs.readdir(OUT)).filter((f) => f.endsWith('.webp')).map((f) => f.replace(/\.webp$/, '')).sort();
const current = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
await fs.writeFile(MANIFEST, JSON.stringify({ ...current, images: ids }, null, 2) + '\n');
console.log(`manifest: ${ids.length} image(s)`);
