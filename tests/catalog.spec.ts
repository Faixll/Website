/** Every product and option: offer price shown, discount badge right, cart total right, both languages. */
import { expect, test } from '@playwright/test';
import { products } from '../src/data/catalog';
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
        await page.getByTestId('open-cart').click();
        await expect(page.getByTestId('cart-subtotal')).toHaveText(fmt(expected, lang));
      });
    }

    test('discount badges show the percentage calculated from regular and offer price', async ({ page }) => {
      await page.goto(`/${lang}/search`);
      await settle(page);
      for (const p of products) {
        const cheapest = p.sizes.reduce((a, b) => (b.price < a.price ? b : a));
        const card = page.locator(`[data-testid="product-card"][data-product="${p.id}"]`);
        await expect(card.getByTestId('discount-badge')).toContainText(`${pct(cheapest.was!, cheapest.price)}%`);
        await expect(card.getByTestId('card-price')).toContainText(fmt(cheapest.price, lang));
      }
    });

    test('kg amounts: 0.5 steps and quick buttons update the live total', async ({ page }) => {
      await page.goto(`/${lang}/product/naimi-local`);
      await settle(page);
      await page.getByRole('button', { name: lang === 'ar' ? '2 كغ' : '2 kg', exact: true }).click();
      await expect(page.getByTestId('live-total')).toContainText(fmt(138, lang));
      await page.getByRole('button', { name: lang === 'ar' ? 'إنقاص الكمية' : 'Decrease quantity' }).first().click();
      await expect(page.getByTestId('live-total')).toContainText(fmt(103.5, lang));
      await expect(page.getByTestId('live-total').locator('s')).toContainText(fmt(118.5, lang));
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
  await page.getByRole('button', { name: '2 kg', exact: true }).click();
  await page.locator('button[role="radio"][data-cut="mandi"]').click();
  await page.locator('.desktop-add [data-testid="add-to-cart"]').click();
  await page.getByTestId('open-cart').click();
  await expect(page.getByTestId('cart-line-label').first()).toHaveText('Boneless - 2 kg - Mandi cut');
  await expect(page.getByTestId('cart-line-total').first()).toHaveText('AED 138.00');
});
