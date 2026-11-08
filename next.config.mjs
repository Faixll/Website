import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dev = process.env.NODE_ENV !== 'production';

/**
 * Content-Security-Policy. Only the outside services the shop really uses are allowed:
 * Stripe (card / Apple Pay / Google Pay), OpenStreetMap (branch map), and the three ad/analytics
 * tags (Google Analytics 4, Meta Pixel, TikTok Pixel) which only load when their IDs are set.
 * 'unsafe-inline' is needed for Next's inline bootstrap and the JSON-LD on statically built pages.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''} https://js.stripe.com https://www.googletagmanager.com https://connect.facebook.net https://analytics.tiktok.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? ' ws: wss:' : ''} https://api.stripe.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net https://analytics.tiktok.com https://*.tiktokw.us`,
  'frame-src https://js.stripe.com https://hooks.stripe.com https://www.openstreetmap.org',
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const security = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")' },
];

/** Files in /public don't have hashed names, so they get a day in the browser cache (plus a week of
 *  stale-while-revalidate); Next's own /_next/static files are already cached for a year by Next. */
const publicCache = [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the project root (a stray package-lock.json in the home folder confuses auto-detection).
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  poweredByHeader: false,
  async redirects() {
    // Arabic is the default language.
    return [
      { source: '/', destination: '/ar', permanent: false },
      // Search was removed: every product is on the home page.
      { source: '/:lang(ar|en)/search', destination: '/:lang#products', permanent: true },
    ];
  },
  async headers() {
    return [
      { source: '/:path*', headers: security },
      { source: '/brand/:file*', headers: publicCache },
      { source: '/icons/:file*', headers: publicCache },
      { source: '/images/:file*', headers: publicCache },
      { source: '/favicon.ico', headers: publicCache },
    ];
  },
  experimental: {
    // Tree-shake the icon set and motion so pages only ship what they use.
    optimizePackageImports: ['@phosphor-icons/react', 'motion'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
};

export default nextConfig;
