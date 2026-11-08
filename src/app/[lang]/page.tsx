import type { Lang } from '@/config/site';
import { site } from '@/config/site';
import { products } from '@/data/catalog';
import { branches } from '@/data/places';
import { BranchCard } from '@/components/BranchCard';
import { ButtonLink } from '@/components/Button';
import { Hero } from '@/components/HomeParts';
import { HomeReviews } from '@/components/HomeReviews';
import { Reveal, SectionTitle } from '@/components/Motion';
import { ProductCard } from '@/components/ProductCard';
import { RewardsBand } from '@/components/RewardsBand';
import { SiteHeader } from '@/components/SiteHeader';
import { getDict } from '@/lib/i18n';
import { getReviews } from '@/lib/reviews';
import { fromPrice } from '@/lib/search';

/** Approved reviews appear within 5 minutes. */
export const revalidate = 300;

/**
 * Home: ticker (layout) → header → red hero (headline, delivery time, our specialties) → ALL products in one
 * grid (no category titles) → rewards band (only when switched on) → reviews → branches → footer (layout).
 */
export default async function Home({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  const t = getDict(lang);
  const reviews = await getReviews();

  // Structured data: the product list with prices, so search engines can show them.
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${site.url}/${lang}/product/${p.id}`,
      name: p.name[lang],
      item: {
        '@type': 'Product',
        name: p.name[lang],
        url: `${site.url}/${lang}/product/${p.id}`,
        offers: { '@type': 'Offer', priceCurrency: 'AED', price: fromPrice(p).toFixed(2), availability: p.stock === 'out' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock' },
      },
    })),
  };

  // The business itself. Phone/e-mail are added only once the real ones replace the TODO placeholders in site.ts.
  const real = (v: string) => !/0000000|example/.test(v);
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name[lang],
    alternateName: site.name[lang === 'ar' ? 'en' : 'ar'],
    url: `${site.url}/${lang}`,
    logo: `${site.url}/icons/icon-512.png`,
    ...(real(site.phone) ? { telephone: site.phone } : {}),
    ...(real(site.email) ? { email: site.email } : {}),
    department: branches.map((b) => ({
      '@type': 'Store',
      name: `${site.name[lang]} — ${b.name[lang]}`,
      address: { '@type': 'PostalAddress', streetAddress: b.address[lang], addressLocality: lang === 'ar' ? 'العين' : 'Al Ain', addressCountry: 'AE' },
      geo: { '@type': 'GeoCoordinates', latitude: b.lat, longitude: b.lng },
      ...(real(b.phone) ? { telephone: b.phone } : {}),
    })),
  };

  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero />

        <section id="products" className="container section" aria-labelledby="products-title">
          <h2 id="products-title" className="sr-only">{t.allProducts}</h2>
          <div className="grid grid-all" data-testid="product-grid">
            {products.map((p, i) => <Reveal key={p.id} index={i}><ProductCard p={p} priority={i < 2} /></Reveal>)}
          </div>
        </section>

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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([org, itemList]) }} />
      </main>
    </>
  );
}
