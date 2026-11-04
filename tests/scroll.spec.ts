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
