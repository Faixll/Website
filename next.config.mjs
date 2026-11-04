import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the project root (a stray package-lock.json in the home folder confuses auto-detection).
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  async redirects() {
    // Arabic is the default language.
    return [{ source: '/', destination: '/ar', permanent: false }];
  },
  experimental: {
    // Tree-shake the icon set and motion so pages only ship what they use.
    optimizePackageImports: ['@phosphor-icons/react', 'motion'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
