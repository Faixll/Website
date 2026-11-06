/**
 * P1: the page must scroll smoothly all the way to the footer.
 * Scrolls 700px at a time with real mouse-wheel events at phone width and checks:
 * (a) page height never changes by more than 2px between steps, (b) scrollY never goes backwards,
 * (c) the last step reaches the very bottom, (d) the last footer line is fully visible above the tab bar.
 */
import { expect, test, type Page } from '@playwright/test';
import { settle, VIEWPORTS } from './helpers';

const PAGES = ['/ar', '/en', '/ar/search?cat=sheep', '/ar/product/hawar-local'];

type Step = { y: number; h: number };

export async function wheelToBottom(page: Page) {
  await page.mouse.move(VIEWPORTS.phone.width / 2, VIEWPORTS.phone.height / 2);
  const read = () => page.evaluate(() => ({ y: Math.round(window.scrollY), h: document.documentElement.scrollHeight, vh: window.innerHeight }));
  const steps: Step[] = [];
  let s = await read();
  steps.push({ y: s.y, h: s.h });
  for (let i = 0; i < 80; i++) {
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(300);
    s = await read();
    steps.push({ y: s.y, h: s.h });
    if (s.y + s.vh >= s.h - 1) break;
  }
  return { steps, atBottom: s.y + s.vh >= s.h - 1 };
}

for (const path of PAGES) {
  test(`P1 scrolls to the very bottom: ${path}`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.phone);
    await page.goto(path);
    await settle(page);
    const { steps, atBottom } = await wheelToBottom(page);
    console.log(`P1 ${path}: ${steps.map((s) => `${s.y}/${s.h}`).join(' ')}`);

    for (let i = 1; i < steps.length; i++) {
      expect.soft(Math.abs(steps[i].h - steps[i - 1].h), `height change at step ${i}`).toBeLessThanOrEqual(2);
      expect.soft(steps[i].y, `scrollY went backwards at step ${i}`).toBeGreaterThanOrEqual(steps[i - 1].y);
    }
    expect(atBottom, 'reached the bottom').toBe(true);

    // The last footer line is fully visible above the tab bar (or the bottom of the screen when the bar is hidden).
    const { lineBottom, limit } = await page.evaluate(() => {
      const lines = document.querySelectorAll('footer .legal > *');
      const last = lines[lines.length - 1] as HTMLElement;
      const bar = document.querySelector('[data-testid="tabbar"]') as HTMLElement | null;
      const barTop = bar && getComputedStyle(bar).display !== 'none' ? bar.getBoundingClientRect().top : window.innerHeight;
      return { lineBottom: last.getBoundingClientRect().bottom, limit: barTop };
    });
    expect(lineBottom).toBeLessThanOrEqual(limit);
  });
}

/* ---------------------------------------------------------------------------
 * P1 matrix: the same journey with instant 300px steps at the five widths of
 * the brief, in both languages. Instant steps catch height shifts that a
 * 700px wheel step can hide, and they are quick enough to run ten times.
 * ------------------------------------------------------------------------- */
const WIDTHS: [number, number][] = [[360, 780], [390, 844], [430, 932], [768, 1024], [1280, 800]];

for (const [w, h] of WIDTHS) {
  for (const path of ['/ar', '/en']) {
    test(`P1 instant steps reach the bottom: ${path} ${w}x${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(path);
      await settle(page);
      const r = await page.evaluate(async () => {
        const de = document.documentElement;
        const pos: number[] = [];
        const heights: number[] = [de.scrollHeight];
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        await new Promise((res) => setTimeout(res, 400));
        for (let i = 0; i < 80; i++) {
          window.scrollBy({ top: 300, behavior: 'instant' as ScrollBehavior });
          await new Promise((res) => setTimeout(res, 200));
          pos.push(Math.round(window.scrollY));
          heights.push(de.scrollHeight);
          if (window.scrollY + window.innerHeight >= de.scrollHeight - 2) break;
        }
        return {
          pos,
          range: Math.max(...heights) - Math.min(...heights),
          atBottom: window.scrollY + window.innerHeight >= de.scrollHeight - 2,
          backward: pos.filter((p, i) => i > 0 && p < pos[i - 1]).length,
        };
      });
      console.log(`P1 matrix ${path} ${w}x${h}: ${r.pos.length} steps, last ${r.pos[r.pos.length - 1]}, height range ${r.range}, backward ${r.backward}`);
      expect(r.atBottom, 'reached the end').toBe(true);
      expect(r.backward, 'never pulled back').toBe(0);
      expect(r.range, 'page height stays stable').toBeLessThanOrEqual(4);
    });
  }
}

test('P1 the chip bar never calls scrollIntoView while the user scrolls', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __siv: number }).__siv = 0;
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...args: unknown[]) {
      (window as unknown as { __siv: number }).__siv++;
      return original.apply(this, args as never);
    };
  });
  await page.setViewportSize(VIEWPORTS.phone);
  await page.goto('/ar');
  await settle(page);
  for (let i = 0; i < 20; i++) {
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(150);
  }
  expect(await page.evaluate(() => (window as unknown as { __siv: number }).__siv)).toBe(0);
});

test('P1 no gap between the sticky header and the chip bar', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.phone);
  await page.goto('/ar');
  await settle(page);
  // The chip bar hides on the way down, so measure after scrolling back up a little.
  await page.evaluate(() => window.scrollTo({ top: 2500, behavior: 'instant' as ScrollBehavior }));
  await page.waitForTimeout(300);
  await page.mouse.move(VIEWPORTS.phone.width / 2, VIEWPORTS.phone.height / 2);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(600);
  const gap = await page.evaluate(() => {
    const header = document.querySelector('.site-header')!.getBoundingClientRect();
    const chips = document.querySelector('.chip-bar')!.getBoundingClientRect();
    return Math.round(chips.top - header.bottom);
  });
  expect(Math.abs(gap)).toBeLessThanOrEqual(1);
});

test('P1 the sticky top chrome is at most 100px once the header is away', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.phone);
  await page.goto('/ar');
  await settle(page);
  await page.mouse.move(VIEWPORTS.phone.width / 2, VIEWPORTS.phone.height / 2);
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(500);
  const covered = await page.evaluate(() => {
    const bars = ['.site-header', '.chip-bar']
      .map((s) => document.querySelector(s))
      .filter(Boolean)
      .map((el) => el!.getBoundingClientRect())
      .filter((r) => r.bottom > 0 && r.top < 1);
    return bars.length ? Math.round(Math.max(...bars.map((r) => r.bottom))) : 0;
  });
  console.log(`P1 sticky top chrome while scrolling down: ${covered}px`);
  expect(covered).toBeLessThanOrEqual(100);
});
