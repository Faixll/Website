import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LANGS, site, type Lang } from '@/config/site';
import { productById, products } from '@/data/catalog';
import { Reveal, SectionTitle } from '@/components/Motion';
import { ProductReviews } from '@/components/ProductReviews';
import { ProductCard } from '@/components/ProductCard';
import { ProductConfigurator } from '@/components/ProductConfigurator';
import { ProductImage } from '@/components/ProductImage';
import { SiteHeader } from '@/components/SiteHeader';
import { getDict } from '@/lib/i18n';
import { alternates } from '@/lib/seo';
import { getReviews } from '@/lib/reviews';
import { fromPrice } from '@/lib/search';

type Params = Promise<{ lang: Lang; id: string }>;

/** Approved reviews appear within 5 minutes. */
export const revalidate = 300;

export function generateStaticParams() {
  return LANGS.flatMap((lang) => products.map((p) => ({ lang, id: p.id })));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, id } = await params;
  const p = productById(id);
  if (!p) return {};
  return {
    title: p.name[lang],
    description: p.desc[lang],
    alternates: alternates(lang, `/product/${id}`),
    ...(p.image ? { openGraph: { images: [p.image.src] } } : {}),
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { lang, id } = await params;
  const p = productById(id);
  if (!p) notFound();
  const t = getDict(lang);
  const related = products.filter((x) => x.category === p.category && x.id !== p.id).concat(products.filter((x) => x.category !== p.category)).slice(0, 4);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name[lang],
    description: p.desc[lang],
    ...(p.image ? { image: p.image.src } : {}),
    brand: site.name[lang],
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'AED',
      lowPrice: fromPrice(p).toFixed(2),
      highPrice: Math.max(...p.sizes.map((s) => s.price)).toFixed(2),
      availability: p.stock === 'out' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    },
  };

  return (
    <>
      <SiteHeader />
      <main id="main" className="container">
        <nav className="breadcrumb" aria-label="breadcrumb">
          <Link href={`/${lang}`}>{t.home}</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">{p.name[lang]}</span>
        </nav>
        <div className="pdp">
          <div className="pdp-photo">
            <ProductImage p={p} lang={lang} sizes="(min-width: 900px) 50vw, 100vw" priority large />
          </div>
          <ProductConfigurator p={p} />
        </div>

        <section className="section" style={{ paddingBottom: 0 }} aria-label={t.reviewsTitle}>
          <ProductReviews data={await getReviews(p.id)} productId={p.id} />
        </section>

        {related.length > 0 && (
          <section className="section" aria-labelledby="related">
            <div className="section-head"><SectionTitle id="related">{t.related}</SectionTitle></div>
            <div className="grid">{related.map((r, i) => <Reveal key={r.id} index={i}><ProductCard p={r} /></Reveal>)}</div>
          </section>
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </main>
    </>
  );
}
