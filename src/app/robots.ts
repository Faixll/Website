import type { MetadataRoute } from 'next';

/** Staff pages and APIs are never indexed. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }] };
}
