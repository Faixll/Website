/**
 * Builds the cleaver logo set (red rounded square + beige cleaver, red Arabic name) from the existing
 * lettering in public/brand, and the icons that come from it:
 *   public/brand/*.svg, src/app/icon.svg, src/app/apple-icon.png, public/icons/icon-{192,512}.png,
 *   public/icons/maskable-512.png, src/app/favicon.ico, src/app/[lang]/opengraph-image.png (+ twitter-image.png)
 * Run: node scripts/brand-cleaver.mjs  (idempotent: it rebuilds from the original lettering kept in git)
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import sharp from 'sharp';

const RED = '#A51D26';
const BEIGE = '#F4ECDF';

/** The mark in a 200×200 box: rounded square + cleaver tilted 40°, blade top-right, handle bottom-left. */
function markInner() {
  return `
  <rect x="4" y="4" width="192" height="192" rx="46" fill="${RED}"/>
  <g transform="translate(100 100) rotate(-40)" fill="${BEIGE}">
    <!-- blade: straight spine, slightly curved cutting edge, rounded front corner -->
    <path d="M-34 -36 H40 Q50 -36 50 -26 V22 Q50 34 38 34 H-26 Q-34 34 -34 26 Z"/>
    <!-- hanging hole -->
    <circle cx="34" cy="-20" r="7" fill="${RED}"/>
    <!-- bolster + handle -->
    <rect x="-46" y="-14" width="14" height="22" rx="3"/>
    <rect x="-96" y="-11" width="54" height="16" rx="8"/>
    <circle cx="-82" cy="-3" r="2.6" fill="${RED}"/>
    <circle cx="-64" cy="-3" r="2.6" fill="${RED}"/>
  </g>`;
}

const original = (f) => execSync(`git show 620d281:${f}`, { encoding: 'utf8', maxBuffer: 1 << 26 });

/** Swap the circle + ح for the cleaver mark (same centre and size); optionally make the Arabic name red. */
function rebuild(src, { cx, cy, r, redName }) {
  let s = src.replace(/\s*<circle [^>]*\/>\s*<circle [^>]*\/>\s*<path [^>]*\/>/, () => {
    const scale = (r * 2) / 192;
    return `\n  <g transform="translate(${cx - 100 * scale} ${cy - 100 * scale}) scale(${scale})">${markInner()}\n  </g>`;
  });
  if (redName) s = s.replace(/fill="#141110"/, `fill="${RED}"`); // first dark path = the Arabic name
  return s;
}

fs.mkdirSync('public/icons', { recursive: true });
const files = {
  'public/brand/hawar-albada-mark.svg': { cx: 100, cy: 100, r: 96, redName: false },
  'public/brand/hawar-albada-logo.svg': { cx: 100, cy: 100, r: 96, redName: true },
  'public/brand/hawar-albada-logo-light.svg': { cx: 100, cy: 100, r: 96, redName: false }, // beige name on black
  'public/brand/hawar-albada-logo-stacked.svg': { cx: 210, cy: 112, r: 100, redName: true },
};
for (const [f, o] of Object.entries(files)) {
  const out = rebuild(original(f), o);
  if (out.includes('<circle cx="100" cy="100" r="96"') || out.includes('<circle cx="210.0"')) throw new Error(`mark not replaced in ${f}`);
  fs.writeFileSync(f, out);
}

// Stacked: thin rule between the Arabic name and HAWAR ALBADA, as in the reference.
{
  const f = 'public/brand/hawar-albada-logo-stacked.svg';
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace('</svg>', `  <rect x="110" y="318" width="200" height="1.6" fill="#141110" opacity=".55"/>\n</svg>`);
  fs.writeFileSync(f, s);
}

fs.copyFileSync('public/brand/hawar-albada-mark.svg', 'src/app/icon.svg');
const mark = fs.readFileSync('public/brand/hawar-albada-mark.svg');
const png = (size) => sharp(mark, { density: 600 }).resize(size, size).png().toBuffer();

fs.writeFileSync('src/app/apple-icon.png', await sharp({ create: { width: 180, height: 180, channels: 4, background: RED } })
  .composite([{ input: await png(180) }]).png().toBuffer());
fs.writeFileSync('public/icons/icon-192.png', await png(192));
fs.writeFileSync('public/icons/icon-512.png', await png(512));
fs.copyFileSync('public/icons/icon-512.png', 'public/brand/icon-512.png');
fs.copyFileSync('src/app/apple-icon.png', 'public/brand/apple-touch-icon-180.png');
// Maskable: full-bleed red with the mark inside the 80% safe zone.
fs.writeFileSync('public/icons/maskable-512.png', await sharp({ create: { width: 512, height: 512, channels: 4, background: RED } })
  .composite([{ input: await png(400), gravity: 'center' }]).png().toBuffer());

// favicon.ico: an ICO container holding PNG images (supported by every current browser).
const sizes = [16, 32, 48];
const imgs = await Promise.all(sizes.map(png));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((sz, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(sz, e); header.writeUInt8(sz, e + 1); header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(imgs[i].length, e + 8); header.writeUInt32LE(offset, e + 12);
  offset += imgs[i].length;
});
fs.writeFileSync('src/app/favicon.ico', Buffer.concat([header, ...imgs]));

// Share image: stacked logo on beige, 1200×630.
const stacked = await sharp('public/brand/hawar-albada-logo-stacked.svg', { density: 300 }).resize({ height: 470, fit: 'inside' }).png().toBuffer();
const og = await sharp({ create: { width: 1200, height: 630, channels: 3, background: BEIGE } }).composite([{ input: stacked, gravity: 'center' }]).png().toBuffer();
fs.writeFileSync('src/app/[lang]/opengraph-image.png', og);
fs.writeFileSync('src/app/[lang]/twitter-image.png', og);
console.log('brand rebuilt');
