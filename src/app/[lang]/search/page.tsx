import type { Metadata } from 'next';
import type { Lang } from '@/config/site';
import { categories, type CategoryId } from '@/data/catalog';
import { SearchResults } from '@/components/SearchResults';
import { SiteHeader } from '@/components/SiteHeader';
import { getDict } from '@/lib/i18n';
import type { Filters } from '@/lib/search';

type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ lang: Lang }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(lang).results, robots: { index: false } };
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function SearchPage({ params, searchParams }: { params: Promise<{ lang: Lang }>; searchParams: SP }) {
  await params;
  const sp = await searchParams;
  const cat = one(sp.cat);
  const sort = one(sp.sort);
  const filters: Filters = {
    q: one(sp.q).slice(0, 80),
    cat: categories.some((c) => c.id === cat) ? (cat as CategoryId) : '',
    storage: '',
    min: null,
    max: null,
    inStock: false,
    sort: (['price-asc', 'price-desc', 'name'] as const).find((s) => s === sort) ?? 'relevance',
  };

  return (
    <>
      <SiteHeader activeCat={filters.cat || undefined} />
      <main id="main" className="container section" style={{ paddingTop: 'var(--s5)' }}>
        <SearchResults initial={filters} autoFocus={one(sp.focus) === '1'} />
      </main>
    </>
  );
}
