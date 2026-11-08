import type { Metadata } from 'next';
import { site, type Lang } from '@/config/site';
import { branches } from '@/data/places';
import { SiteHeader } from '@/components/SiteHeader';
import { BranchesWithMap, ContactForm, ContactTiles } from '@/components/StoresView';
import { getDict } from '@/lib/i18n';
import { alternates } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ lang: Lang }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = getDict(lang);
  return { title: t.storesTitle, description: t.storesSub, alternates: alternates(lang, '/stores') };
}

export default async function StoresPage({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  const t = getDict(lang);

  const jsonLd = branches.map((b) => ({
    '@context': 'https://schema.org',
    '@type': 'ButcherShop',
    name: `${site.name[lang]} — ${b.name[lang]}`,
    telephone: b.phone,
    address: { '@type': 'PostalAddress', streetAddress: b.address[lang], addressCountry: 'AE' },
    geo: { '@type': 'GeoCoordinates', latitude: b.lat, longitude: b.lng },
  }));

  return (
    <>
      <SiteHeader />
      <main id="main" className="container">
        <div className="page-title">
          <h1>{t.storesTitle}</h1>
          <p className="muted">{t.storesSub}</p>
        </div>

        <section className="section" style={{ paddingTop: 12 }} aria-labelledby="h-branches">
          <h2 id="h-branches" className="sr-only">{t.ourBranches}</h2>
          <BranchesWithMap />
        </section>

        <section className="section" aria-labelledby="h-contact">
          <div className="section-head"><h2 id="h-contact">{t.contactUs}</h2></div>
          <div className="stack" style={{ gap: 16 }}>
            <ContactTiles />
            <ContactForm />
          </div>
        </section>

        <section className="section faq-list" aria-labelledby="h-faq">
          <div className="section-head"><h2 id="h-faq">{t.faq}</h2></div>
          {t.faqs.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </main>
    </>
  );
}
