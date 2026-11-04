/**
 * v3 layout checks: P2 (no duplicates), P3 (fixed space), P4 (live hero), P5 (visible on first paint),
 * P6 (WhatsApp button), P7 (compact trust row) and no sideways scrolling at every width.
 */
import { expect, test, type Page } from '@playwright/test';
import { settle } from './helpers';

const visibleCount = (page: Page, sel: string) =>
  page.evaluate((s) => Array.from(document.querySelectorAll<HTMLElement>(s)).filter((e) => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  }).length, sel);

test.describe('P2: every piece rendered once', () => {
  test('phone 390: header = logo + language only; search and cart live in the tab bar; one category selector', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/ar');
    await settle(page);
    const header = page.locator('.site-header');
    expect(await visibleCount(page, '.site-header input[type="search"]')).toBe(0);
    expect(await visibleCount(page, '.site-header [data-testid="open-cart"]')).toBe(0);
    expect(await visibleCount(page, '.site-header [data-testid="header-account"]')).toBe(0);
    await expect(header.getByTestId('lang-switch')).toBeVisible();
    await expect(header.locator('.logo')).toBeVisible();
    expect(await visibleCount(page, '[data-testid="category-chips"]')).toBe(1);
    expect(await visibleCount(page, '.cat-strip, .rail')).toBe(0);
    const tabbar = page.getByTestId('tabbar');
    await expect(tabbar.locator('[data-tab="search"]')).toBeVisible();
    await expect(tabbar.locator('[data-tab="cart"]')).toBeVisible();
    expect(await visibleCount(page, '[data-testid="open-cart"], [data-testid="tab-cart"]')).toBe(1);
  });

  test('desktop 1280: no tab bar, no side rail; header has search, cart, account, language; chips once', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const path of ['/ar', '/ar/product/hawar-local']) {
      await page.goto(path);
      await settle(page);
      expect(await visibleCount(page, '[data-testid="tabbar"], .rail')).toBe(0);
      const header = page.locator('.site-header');
      await expect(header.locator('input[type="search"]')).toBeVisible();
      await expect(header.getByTestId('open-cart')).toBeVisible();
      await expect(header.getByTestId('header-account')).toBeVisible();
      await expect(header.getByTestId('lang-switch')).toBeVisible();
      expect(await visibleCount(page, '[data-testid="category-chips"]'), path).toBe(1);
      expect(await visibleCount(page, '[data-testid="open-cart"], [data-testid="tab-cart"]')).toBe(1);
    }
  });
});

test.describe('P3: fixed space on phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('56px header; the ticker scrolls away; chip bar ≤64px, sticky under the header, hides on scroll down and returns on scroll up', async ({ page }) => {
    await page.goto('/ar');
    await settle(page);
    expect(Math.round((await page.locator('.site-header').boundingBox())!.height)).toBe(56);
    const bar = page.locator('.chip-bar');
    expect((await bar.boundingBox())!.height).toBeLessThanOrEqual(64);

    // Scroll past the chips: the ticker is gone and the bar sticks directly under the header.
    const barTop = await bar.evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
    await page.evaluate((y) => window.scrollTo(0, y), barTop + 800);
    await page.mouse.wheel(0, -300); // a little upward scroll brings the bar back
    await page.waitForTimeout(500);
    const tick = await page.getByTestId('announcement').boundingBox();
    expect(tick === null || tick.y + tick.height <= 0).toBe(true);
    const headerBottom = await page.locator('.site-header').evaluate((e) => e.getBoundingClientRect().bottom);
    expect(Math.abs((await bar.evaluate((e) => e.getBoundingClientRect().top)) - headerBottom)).toBeLessThanOrEqual(2);
    await expect(bar).not.toHaveClass(/\bhide\b/);

    for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 500); await page.waitForTimeout(80); }
    await page.waitForTimeout(400);
    await expect(bar).toHaveClass(/\bhide\b/);
    for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, -300); await page.waitForTimeout(80); }
    await page.waitForTimeout(400);
    await expect(bar).not.toHaveClass(/\bhide\b/);
  });
});

test.describe('P4/P5: hero and first paint', () => {
  test('hero shows media (video, or placeholder until the files exist) — never an empty box', async ({ page }) => {
    await page.goto('/ar');
    await settle(page);
    const media = page.getByTestId('hero-media');
    await expect(media).toBeVisible();
    expect(await media.locator('video, picture, .hero-placeholder').count()).toBeGreaterThan(0);
  });

  test('without JavaScript every section and product card is fully visible (no opacity fade)', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto('/ar');
    await page.waitForTimeout(1500); // the CSS-only headline reveal finishes in under 1 s
    const hidden = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('main h1, main h2, [data-testid="product-card"], [data-testid="trust"]'))
      .filter((e) => {
        let n: HTMLElement | null = e;
        while (n) { if (parseFloat(getComputedStyle(n).opacity) < 1) return true; n = n.parentElement; }
        return false;
      }).map((e) => e.textContent?.slice(0, 30)));
    expect(hidden).toEqual([]);
    await ctx.close();
  });
});

test.describe('P6: WhatsApp button', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('44px, at the inline end above the tab bar; hides while scrolling down and while typing', async ({ page }) => {
    await page.goto('/ar');
    await settle(page);
    const fab = page.getByTestId('whatsapp-fab');
    // Resting geometry (it may be tucked away right now because it would cover a button).
    const box = await fab.evaluate((e) => { e.style.transition = 'none'; e.style.transform = 'none'; const r = e.getBoundingClientRect(); e.style.transform = ''; e.style.transition = ''; return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    expect(Math.round(box.width)).toBe(44);
    expect(Math.round(box.height)).toBe(44);
    expect(box.x).toBeLessThan(390 / 2); // Arabic: inline end = left
    const tabTop = (await page.getByTestId('tabbar').boundingBox())!.y;
    expect(box.y + box.height).toBeLessThanOrEqual(tabTop);

    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(100);
    await expect(fab).toHaveClass(/\baway\b/);

    await page.goto('/ar/search');
    await settle(page);
    await page.getByTestId('search-input').focus();
    await page.waitForTimeout(300);
    expect(await visibleCount(page, '[data-testid="whatsapp-fab"]:not(.away)')).toBe(0);
  });

  test('never covers a button or a product card once scrolling stops', async ({ page }) => {
    await page.goto('/ar');
    await settle(page);
    for (let y = 0; y < 5000; y += 400) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(350);
      const covered = await page.evaluate(() => {
        const fab = document.querySelector<HTMLElement>('[data-testid="whatsapp-fab"]');
        if (!fab || fab.classList.contains('away')) return null;
        const r = fab.getBoundingClientRect();
        fab.style.pointerEvents = 'none';
        const pts = [[r.left + 2, r.top + 2], [r.right - 2, r.top + 2], [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2], [r.left + r.width / 2, r.top + r.height / 2]];
        const hit = pts.map(([x, y]) => document.elementFromPoint(x, y)?.closest('button, a.btn, [data-testid="product-card"]')).find(Boolean);
        fab.style.pointerEvents = '';
        return hit ? (hit as HTMLElement).outerHTML.slice(0, 80) : null;
      });
      expect(covered, `at scrollY ${y}`).toBeNull();
    }
  });
});

test('P7: the trust items sit in one compact row of three', async ({ page }) => {
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/ar');
    await settle(page);
    const tops = await page.getByTestId('trust').locator(':scope > *').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(tops.length, `${width}`).toBe(3);
    expect(new Set(tops).size, `${width}: ${tops}`).toBe(1);
  }
});

test('no sideways scrolling at 320, 360, 390, 430, 768, 1024 and 1280', async ({ page }) => {
  test.setTimeout(300_000);
  for (const width of [320, 360, 390, 430, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ['/ar', '/en', '/ar/product/hawar-local', '/ar/search', '/ar/stores']) {
      await page.goto(path);
      await settle(page);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, `${path} @ ${width}`).toBeLessThanOrEqual(0);
    }
  }
});
