import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests (tests/*.spec.ts). Node unit tests (tests/*.test.ts) run separately with `npm test`.
 * Uses the dev server on http://localhost:3000 (started automatically if it isn't running).
 */
export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.spec.ts',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 2,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    locale: 'ar-AE',
    timezoneId: 'Asia/Dubai',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/ar',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
