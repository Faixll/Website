/** Phone navigation: tab bar (Home, Cart, Profile — search was removed), profile → checkout prefill. */
import { expect, test } from '@playwright/test';
import { shopProducts } from '../src/data/shop';
import { settle, VIEWPORTS } from './helpers';

test.use({ viewport: VIEWPORTS.phone });

const tabs = (page: import('@playwright/test').Page) => page.getByTestId('tabbar').locator('.tab');

test('tab bar shows exactly 3 tabs (home, cart, profile) — no search', async ({ page }) => {
  for (const path of ['/ar', '/ar/profile']) {
    await page.goto(path);
    await settle(page);
    await expect(page.getByTestId('tabbar'), path).toBeVisible();
    await expect(tabs(page), path).toHaveCount(3);
    await expect(page.getByTestId('tabbar').locator('[data-tab="search"]')).toHaveCount(0);
  }
  await page.goto('/ar');
  await settle(page);
  await page.getByTestId('tabbar').locator('[data-tab="cart"]').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(tabs(page)).toHaveCount(3);
  await expect(page.getByTestId('tabbar').locator('[data-tab="cart"]')).toHaveAttribute('aria-current', 'page');
});

test('tab bar is hidden on product pages and checkout', async ({ page }) => {
  await page.goto('/ar/product/hawar-local');
  await settle(page);
  await expect(page.getByTestId('tabbar')).toBeHidden();
  await expect(page.getByTestId('action-bar')).toBeVisible();
  await page.goto('/ar/checkout');
  await settle(page);
  await expect(page.getByTestId('tabbar')).toBeHidden();
});

test('in Arabic, Home is the rightmost tab (from the layout direction); in English it is leftmost', async ({ page }) => {
  for (const [lang, rightmost] of [['ar', true], ['en', false]] as const) {
    await page.goto(`/${lang}`);
    await settle(page);
    const xs = await tabs(page).evaluateAll((els) => els.map((e) => ({ tab: e.getAttribute('data-tab'), x: e.getBoundingClientRect().x })));
    const home = xs.find((x) => x.tab === 'home')!.x;
    const others = xs.filter((x) => x.tab !== 'home').map((x) => x.x);
    if (rightmost) expect(home).toBeGreaterThan(Math.max(...others));
    else expect(home).toBeLessThan(Math.min(...others));
  }
});

test('the active tab is marked with aria-current="page"', async ({ page }) => {
  for (const [path, tab] of [['/ar', 'home'], ['/ar/profile', 'profile']]) {
    await page.goto(path);
    await settle(page);
    await expect(page.getByTestId('tabbar').locator(`[data-tab="${tab}"]`), path).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('tabbar').locator('[aria-current="page"]'), path).toHaveCount(1);
  }
});

test('cart count bubble updates after adding a product', async ({ page }) => {
  await page.goto('/ar');
  await settle(page);
  await expect(page.getByTestId('tabbar').getByTestId('cart-count')).toHaveCount(0);
  await page.getByTestId('quick-add').first().click();
  await expect(page.getByTestId('tabbar').getByTestId('cart-count')).toHaveText('1');
  await page.getByTestId('quick-add').nth(1).click();
  await expect(page.getByTestId('tabbar').getByTestId('cart-count')).toHaveText('2');
});

test('search was removed: no search box anywhere, and old /search links land on the product grid', async ({ page }) => {
  await page.goto('/ar/search?cat=sheep');
  await expect(page).toHaveURL((u) => u.pathname === '/ar' || u.pathname === '/ar/');
  await settle(page);
  await expect(page.locator('input[type="search"]')).toHaveCount(0);
  await expect(page.getByTestId('product-grid').locator('[data-testid="product-card"]')).toHaveCount(shopProducts.length);
});

test('Profile saves delivery details on this device and checkout prefills them', async ({ page }) => {
  await page.goto('/ar/profile');
  await settle(page);
  await expect(page.getByText('يُحفظ على هذا الجهاز فقط')).toBeVisible();
  await page.fill('#pf-name', 'Test Customer');
  await page.fill('#pf-phone', '0501234567');
  await page.selectOption('#pf-area', 'Al Jimi');
  await page.fill('#pf-street', 'Test Street');
  await page.fill('#pf-building', 'Villa 7');
  await page.getByRole('button', { name: 'حفظ البيانات' }).click();
  // add something so checkout renders its form
  await page.goto('/ar');
  await settle(page);
  await page.getByTestId('quick-add').first().click();
  await page.goto('/ar/checkout');
  await settle(page);
  await expect(page.locator('#co-name')).toHaveValue('Test Customer');
  await expect(page.locator('#co-phone')).toHaveValue('0501234567');
  await expect(page.locator('#co-area')).toHaveValue('Al Jimi');
  await expect(page.locator('#co-street')).toHaveValue('Test Street');
  await expect(page.locator('#co-building')).toHaveValue('Villa 7');
});
