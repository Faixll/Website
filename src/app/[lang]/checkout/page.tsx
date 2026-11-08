import type { Metadata } from 'next';
import Link from 'next/link';
import { site, type Lang } from '@/config/site';
import { Checkout } from '@/components/Checkout';
import { getDict } from '@/lib/i18n';

export async function generateMetadata({ params }: { params: Promise<{ lang: Lang }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(lang).checkoutTitle, robots: { index: false } };
}

export default async function CheckoutPage({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  const t = getDict(lang);
  return (
    <>
      {/* Focused header: no search or category tabs during checkout. */}
      <header className="header">
        <div className="container">
          <Link href={`/${lang}`} className="logo" aria-label={site.name[lang]}>
            <span className="mark" aria-hidden style={{ backgroundImage: `url(${site.brand.mark})` }} />
            <span className="name"><b>{site.shortName[lang]}</b></span>
          </Link>
          <p className="secure" style={{ marginInlineStart: 'auto' }}>{t.secure}</p>
        </div>
      </header>
      <main id="main" className="container">
        <div className="page-title"><h1>{t.checkoutTitle}</h1></div>
        <Checkout />
      </main>
    </>
  );
}
