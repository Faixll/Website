import Link from 'next/link';
import type { Lang } from '@/config/site';
import { branches } from '@/data/places';
import { categories, products } from '@/data/catalog';
import { BranchCard } from '@/components/BranchCard';
import { HeroPicker, ReorderStrip } from '@/components/HomeParts';
import { CategoryTabs, Header, TrustRow } from '@/components/Layout';
import { ProductCard } from '@/components/ProductCard';
import { getDict } from '@/lib/i18n';

export default async function Home({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  const t = getDict(lang);
  const popular = products.filter((p) => p.popular).slice(0, 4);
  const byCat = categories.map((c) => ({ c, items: products.filter((p) => p.category === c.id) }));

  return (
    <>
      <Header lang={lang} />
      <CategoryTabs lang={lang} active="all" />
      <main id="main">
        <section className="container hero">
          <div className="hero-card">
            <div className="stack">
              <h1>{t.heroTitle}</h1>
              <p>{t.heroSub}</p>
            </div>
            <HeroPicker />
          </div>
        </section>

        <ReorderStrip />

        <section className="container section" aria-labelledby="popular">
          <div className="section-head">
            <h2 id="popular">{lang === 'ar' ? 'الأكثر طلباً' : 'Most ordered'}</h2>
            <Link href={`/${lang}/search`}>{t.allProducts}</Link>
          </div>
          <div className="grid">
            {popular.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 2} />)}
          </div>
        </section>

        {byCat.map(({ c, items }) => (
          <section key={c.id} className="container section" style={{ paddingTop: 0 }} aria-labelledby={`cat-${c.id}`}>
            <div className="section-head">
              <h2 id={`cat-${c.id}`}>{c.name[lang]}</h2>
              <Link href={`/${lang}/search?cat=${c.id}`}>{t.allProducts}</Link>
            </div>
            <div className="grid">
              {items.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          </section>
        ))}

        <section className="container section" aria-label={t.trust[0][0]}>
          <TrustRow lang={lang} />
        </section>

        <section className="container section" aria-labelledby="branches">
          <div className="section-head">
            <h2 id="branches">{t.ourBranches}</h2>
            <Link href={`/${lang}/stores`}>{t.allBranches}</Link>
          </div>
          <div className="branches four">
            {branches.map((b) => <BranchCard key={b.id} b={b} />)}
          </div>
        </section>
      </main>
    </>
  );
}
