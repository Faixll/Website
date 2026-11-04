import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LANGS, site, type Lang } from '@/config/site';
import { categoryName, productById, productImage, products } from '@/data/catalog';
import { Header } from '@/components/Layout';
import { ProductCard } from '@/components/ProductCard';
import { ProductConfigurator } from '@/components/ProductConfigurator';
import { getDict } from '@/lib/i18n';
import { fromPrice } from '@/lib/search';

type Params = Promise<{ lang: Lang; id: string }>;

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
    alternates: { languages: { ar: `/ar/product/${id}`, en: `/en/product/${id}` } },
    openGraph: { images: [productImage(p)] },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { lang, id } = await params;
  const p = productById(id);
  if (!p) notFound();
  const t = getDict(lang);
  const same = products.filter((x) => x.category === p.category && x.id !== p.id);
  const related = [...same, ...products.filter((x) => x.popular && x.category !== p.category)].slice(0, 4);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name[lang],
    description: p.desc[lang],
    image: productImage(p),
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
      <Header lang={lang} />
      <main id="main" className="container">
        <nav className="breadcrumb" aria-label="breadcrumb">
          <Link href={`/${lang}`}>{t.home}</Link>
          <span aria-hidden>/</span>
          <Link href={`/${lang}/search?cat=${p.category}`}>{categoryName(p.category, lang)}</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">{p.name[lang]}</span>
        </nav>
        <div className="pdp">
          <div className="gallery">
            <img src={productImage(p)} alt={p.name[lang]} width={800} height={800} fetchPriority="high" />
          </div>
          <ProductConfigurator p={p} />
        </div>

        {related.length > 0 && (
          <section className="section" aria-labelledby="related">
            <div className="section-head"><h2 id="related">{t.related}</h2></div>
            <div className="grid">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
          </section>
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </main>
    </>
  );
}
