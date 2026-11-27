/**
 * Full product list as a bilingual A4 PDF: every product with its photo, description, options with offer
 * and regular price, unit and cutting styles. Built from the site's own data (src/data/catalog.ts and the
 * photos in public/images/products), so it always matches the site.
 * Run: npx tsx scripts/product-list.ts   → docs/Albada_Product_List.pdf
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { categories, cuts, discountPct, wasPrice, type Product } from '../src/data/catalog';
// Only products that have a photo (the same list as the site); the others are left out until their photo arrives.
import { shopProducts as products } from '../src/data/shop';
import manifest from '../src/data/product-images.json';

const OUT = 'docs/Albada_Product_List.pdf';
const IMG = 'public/images/products';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const aed = (n: number) => n.toFixed(2);
const photo = (id: string) => {
  const f = path.join(IMG, `${id}.webp`);
  return fs.existsSync(f) ? `data:image/webp;base64,${fs.readFileSync(f).toString('base64')}` : null;
};
const gallery = (manifest as { gallery?: Record<string, string[]> }).gallery ?? {};
const unitText = (p: Product) => (p.byWeight ? { en: 'Sold by the kg (price per kg)', ar: 'يُباع بالكيلو (السعر للكيلو)' }
  : p.unit === 'meal' ? { en: 'Per meal', ar: 'للوجبة' } : { en: 'Per pack / box', ar: 'للعبوة / البوكس' });

function card(p: Product, n: number) {
  const src = photo(p.id);
  const extra = (gallery[p.id] ?? []).map(photo).filter(Boolean) as string[];
  const cat = categories.find((c) => c.id === p.category)!.name;
  const u = unitText(p);
  const rows = p.sizes.map((s) => {
    const was = wasPrice(s);
    return `<tr><td>${esc(s.name.en)}</td><td class="ar">${esc(s.name.ar)}</td>
      <td class="price"><b>AED ${aed(s.price)}</b>${was ? ` <s>${aed(was)}</s>` : ''}</td>
      <td class="off">${discountPct(s) ? `−${discountPct(s)}%` : ''}</td></tr>`;
  }).join('');
  const cutList = p.cuts.length
    ? `<div class="cuts"><span class="k">Cutting · التقطيع</span>${p.cuts.map((c) => `<span class="chip">${esc(cuts[c].name.en)} · <span class="ar">${esc(cuts[c].name.ar)}</span></span>`).join('')}</div>`
    : '';
  return `<section class="card">
    <div class="media">
      <span class="num">${n}</span>
      <img src="${src}" alt="">
      ${extra.length ? `<div class="thumbs">${extra.map((x) => `<img src="${x}" alt="">`).join('')}</div>` : ''}
    </div>
    <div class="info">
      <div class="tags"><span class="tag">${esc(cat.en)} · <span class="ar">${esc(cat.ar)}</span></span>
        ${p.storage === 'fresh' ? '<span class="tag">Fresh · <span class="ar">طازج</span></span>' : ''}</div>
      <div class="names"><h2>${esc(p.name.en)}</h2><h2 class="ar">${esc(p.name.ar)}</h2></div>
      <div class="names desc"><p>${esc(p.desc.en)}</p><p class="ar">${esc(p.desc.ar)}</p></div>
      <div class="unit">${esc(u.en)} · <span class="ar">${esc(u.ar)}</span></div>
      <table>${rows}</table>
      ${cutList}
    </div>
  </section>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 14mm 12mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #1A1412; font-size: 10.5pt; }
  .ar { direction: rtl; unicode-bidi: isolate; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #8E1B1B; padding-bottom: 6px; margin-bottom: 10px; }
  header .brand { font-family: Georgia, serif; letter-spacing: .25em; color: #8E1B1B; font-size: 20pt; font-weight: 700; }
  header .t { text-align: end; font-weight: 600; } header .t small { display: block; font-weight: 400; color: #6b5d55; }
  .card { display: grid; grid-template-columns: 52mm 1fr; gap: 6mm; padding: 5mm 0; border-bottom: 1px solid #e3d8c6; break-inside: avoid; }
  .media { position: relative; }
  .media > img { width: 52mm; aspect-ratio: 3/4; object-fit: cover; border-radius: 3mm; display: block; }
  .num { position: absolute; top: 2.5mm; left: 2.5mm; width: 7mm; height: 7mm; border-radius: 50%; background: #8E1B1B; color: #fff; font-weight: 700; display: grid; place-items: center; font-size: 9pt; }
  .thumbs { display: flex; gap: 2mm; margin-top: 2mm; } .thumbs img { width: 16mm; aspect-ratio: 3/4; object-fit: cover; border-radius: 1.5mm; }
  .tags { display: flex; flex-wrap: wrap; gap: 1.5mm; margin-bottom: 2mm; }
  .tag { font-size: 8pt; background: #F6EFE4; border-radius: 99px; padding: .6mm 2.5mm; }
  .names { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; align-items: start; }
  .names .ar { text-align: right; }
  h2 { margin: 0; font-size: 13pt; }
  .desc p { margin: 1mm 0 0; color: #3A2F29; }
  .unit { margin-top: 2.5mm; font-size: 9pt; color: #6b5d55; }
  table { width: 100%; border-collapse: collapse; margin-top: 2mm; }
  td { padding: 1.2mm 1.5mm; border-top: 1px solid #efe6d8; vertical-align: middle; }
  td.ar { text-align: right; } td.price { white-space: nowrap; text-align: end; }
  s { color: #8a7a6e; font-size: 9pt; } td.off { color: #8E1B1B; font-weight: 700; width: 12mm; text-align: end; }
  .cuts { margin-top: 2.5mm; display: flex; flex-wrap: wrap; gap: 1.5mm; align-items: center; }
  .cuts .k { font-size: 8.5pt; font-weight: 700; margin-inline-end: 1mm; }
  .chip { font-size: 8pt; border: 1px solid #d9ccb8; border-radius: 99px; padding: .5mm 2.2mm; }
  .note { margin-top: 5mm; font-size: 8.5pt; color: #6b5d55; display: flex; justify-content: space-between; gap: 6mm; }
</style></head><body>
  <header><span class="brand">ALBADA</span><span class="t">Product list · <span class="ar">قائمة المنتجات</span><small>${products.length} products · ${new Date().toISOString().slice(0, 10)}</small></span></header>
  ${products.map((p, i) => card(p, i + 1)).join('')}
  <div class="note"><span>Prices in AED, VAT included. Bold = offer price, struck through = regular price.</span>
    <span class="ar">الأسعار بالدرهم وتشمل ضريبة القيمة المضافة. الخط العريض = سعر العرض، والمشطوب = السعر الأصلي.</span></div>
</body></html>`;

async function main() {
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
await page.pdf({
  path: OUT, format: 'A4', printBackground: true, displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#8a7a6e">Albada · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
});
await browser.close();
console.log(`${OUT}: ${products.length} products`);
}
main().catch((e) => { console.error(e); process.exit(1); });
