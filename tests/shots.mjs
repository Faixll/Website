// Quick visual check: node tests/shots.mjs <outDir> [paths...]  (dev server must be running on :3000)
import { chromium } from '@playwright/test';

const out = process.argv[2] ?? 'qa-screenshots/scratch';
const paths = process.argv.slice(3).length ? process.argv.slice(3) : ['/ar', '/en', '/ar/product/hawar-local', '/ar/search', '/ar/stores', '/ar/profile'];
const vps = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 800 } };

const browser = await chromium.launch();
for (const [vn, vp] of Object.entries(vps)) {
  const page = await browser.newPage({ viewport: vp, locale: 'ar-AE', timezoneId: 'Asia/Dubai' });
  for (const p of paths) {
    await page.goto(`http://localhost:3000${p}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const name = p.replace(/^\//, '').replace(/[/?=&]/g, '_') || 'root';
    await page.screenshot({ path: `${out}/${name}-${vn}.png`, fullPage: false });
  }
  await page.close();
}
await browser.close();
console.log('done');
