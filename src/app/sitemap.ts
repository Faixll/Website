import type { MetadataRoute } from 'next';
import { site } from '@/config/site';
import { shopProducts as products } from '@/data/shop';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['', '/stores', '/terms', '/privacy', '/refund', ...products.map((p) => `/product/${p.id}`)];
  return paths.flatMap((path) => (['ar', 'en'] as const).map((lang) => ({
    url: `${site.url}/${lang}${path}`,
    changeFrequency: path.startsWith('/product') || path === '' ? ('daily' as const) : ('monthly' as const),
    priority: path === '' ? 1 : path.startsWith('/product') ? 0.8 : 0.3,
    alternates: { languages: { ar: `${site.url}/ar${path}`, en: `${site.url}/en${path}` } },
  })));
}
