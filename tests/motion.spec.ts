/** Reduced motion, layout stability (CLS) and fonts. */
import { expect, test, type Page } from '@playwright/test';
import { settle, VIEWPORTS } from './helpers';

async function cls(page: Page, path: string) {
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(path);
  await settle(page);
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(800);
  return page.evaluate(() => (window as unknown as { __cls: number }).__cls);
}

test.describe('reduced motion', () => {
  test.use({ viewport: VIEWPORTS.desktop });
  // Emulate prefers-reduced-motion before the page loads (the `reducedMotion` use-option is not applied by this runner).
  test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }); });

  test('no parallax on the hero photo', async ({ page }) => {
    await page.goto('/ar');
    await settle(page);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(500);
    const transform = await page.getByTestId('hero-photo').evaluate((el) => getComputedStyle(el).transform);
    expect(transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true);
  });

  test('no bounce or slide: add-to-cart and cart icon do not scale', async ({ page }) => {
    await page.goto('/ar');
    await settle(page);
    await page.getByTestId('quick-add').first().click();
    const samples: string[] = [];
    for (let i = 0; i < 6; i++) {
      samples.push(await page.getByTestId('open-cart').locator('.tab-ico').evaluate((el) => getComputedStyle(el).transform));
      await page.waitForTimeout(50);
    }
    for (const s of samples) expect(s === 'none' || s === 'matrix(1, 0, 0, 1, 0, 0)', s).toBe(true);
  });
});

for (const [name, vp] of [['phone', VIEWPORTS.phone], ['desktop', VIEWPORTS.desktop]] as const) {
  test(`Cumulative Layout Shift stays under 0.1 on home and product (${name})`, async ({ page }) => {
    await page.setViewportSize(vp);
    const home = await cls(page, '/ar');
    const product = await cls(page, '/ar/product/hawar-local');
    console.log(`CLS ${name}: home ${home.toFixed(4)}, product ${product.toFixed(4)}`);
    expect(home).toBeLessThan(0.1);
    expect(product).toBeLessThan(0.1);
  });
}

test('all configured fonts are loaded (document.fonts)', async ({ page }) => {
  const want = { ar: ['IBM_Plex_Sans_Arabic', 'Noto_Kufi_Arabic', 'Lalezar'], en: ['IBM_Plex_Sans', 'Playfair_Display'] } as const;
  for (const lang of ['ar', 'en'] as const) {
    await page.goto(`/${lang}`);
    await settle(page);
    const loaded = await page.evaluate(() => Array.from(document.fonts).filter((f) => f.status === 'loaded').map((f) => f.family));
    for (const fam of want[lang]) {
      expect(loaded.some((f) => f.replace(/[\s'"]/g, '_').includes(fam) && !(fam === 'IBM_Plex_Sans' && /Arabic/.test(f))), `${lang}: ${fam} in ${loaded.join(', ')}`).toBe(true);
    }
  }
});
