/** Every product and option: offer price shown, discount badge right, cart total right, both languages. */
import { expect, test } from '@playwright/test';
// Only products with a photo are on the site (the others are hidden until their photo arrives).
import { shopProducts as products } from '../src/data/shop';
import { settle, VIEWPORTS } from './helpers';

const fmt = (n: number, lang: 'ar' | 'en') => {
  const s = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return lang === 'ar' ? `${s} د.إ` : `AED ${s}`;
};
const pct = (was: number, price: number) => Math.round(((was - price) / was) * 100);
const cartSubtotal = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('hab-store-v1') ?? '{}').lines ?? [];
    return raw as { productId: string; sizeId: string; qty: number }[];
  });

for (const lang of ['ar', 'en'] as const) {
  test.describe(`catalogue (${lang})`, () => {
    for (const p of products) {
      test(`${p.name.en}: every option shows its offer price and adds to the cart at that price`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS.desktop);
        await page.goto(`/${lang}/product/${p.id}`);
        await settle(page);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.name[lang]);

        let expected = 0;
        for (const s of p.sizes) {
          if (p.sizes.length > 1) await page.locator(`button[role="radio"][data-size="${s.id}"]`).click();
          const unit = page.getByTestId('unit-price');
          await expect(unit).toContainText(fmt(s.price, lang));
          if (s.was) await expect(unit.locator('s')).toHaveText(fmt(s.was, lang));
          await expect(page.getByTestId('live-total')).toContainText(fmt(s.price, lang)); // default amount 1 kg / 1 pack
          await page.locator('.desktop-add [data-testid="add-to-cart"]').click();
          expected += s.price;
        }

        // Cart lines match the options added, and the drawer subtotal equals their offer prices.
        const lines = await cartSubtotal(page);
        expect(lines.map((l) => l.sizeId).sort()).toEqual(p.sizes.map((s) => s.id).sort());
        await page.locator('[data-testid="tab-cart"]').filter({ visible: true }).first().click();
        await expect(page.getByTestId('cart-subtotal')).toHaveText(fmt(expected, lang));
      });
    }

    test('discount badges show the percentage calculated from regular and offer price', async ({ page }) => {
      await page.goto(`/${lang}`);
      await settle(page);
      for (const p of products) {
        const cheapest = p.sizes.reduce((a, b) => (b.price < a.price ? b : a));
        const card = page.locator(`[data-testid="product-card"][data-product="${p.id}"]`);
        await expect(card.getByTestId('discount-badge')).toContainText(`${pct(cheapest.was!, cheapest.price)}%`);
        await expect(card.getByTestId('card-price')).toContainText(fmt(cheapest.price, lang));
      }
    });

    test('kg amounts: the customer types their own kg (and − / + still work); the live total follows', async ({ page }) => {
      await page.goto(`/${lang}/product/naimi-local`);
      await settle(page);
      const amount = page.getByTestId('amount-input');
      await expect(page.getByRole('button', { name: lang === 'ar' ? '2 كغ' : '2 kg', exact: true })).toHaveCount(0); // no quick buttons
      await amount.fill('1.3');
      await expect(page.getByTestId('live-total')).toContainText(fmt(89.7, lang)); // 1.3 × 69
      await amount.fill('٢٫٥'); // Arabic digits and decimal mark
      await expect(page.getByTestId('live-total')).toContainText(fmt(172.5, lang));
      await page.getByRole('button', { name: lang === 'ar' ? 'إنقاص الكمية' : 'Decrease quantity' }).first().click();
      await expect(page.getByTestId('live-total')).toContainText(fmt(138, lang)); // 2 kg
      await expect(page.getByTestId('live-total').locator('s')).toContainText(fmt(158, lang)); // regular 79 × 2
      // Out of range is clamped when the field loses focus.
      await amount.fill('80');
      await amount.blur();
      await expect(amount).toHaveValue('50');
      await amount.fill('0.2');
      await amount.blur();
      await expect(amount).toHaveValue('0.5');
    });

    test('a typed kg amount goes into the cart as typed', async ({ page }) => {
      await page.goto(`/${lang}/product/naimi-local`);
      await settle(page);
      await page.getByTestId('amount-input').fill('1.3');
      await page.getByTestId('amount-input').blur();
      await page.getByTestId('add-to-cart').filter({ visible: true }).first().click();
      const raw = await page.evaluate(() => JSON.parse(localStorage.getItem('hab-store-v1') ?? '{}'));
      expect(raw.lines?.[0]?.qty).toBe(1.3);
    });
  });
}

test('no product appears twice on the home page', async ({ page }) => {
  for (const lang of ['ar', 'en']) {
    await page.goto(`/${lang}`);
    await settle(page);
    const ids = await page.locator('main [data-testid="product-card"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-product')));
    expect(ids.length).toBe(products.length);
    expect(new Set(ids).size, lang).toBe(ids.length);
  }
});

test('cart line shows the chosen options (e.g. "Local Hawar Meat - Boneless - 2 kg - Mandi cut")', async ({ page }) => {
  await page.goto('/en/product/hawar-local');
  await settle(page);
  await page.locator('button[role="radio"][data-size="boneless"]').click();
  await page.getByTestId('amount-input').fill('2');
  await page.getByTestId('amount-input').blur();
  await page.locator('button[role="radio"][data-cut="mandi"]').click();
  await page.locator('.desktop-add [data-testid="add-to-cart"]').click();
  await page.locator('[data-testid="tab-cart"]').filter({ visible: true }).first().click();
  await expect(page.getByTestId('cart-line-label').first()).toHaveText('Boneless - 2 kg - Mandi cut');
  await expect(page.getByTestId('cart-line-total').first()).toHaveText('AED 138.00');
});

test('the live total never shows two numbers on top of each other while the amount changes', async ({ page }) => {
  await page.goto('/ar/product/najdi-local');
  await settle(page);
  const plus = page.getByRole('button', { name: 'زيادة الكمية' }).first();
  const seen: string[] = [];
  for (let i = 0; i < 6; i++) {
    await plus.click();
    for (let k = 0; k < 4; k++) {
      seen.push(await page.getByTestId('live-total').evaluate((el) => {
        const nums = el.querySelectorAll('.anim-num-in');
        return `${nums.length}:${el.textContent}`;
      }));
      await page.waitForTimeout(40);
    }
  }
  // Each sample: the price and the struck-through regular price, one value each (2 spans), never more.
  for (const s of seen) expect(Number(s.split(':')[0]), s).toBeLessThanOrEqual(2);
  await expect(page.getByTestId('live-total')).toContainText('276.00'); // 1 kg + 6 × 0.5 kg = 4 kg × 69
});
