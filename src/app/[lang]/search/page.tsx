import type { Metadata } from 'next';
import type { Lang } from '@/config/site';
import { categories, type CategoryId } from '@/data/catalog';
import { CategoryTabs, Header } from '@/components/Layout';
import { SearchResults } from '@/components/SearchResults';
import { getDict } from '@/lib/i18n';
import type { Filters } from '@/lib/search';

type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ lang: Lang }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(lang).results, robots: { index: false } };
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const numOrNull = (v: string) => (v !== '' && Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : null);

export default async function SearchPage({ params, searchParams }: { params: Promise<{ lang: Lang }>; searchParams: SP }) {
  const { lang } = await params;
  const sp = await searchParams;
  const cat = one(sp.cat);
  const storage = one(sp.storage);
  const sort = one(sp.sort);
  const filters: Filters = {
    q: one(sp.q).slice(0, 80),
    cat: categories.some((c) => c.id === cat) ? (cat as CategoryId) : '',
    storage: storage === 'fresh' || storage === 'frozen' ? storage : '',
    min: numOrNull(one(sp.min)),
    max: numOrNull(one(sp.max)),
    inStock: one(sp.stock) === '1',
    sort: (['price-asc', 'price-desc', 'name'] as const).find((s) => s === sort) ?? 'relevance',
  };

  return (
    <>
      <Header lang={lang} q={filters.q} />
      <CategoryTabs lang={lang} active={filters.cat || (filters.q ? undefined : 'all')} />
      <main id="main" className="container section">
        <SearchResults initial={filters} />
      </main>
    </>
  );
}
