import Link from 'next/link';
import type { Lang } from '@/config/site';
import { categories, products } from '@/data/catalog';
import { branches } from '@/data/places';
import { BranchCard } from '@/components/BranchCard';
import { CategoryChips, Hero } from '@/components/HomeParts';
import { TrustStrip } from '@/components/Layout';
import { Reveal } from '@/components/Motion';
import { ProductCard } from '@/components/ProductCard';
import { SiteHeader } from '@/components/SiteHeader';
import { getDict } from '@/lib/i18n';

export default async function Home({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  const t = getDict(lang);
  const sections = categories.map((c) => ({ c, items: products.filter((p) => p.category === c.id) })).filter((s) => s.items.length);
  // No product appears twice on the home page: "Most ordered" only shows popular products that are
  // not already listed in a category section below (so with today's catalogue it stays hidden).
  const inSections = new Set(sections.flatMap((s) => s.items.map((p) => p.id)));
  const mostOrdered = products.filter((p) => p.popular && !inSections.has(p.id));

  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero />

        <section className="container section" style={{ paddingBottom: 0 }} aria-label={t.trust3[0][0]}>
          <TrustStrip lang={lang} />
        </section>

        <div style={{ marginTop: 'var(--s6)' }}>
          <CategoryChips mode="scroll" sticky />
        </div>

        {mostOrdered.length > 0 && (
          <section className="container section" aria-labelledby="most-ordered">
            <div className="section-head"><h2 id="most-ordered">{t.mostOrdered}</h2></div>
            <div className="hscroll row">
              {mostOrdered.map((p, i) => <Reveal key={p.id} index={i}><ProductCard p={p} /></Reveal>)}
            </div>
          </section>
        )}

        {sections.map(({ c, items }, si) => (
          <section key={c.id} id={`cat-${c.id}`} className={`container section${si > 0 ? ' cv' : ''}`} aria-labelledby={`h-${c.id}`}>
            <div className="section-head">
              <h2 id={`h-${c.id}`}>{c.name[lang]}</h2>
              <Link className="see-all" href={`/${lang}/search?cat=${c.id}`}>{t.seeAllCat}</Link>
            </div>
            <div className="grid">
              {items.map((p, i) => <Reveal key={p.id} index={i}><ProductCard p={p} priority={si === 0 && i < 2} /></Reveal>)}
            </div>
          </section>
        ))}

        <section className="container section cv" aria-labelledby="branches">
          <div className="section-head">
            <h2 id="branches">{t.ourBranches}</h2>
            <Link className="see-all" href={`/${lang}/stores`}>{t.allBranches}</Link>
          </div>
          <div className="branches">
            {branches.map((b) => <BranchCard key={b.id} b={b} />)}
          </div>
        </section>
      </main>
    </>
  );
}
