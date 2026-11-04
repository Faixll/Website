/* Shared helpers for the Playwright tests. */
import { expect, type Page } from '@playwright/test';

export const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
} as const;
export type ViewportName = keyof typeof VIEWPORTS;

/** Screenshot folder: QA_SHOTS=before for the audit run, "after" otherwise. */
export const SHOTS = `qa-screenshots/${process.env.QA_SHOTS === 'before' ? 'before' : 'after'}`;

/** Waits for the page and its fonts to settle. */
export async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

/** Adds the default option of a product to the cart through the UI (works in both languages). */
export async function addToCartFromProduct(page: Page, lang: 'ar' | 'en', id = 'hawar-local') {
  await page.goto(`/${lang}/product/${id}`);
  await settle(page);
  const btn = page.getByRole('button', { name: lang === 'ar' ? /أضف إلى السلة/ : /Add to cart/ }).filter({ visible: true }).first();
  await btn.click();
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('hab-store-v1') ?? '{}').lines?.length ?? 0)).toBeGreaterThan(0);
}

/** Collects console errors, page errors and failed same-origin requests. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.on('response', (r) => {
    const u = new URL(r.url());
    if (u.origin === 'http://localhost:3000' && r.status() >= 400) errors.push(`HTTP ${r.status()}: ${u.pathname}`);
  });
  page.on('requestfailed', (r) => {
    const u = new URL(r.url());
    if (u.origin === 'http://localhost:3000' && !/ERR_ABORTED/.test(r.failure()?.errorText ?? '')) errors.push(`failed: ${u.pathname} ${r.failure()?.errorText}`);
  });
  return errors;
}

/** Runs in the browser: page overflow, broken images, small tap targets, low-contrast text, Arabic text on /en. */
export async function auditPage(page: Page, opts: { phone: boolean; english: boolean }) {
  return page.evaluate(({ phone, english }) => {
    const out = { overflow: 0, brokenImages: [] as string[], smallTargets: [] as string[], lowContrast: [] as string[], arabicOnEnglish: [] as string[] };
    const de = document.documentElement;
    out.overflow = de.scrollWidth - de.clientWidth;

    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05;
    };
    const inert = (el: Element) => !!el.closest('.sr-only, .skip, [aria-hidden="true"], [inert], nextjs-portal');

    for (const img of Array.from(document.images)) {
      if (img.loading === 'lazy' && !img.complete) continue;
      if (img.complete && img.naturalWidth === 0 && visible(img)) out.brokenImages.push(img.currentSrc || img.src);
    }

    if (phone) {
      for (const el of Array.from(document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=tab], [role=button]'))) {
        if (!visible(el) || inert(el)) continue;
        // Inputs hidden inside styled option cards are measured through their label.
        if (el.matches('input[type=radio], input[type=checkbox]') && el.closest('label')) continue;
        // Inline links inside running text are exempt (WCAG 2.5.8).
        if (el.matches('a') && el.closest('p') && !el.matches('.btn, .chip')) continue;
        const r = el.getBoundingClientRect();
        if (r.height < 43.5 || r.width < 43.5) {
          const label = (el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.getAttribute('href') || el.tagName).trim().slice(0, 40);
          out.smallTargets.push(`${el.tagName.toLowerCase()} "${label}" ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      }
    }

    // Contrast: text colour vs the nearest solid background (skips text over gradients/images).
    const parse = (c: string) => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 1]; };
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const blend = (fg: number[], bg: number[]) => { const a = fg[3] ?? 1; return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)); };
    const bgOf = (el: Element | null): number[] | null => {
      const layers: number[][] = [];
      for (let e = el; e; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (s.backgroundImage !== 'none') return null;
        const c = parse(s.backgroundColor);
        if ((c[3] ?? 1) > 0) { layers.push(c); if ((c[3] ?? 1) >= 1) break; }
      }
      let base = [255, 255, 255];
      for (const l of layers.reverse()) base = blend(l, base);
      return base;
    };
    const seen = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent?.trim();
      const el = n.parentElement;
      if (!text || !el || !visible(el) || inert(el) || el.closest('svg, script, style, s, del')) continue;
      if (el.closest('[disabled], :disabled, .seg:disabled')) continue; // disabled controls are exempt
      const s = getComputedStyle(el);
      const bg = bgOf(el);
      if (!bg) continue;
      const fg = blend(parse(s.color), bg);
      const L1 = lum(fg), L2 = lum(bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const size = parseFloat(s.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5)) {
        const key = `${s.color} on ${bg.map(Math.round).join(',')}`;
        if (!seen.has(key)) { seen.add(key); out.lowContrast.push(`${ratio.toFixed(2)}:1 "${text.slice(0, 30)}" (${key})`); }
      }
      if (english && /[؀-ۿ]/.test(text) && !el.closest('[lang="ar"]')) out.arabicOnEnglish.push(text.slice(0, 40));
    }
    return out;
  }, opts);
}

/** Internal links on the page (for the 404 check). */
export async function internalLinks(page: Page) {
  return page.evaluate(() => Array.from(new Set(Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .map((a) => a.href).filter((h) => h.startsWith(location.origin)).map((h) => h.split('#')[0]))));
}
