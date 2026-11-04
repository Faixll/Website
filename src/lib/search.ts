import type { Lang } from '@/config/site';
import { categories, products, type CategoryId, type Product } from '@/data/catalog';

/** Normalise Arabic/English text for forgiving matching (alef/ya/ta-marbuta forms, diacritics, case). */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '') // tashkeel + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function score(p: Product, q: string): number {
  if (!q) return 1;
  const terms = q.split(' ');
  const hay = norm([p.name.ar, p.name.en, p.desc.ar, p.desc.en, ...categories.filter((c) => c.id === p.category).flatMap((c) => [c.name.ar, c.name.en])].join(' '));
  const names = norm(p.name.ar + ' ' + p.name.en);
  let s = 0;
  for (const t of terms) {
    if (!hay.includes(t)) return 0;
    s += names.includes(t) ? 3 : 1;
    if (names.split(' ').some((w) => w.startsWith(t))) s += 2;
  }
  return s;
}

export function searchProducts(query: string): Product[] {
  const q = norm(query);
  return products
    .map((p) => ({ p, s: score(p, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);
}

export function searchCategories(query: string, lang: Lang) {
  const q = norm(query);
  if (!q) return [];
  return categories.filter((c) => norm(c.name.ar + ' ' + c.name.en).includes(q)).map((c) => ({ id: c.id, name: c.name[lang] }));
}

export type Filters = {
  q: string;
  cat: CategoryId | '';
  storage: '' | 'fresh' | 'frozen';
  min: number | null;
  max: number | null;
  inStock: boolean;
  sort: 'relevance' | 'price-asc' | 'price-desc' | 'name';
};

export const fromPrice = (p: Product) => Math.min(...p.sizes.map((s) => s.price));
/** The cheapest size (used for "from" prices and its crossed-out normal price). */
export const fromSize = (p: Product) => p.sizes.reduce((a, b) => (b.price < a.price ? b : a));

export function applyFilters(f: Filters, lang: Lang): Product[] {
  let list = searchProducts(f.q);
  if (f.cat) list = list.filter((p) => p.category === f.cat);
  if (f.storage) list = list.filter((p) => p.storage === f.storage);
  if (f.min != null) list = list.filter((p) => fromPrice(p) >= f.min!);
  if (f.max != null) list = list.filter((p) => fromPrice(p) <= f.max!);
  if (f.inStock) list = list.filter((p) => p.stock !== 'out');
  if (f.sort === 'price-asc') list = [...list].sort((a, b) => fromPrice(a) - fromPrice(b));
  if (f.sort === 'price-desc') list = [...list].sort((a, b) => fromPrice(b) - fromPrice(a));
  if (f.sort === 'name') list = [...list].sort((a, b) => a.name[lang].localeCompare(b.name[lang], lang));
  return list;
}
