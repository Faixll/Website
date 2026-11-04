import type { Lang } from '@/config/site';
import { categories, products } from '@/data/catalog';
import { branches } from '@/data/places';
import { BranchCard } from '@/components/BranchCard';
import { ButtonLink } from '@/components/Button';
import { CategoryChips } from '@/components/Chips';
import { Hero, TrustRow } from '@/components/HomeParts';
import { Reveal, SectionTitle } from '@/components/Motion';
import { ProductCard } from '@/components/ProductCard';
import { HomeReviews } from '@/components/HomeReviews';
import { RewardsBand } from '@/components/RewardsBand';
import { SiteHeader } from '@/components/SiteHeader';
import { getDict } from '@/lib/i18n';
import { getReviews } from '@/lib/reviews';
import { heroVideoReady } from '@/lib/server/hero';

/**
 * Home, one job per screen: ticker (layout) → header → live hero → delivery card → trust row → category chips
 * → "Most ordered" red band (only products not repeated below) → one section per category → rewards band (flag)
 * → reviews → branch teaser → footer (layout).
 */
export default async function Home({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  const t = getDict(lang);
  const sections = categories.map((c) => ({ c, items: products.filter((p) => p.category === c.id) })).filter((s) => s.items.length);
  // No product appears twice: "Most ordered" only takes popular products not listed in a category section below.
  const inSections = new Set(sections.flatMap((s) => s.items.map((p) => p.id)));
  const mostOrdered = products.filter((p) => p.popular && !inSections.has(p.id));
  const reviews = await getReviews();

  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero hasVideo={heroVideoReady()} />

        <section className="container" style={{ paddingBlock: 'var(--s5)' }} aria-label={t.trust3.map((x) => x[0]).join('، ')}>
          <TrustRow />
        </section>

        {/* Direct child of <main> so it can stay stuck under the header for the whole page. */}
        <CategoryChips mode="scroll" sticky />

        {mostOrdered.length > 0 && (
          <section className="band-red section" aria-labelledby="most-ordered">
            <div className="container">
              <div className="section-head"><SectionTitle id="most-ordered">{t.mostOrdered}</SectionTitle></div>
              <div className="hscroll row">
                {mostOrdered.map((p, i) => <Reveal key={p.id} index={i}><ProductCard p={p} /></Reveal>)}
              </div>
            </div>
          </section>
        )}

        {sections.map(({ c, items }, si) => (
          <section key={c.id} id={`cat-${c.id}`} className="container section" style={si > 0 ? { paddingTop: 0 } : undefined} aria-labelledby={`h-${c.id}`}>
            <div className="section-head">
              <SectionTitle id={`h-${c.id}`}>{c.name[lang]}</SectionTitle>
              <ButtonLink href={`/${lang}/search?cat=${c.id}`} variant="ghost">{t.seeAllCat}</ButtonLink>
            </div>
            <div className="grid">
              {items.map((p, i) => <Reveal key={p.id} index={i}><ProductCard p={p} priority={si === 0 && i < 2} /></Reveal>)}
            </div>
          </section>
        ))}

        <RewardsBand />

        <section className="band-surface section" aria-label={t.reviewsHome}>
          <div className="container"><HomeReviews data={reviews} /></div>
        </section>

        <section className="band-deep section" aria-labelledby="branches">
          <div className="container">
            <div className="section-head">
              <SectionTitle id="branches">{t.ourBranches}</SectionTitle>
              <ButtonLink href={`/${lang}/stores`} variant="ghost">{t.allBranches}</ButtonLink>
            </div>
            <div className="branches">
              {branches.map((b) => <BranchCard key={b.id} b={b} />)}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
