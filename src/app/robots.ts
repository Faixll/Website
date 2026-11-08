import type { MetadataRoute } from 'next';
import { site } from '@/config/site';

/** Staff pages and APIs are never indexed. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }], sitemap: `${site.url}/sitemap.xml`, host: site.url };
}
