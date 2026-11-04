/**
 * Hero video (section 6.1). The video switches on only when all six files are in public/hero.
 * Until then the hero shows the moving placeholder — never an empty box.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { settle } from './helpers';

const DIR = path.join(process.cwd(), 'public', 'hero');
const FILES = ['hero-portrait-720.mp4', 'hero-portrait-720.webm', 'poster-portrait.jpg', 'hero-landscape-720.mp4', 'hero-landscape-720.webm', 'poster-landscape.jpg'];
const hasVideo = FILES.every((f) => fs.existsSync(path.join(DIR, f)));

test.describe('without the video files', () => {
  test.skip(hasVideo, 'video files are present');

  test('the hero shows the animated placeholder with the logo mark, and requests no video', async ({ page }) => {
    const requested: string[] = [];
    page.on('request', (r) => { if (/\/hero\//.test(r.url())) requested.push(r.url()); });
    await page.goto('/ar');
    await settle(page);
    await expect(page.getByTestId('hero-placeholder')).toBeVisible();
    expect(await page.locator('video').count()).toBe(0);
    expect(requested).toEqual([]);
  });
});

test.describe('with the video files', () => {
  test.skip(!hasVideo, 'add the six files to public/hero to run these');

  test('every video file is under 2.5 MB', () => {
    for (const f of FILES.filter((x) => /\.(mp4|webm)$/.test(x))) {
      expect(fs.statSync(path.join(DIR, f)).size, f).toBeLessThan(2.5 * 1024 * 1024);
    }
  });

  for (const [name, vp, want] of [['phone', { width: 390, height: 844 }, 'portrait'], ['desktop', { width: 1280, height: 800 }, 'landscape']] as const) {
    test(`${name}: poster first, then the ${want} video plays muted inline`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto('/ar');
      await expect(page.locator('.hero-media img.poster')).toBeVisible();
      const video = page.getByTestId('hero-video');
      await expect(video).toHaveCount(1);
      const src = await video.evaluate((v: HTMLVideoElement) => v.currentSrc || v.querySelector('source')!.getAttribute('src'));
      expect(src).toContain(want);
      expect(await video.evaluate((v: HTMLVideoElement) => v.muted && v.playsInline && v.loop)).toBe(true);
    });
  }

  test('pauses when scrolled off-screen', async ({ page }) => {
    await page.goto('/ar');
    await settle(page);
    await page.evaluate(() => window.scrollTo(0, 3000));
    await page.waitForTimeout(500);
    expect(await page.getByTestId('hero-video').evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  });

  test('reduced motion: no video, the poster gets a slow zoom instead', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/ar');
    await settle(page);
    expect(await page.locator('video').count()).toBe(0);
    await expect(page.locator('.hero-media img.poster')).toBeVisible();
  });
});
