/**
 * Builds the Albada (البدع) logo set from the client's round logo (R2-round):
 * red circle, thin beige ring, "البدع", a rule with a small cleaver, "ALBADA", "لتجارة اللحوم الطازجة".
 * The letters are the exact outlines of the original lettering (taken word by word from the first logo pack
 * in git), so nothing is re-typed in a different font.
 *
 * Writes: public/brand/albada-{logo-round,mark,logo}.svg, src/app/icon.svg, src/app/apple-icon.png,
 * src/app/favicon.ico, public/icons/{icon-192,icon-512,maskable-512}.png, src/app/[lang]/{opengraph,twitter}-image.png
 * Run: node scripts/brand-albada.mjs
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import sharp from 'sharp';

const RED = '#A51D26';
const BEIGE = '#F4ECDF';
const INK = '#141110';
const MUTED = '#5E554E';

// ---- original outlines (logo pack v1, commit 620d281)
const src = execSync('git show 620d281:public/brand/hawar-albada-logo-stacked.svg', { encoding: 'utf8', maxBuffer: 1 << 26 });
const paths = [...src.matchAll(/<path transform="translate\([\d.]+ [\d.]+\)" fill="#\w+" d="([^"]+)"/g)].map((m) => m[1]);
const subs = (d) => d.split(/(?=M)/);
const NAME_AR = subs(paths[1]).slice(0, 6).join(''); // "البدع" (the left word of "حوار البدع")
const NAME_EN = subs(paths[2]).slice(11).join(''); // "ALBADA" (the second word of "HAWAR ALBADA")
const TAGLINE = paths[3]; // "لتجارة اللحوم الطازجة"
// Bounding boxes of those outlines in their own coordinates (measured in Chromium with getBBox).
const BOX = { ar: [3, -50, 161, 29], en: [150, -20, 299, 0], tag: [1, -17, 190, 7] };
if (!NAME_AR || !NAME_EN || !TAGLINE) throw new Error('lettering not found');

/** Places an outline so its box is centred on (cx, cy) at `width` px wide. */
function place(d, box, cx, cy, width, fill) {
  const [x0, y0, x1, y1] = box;
  const s = width / (x1 - x0);
  const tx = cx - s * (x0 + x1) / 2;
  const ty = cy - s * (y0 + y1) / 2;
  return `<path transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)})" fill="${fill}" d="${d}"/>`;
}

/** Small cleaver (blade right, handle left), centred on (cx, cy), `w` px wide. */
function cleaver(cx, cy, w, fill, hole) {
  const s = w / 150;
  return `<g transform="translate(${cx} ${cy}) scale(${s.toFixed(4)}) rotate(-12)" fill="${fill}">
    <path d="M-10 -32 H62 Q72 -32 72 -22 V20 Q72 30 62 30 H-4 Q-10 30 -10 24 Z"/>
    <circle cx="58" cy="-18" r="6" fill="${hole}"/>
    <rect x="-22" y="-12" width="14" height="20" rx="3"/>
    <rect x="-78" y="-9" width="58" height="14" rx="7"/>
  </g>`;
}

/** The divider: two thin rules with the cleaver between them. */
function divider(cx, cy, half, gap, color, hole) {
  return `<rect x="${cx - half}" y="${cy - 0.9}" width="${half - gap}" height="1.8" fill="${color}"/>
  <rect x="${cx + gap}" y="${cy - 0.9}" width="${half - gap}" height="1.8" fill="${color}"/>
  ${cleaver(cx, cy, gap * 1.7, color, hole)}`;
}

const svg = (w, h, label, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">
  <title>${label}</title>
  ${body}
</svg>
`;

// ---- 1. the full round logo (as supplied)
const round = svg(400, 400, 'Albada - البدع', `
  <circle cx="200" cy="200" r="196" fill="${RED}"/>
  <circle cx="200" cy="200" r="182" fill="none" stroke="${BEIGE}" stroke-width="2.4" opacity=".9"/>
  ${place(NAME_AR, BOX.ar, 200, 160, 210, BEIGE)}
  ${divider(200, 228, 108, 26, BEIGE, RED)}
  ${place(NAME_EN, BOX.en, 200, 266, 168, BEIGE)}
  ${place(TAGLINE, BOX.tag, 200, 302, 170, BEIGE)}`);

// ---- 2. the mark: the same badge with only the name, readable down to favicon size
const mark = svg(200, 200, 'Albada', `
  <circle cx="100" cy="100" r="98" fill="${RED}"/>
  <circle cx="100" cy="100" r="89" fill="none" stroke="${BEIGE}" stroke-width="2" opacity=".9"/>
  ${place(NAME_AR, BOX.ar, 100, 92, 138, BEIGE)}
  ${divider(100, 140, 48, 13, BEIGE, RED)}`);

// ---- 3. horizontal logo for light backgrounds (desktop header): badge + name block
const horizontal = svg(380, 140, 'Albada - البدع', `
  <g transform="translate(0 0) scale(0.7)">
    <circle cx="100" cy="100" r="98" fill="${RED}"/>
    <circle cx="100" cy="100" r="89" fill="none" stroke="${BEIGE}" stroke-width="2" opacity=".9"/>
    ${place(NAME_AR, BOX.ar, 100, 92, 138, BEIGE)}
    ${divider(100, 140, 48, 13, BEIGE, RED)}
  </g>
  ${place(NAME_AR, BOX.ar, 280, 40, 124, RED)}
  ${divider(280, 84, 96, 15, INK, BEIGE)}
  ${place(NAME_EN, BOX.en, 280, 104, 116, INK)}
  ${place(TAGLINE, BOX.tag, 280, 127, 118, MUTED)}`);

fs.mkdirSync('public/icons', { recursive: true });
for (const f of fs.readdirSync('public/brand')) if (f.startsWith('hawar-albada-')) fs.rmSync(`public/brand/${f}`);
fs.writeFileSync('public/brand/albada-logo-round.svg', round);
fs.writeFileSync('public/brand/albada-mark.svg', mark);
fs.writeFileSync('public/brand/albada-logo.svg', horizontal);
fs.copyFileSync('public/brand/albada-mark.svg', 'src/app/icon.svg');

const png = (input, size) => sharp(Buffer.from(input), { density: 600 }).resize(size, size).png().toBuffer();
const on = async (bg, size, inner, innerSize) => sharp({ create: { width: size, height: size, channels: 4, background: bg } })
  .composite([{ input: await png(inner, innerSize), gravity: 'center' }]).png().toBuffer();

// Apple touch icon: beige square (iOS rounds it) with the badge.
fs.writeFileSync('src/app/apple-icon.png', await on(BEIGE, 180, mark, 164));
fs.copyFileSync('src/app/apple-icon.png', 'public/brand/apple-touch-icon-180.png');
fs.writeFileSync('public/icons/icon-192.png', await png(round, 192));
fs.writeFileSync('public/icons/icon-512.png', await png(round, 512));
fs.copyFileSync('public/icons/icon-512.png', 'public/brand/icon-512.png');
// Maskable: full-bleed red with the badge inside the safe zone.
fs.writeFileSync('public/icons/maskable-512.png', await on(RED, 512, round, 420));

// favicon.ico (PNG images inside an ICO container) from the simple mark.
const sizes = [16, 32, 48];
const imgs = await Promise.all(sizes.map((s) => png(mark, s)));
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let off = head.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  head.writeUInt8(s, e); head.writeUInt8(s, e + 1); head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(imgs[i].length, e + 8); head.writeUInt32LE(off, e + 12);
  off += imgs[i].length;
});
fs.writeFileSync('src/app/favicon.ico', Buffer.concat([head, ...imgs]));

// Share image: the round logo on beige, 1200×630.
const og = await sharp({ create: { width: 1200, height: 630, channels: 3, background: BEIGE } })
  .composite([{ input: await png(round, 500), gravity: 'center' }]).png().toBuffer();
fs.writeFileSync('src/app/[lang]/opengraph-image.png', og);
fs.writeFileSync('src/app/[lang]/twitter-image.png', og);
console.log('Albada brand built');
