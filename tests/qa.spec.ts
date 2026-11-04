/**
 * Site-wide QA: every page × phone/tablet/desktop, plus the known bugs (A–H).
 * QA_SHOTS=before npx playwright test tests/qa.spec.ts  → screenshots in qa-screenshots/before
 */
import { expect, test, type Page } from '@playwright/test';
import { addToCartFromProduct, auditPage, internalLinks, settle, SHOTS, VIEWPORTS, watchErrors, type ViewportName } from './helpers';

const PAGES = [
  { name: 'home-ar', path: '/ar' },
  { name: 'home-en', path: '/en' },
  { name: 'stores-ar', path: '/ar/stores' },
  { name: 'search-ar', path: '/ar/search' },
  { name: 'product-ar', path: '/ar/product/hawar-local' },
  { name: 'cart-ar', path: '/ar', withItem: true, openCart: true },
  { name: 'checkout-ar', path: '/ar/checkout', withItem: true },
];

async function openCart(page: Page) {
  const btn = page.locator('[data-testid="open-cart"], [data-testid="tab-cart"]').filter({ visible: true }).first();
  await btn.click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

const visited = new Set<string>();

for (const vp of Object.keys(VIEWPORTS) as ViewportName[]) {
  for (const p of PAGES) {
    test(`${p.name} @ ${vp}`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[vp]);
      const errors = watchErrors(page);
      if (p.withItem) await addToCartFromProduct(page, 'ar');
      await page.goto(p.path);
      await settle(page);
      if (p.openCart) await openCart(page);
      await page.screenshot({ path: `${SHOTS}/${p.name}-${vp}.png`, fullPage: !p.openCart });

      const a = await auditPage(page, { phone: vp === 'phone', english: p.path.startsWith('/en') });
      for (const l of await internalLinks(page)) visited.add(l);

      expect.soft(a.overflow, 'horizontal page overflow (px)').toBeLessThanOrEqual(0);
      expect.soft(a.brokenImages, 'broken images').toEqual([]);
      expect.soft(errors, 'console errors / failed requests').toEqual([]);
      if (vp === 'phone') expect.soft(a.smallTargets, 'tap targets under 44×44').toEqual([]);
      expect.soft(a.lowContrast, 'text below WCAG AA contrast').toEqual([]);
      if (p.path.startsWith('/en')) expect.soft(a.arabicOnEnglish, 'Arabic text on /en').toEqual([]);
    });
  }
}

test('320px wide: no horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of ['/ar', '/en', '/ar/product/hawar-local', '/ar/search', '/ar/stores']) {
    await page.goto(path);
    await settle(page);
    expect.soft(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBeLessThanOrEqual(0);
  }
});

test('internal links do not return 404', async ({ page, request }) => {
  for (const path of ['/ar', '/en', '/ar/stores', '/ar/search', '/ar/product/hawar-local']) {
    await page.goto(path);
    for (const l of await internalLinks(page)) visited.add(l);
  }
  const bad: string[] = [];
  for (const url of visited) {
    const r = await request.get(url, { maxRedirects: 5 });
    if (r.status() >= 400) bad.push(`${r.status()} ${new URL(url).pathname}`);
  }
  expect(bad).toEqual([]);
});

test('RTL on /ar and LTR on /en', async ({ page }) => {
  await page.goto('/ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await page.goto('/en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('order flow: add, change option, cart total = sum of lines, checkout shows form + summary + VAT', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto('/ar/product/hawar-local');
  await settle(page);
  // change an option: pick the last choice in the first option group
  const group = page.locator('fieldset').first();
  const options = group.locator('button[role=radio]');
  if (await options.count() > 1) await options.last().click();
  await page.getByRole('button', { name: /أضف إلى السلة/ }).filter({ visible: true }).first().click();
  await addToCartFromProduct(page, 'ar', 'naimi-local');
  await page.goto('/ar');
  await settle(page);
  await openCart(page);
  const dlg = page.getByRole('dialog');
  const nums = async (sel: string) => (await dlg.locator(sel).allInnerTexts()).map((s) => Number((s.match(/\d[\d,]*(\.\d+)?/)?.[0] ?? 'NaN').replace(/,/g, '')));
  const lines = await nums('[data-testid="cart-line-total"], .line .l-row b');
  const [subtotal] = await nums('[data-testid="cart-subtotal"], .totals .grand b');
  expect(lines.length).toBeGreaterThanOrEqual(2);
  expect(subtotal).toBeCloseTo(lines.reduce((a, b) => a + b, 0), 2);
  await dlg.getByRole('link', { name: /إتمام الطلب/ }).click();
  await expect(page).toHaveURL(/\/ar\/checkout/);
  await expect(page.locator('#co-name')).toBeVisible();
  await expect(page.getByText(/ملخص الطلب/).first()).toBeVisible();
  await expect(page.getByText(/ضريبة القيمة المضافة/).first()).toBeVisible();
});

/* ---------------------------------------------------------------- known bugs */

test('A: time ranges read left-to-right in Arabic (home, product, checkout, branches)', async ({ page }) => {
  await addToCartFromProduct(page, 'ar');
  for (const path of ['/ar', '/ar/product/hawar-local', '/ar/checkout', '/ar/stores']) {
    await page.goto(path);
    await settle(page);
    const unwrapped = await page.evaluate(() => {
      // The deepest elements whose text contains a time range (a range may be split over several text nodes).
      const re = /\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}/;
      const bad: string[] = [];
      for (const el of Array.from(document.body.querySelectorAll('*'))) {
        if (!re.test(el.textContent ?? '') || Array.from(el.children).some((ch) => re.test(ch.textContent ?? ''))) continue;
        if (!el.closest('[dir="ltr"]')) bad.push((el.textContent ?? '').trim().slice(0, 40));
      }
      return bad;
    });
    expect.soft(unwrapped, path).toEqual([]);
  }
});

test('B: checkout shows no developer/Stripe message and no online-payment options while payments are off', async ({ page }) => {
  await addToCartFromProduct(page, 'ar');
  await page.goto('/ar/checkout');
  await settle(page);
  await expect(page.locator('body')).not.toContainText('Stripe');
  await expect(page.locator('input[name="payment"][value="wallet"], input[name="payment"][value="card"]')).toHaveCount(0);
  await expect(page.locator('input[name="payment"][value="cod"]')).toHaveCount(1);
});

test('C: sticky add-to-cart button on the product page has a text label', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.phone);
  await page.goto('/ar/product/hawar-local');
  await settle(page);
  const btn = page.locator('[data-testid="action-bar"] [data-testid="add-to-cart"]').filter({ visible: true }).first();
  await expect(btn).toBeVisible();
  expect((await btn.innerText()).trim()).toMatch(/أضف إلى السلة/);
});

test('D: no product appears twice on the home page', async ({ page }) => {
  for (const lang of ['ar', 'en']) {
    await page.goto(`/${lang}`);
    await settle(page);
    const ids = await page.evaluate(() => Array.from(document.querySelectorAll('main article a[href*="/product/"]')).map((a) => new URL((a as HTMLAnchorElement).href).pathname));
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.filter((x, i) => ids.indexOf(x) !== i), lang).toEqual([]);
  }
});

test('E: branches show today first, full week behind a toggle, and an Open in Maps button', async ({ page }) => {
  await page.goto('/ar/stores');
  await settle(page);
  const toggle = page.getByRole('button', { name: /عرض كل الأوقات/ }).first();
  await expect(toggle).toBeVisible();
  await expect(page.getByRole('link', { name: /افتح في الخرائط/ }).first()).toBeVisible();
  const visibleRows = await page.locator('table tr').filter({ visible: true }).count();
  expect(visibleRows).toBeLessThanOrEqual(1);
  await toggle.click();
  await expect(page.locator('table tr').filter({ visible: true })).toHaveCount(7);
});

test('F: footer categories match the category chips', async ({ page }) => {
  await page.goto('/ar');
  await settle(page);
  const cats = (sel: string) => page.evaluate((s) => Array.from(new Set(Array.from(document.querySelectorAll<HTMLAnchorElement>(s))
    .map((a) => new URL(a.href).searchParams.get('cat')).filter(Boolean))).sort(), sel);
  const header = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('[data-testid="category-chips"] [data-cat]')).map((a) => a.dataset.cat!).sort());
  const footer = await cats('footer a[href*="cat="]');
  expect(header.length).toBeGreaterThan(0);
  expect(footer).toEqual(header);
});

test('H: English uses "Hawar Albada" everywhere', async ({ page }) => {
  for (const path of ['/en', '/en/stores', '/en/product/hawar-local']) {
    await page.goto(path);
    await settle(page);
    const html = await page.content();
    expect.soft(html.includes('Hawar Al Bada'), path).toBe(false);
  }
});
