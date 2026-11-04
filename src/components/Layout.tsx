/* Server-rendered layout pieces: announcement ticker and footer. The header is in SiteHeader.tsx. */
import Link from 'next/link';
import { instagramUrl, site, type Lang } from '@/config/site';
import { categories } from '@/data/catalog';
import { phoneDisplay, waLink } from '@/lib/format';
import { getDict } from '@/lib/i18n';
import { Icon, type IconName } from './Icon';

/** Thin black ticker that scrolls away with the page. Rotates the real messages; pauses on hover/touch; under
 *  reduced motion it is static and shows only the first message. */
export function Ticker({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  const icons: IconName[] = ['truck', 'seal', 'snow'];
  return (
    <div className="ticker" data-testid="announcement" role="region" aria-label={t.ticker[0]}>
      <div className="ticker-track">
        {t.ticker.map((m, i) => (
          <span key={m} className="ticker-item" aria-hidden={i > 0 || undefined}><Icon name={icons[i]} size={16} />{m}</span>
        ))}
      </div>
    </div>
  );
}

export function PayIcons() {
  return (
    <div className="pay-icons" aria-label="Apple Pay, Google Pay, Visa, Mastercard, Cash">
      {(site.onlinePayments ? ['Apple Pay', 'Google Pay', 'VISA', 'Mastercard', 'COD'] : ['COD']).map((x) => <span key={x}>{x}</span>)}
    </div>
  );
}

export function Footer({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container">
        <div className="cols">
          <div className="stack">
            <img className="f-logo" src={site.brand.logoLight} alt={site.name[lang]} width={127} height={52} loading="lazy" />
            <p style={{ opacity: 0.85 }}>{t.heroSub}</p>
            <div>
              <h2 style={{ marginTop: 8, fontSize: 16 }}>{t.paymentMethods}</h2>
              <PayIcons />
            </div>
          </div>
          <nav aria-label={t.categories}>
            <h2>{t.categories}</h2>
            <ul data-testid="footer-categories">
              {categories.map((c) => (
                <li key={c.id}><Link href={`/${lang}/search?cat=${c.id}`}>{c.name[lang]}</Link></li>
              ))}
            </ul>
          </nav>
          <div>
            <h2>{t.contactUs}</h2>
            <ul>
              <li><a className="num ltr" href={`tel:${site.phone}`}>{phoneDisplay(site.phone)}</a></li>
              <li><a href={waLink(site.whatsapp)} rel="noopener">{t.whatsapp}</a></li>
              <li><a href={`mailto:${site.email}`}>{site.email}</a></li>
              <li><a href={instagramUrl} rel="noopener">{t.instagram}</a></li>
              <li><Link href={`/${lang}/stores`}>{t.stores}</Link></li>
            </ul>
          </div>
          <nav aria-label={t.legal}>
            <h2>{t.legal}</h2>
            <ul>
              <li><Link href={`/${lang}/terms`}>{t.terms}</Link></li>
              <li><Link href={`/${lang}/privacy`}>{t.privacy}</Link></li>
              <li><Link href={`/${lang}/refund`}>{t.refund}</Link></li>
            </ul>
          </nav>
        </div>
        <div className="legal">
          <span>© {year} {site.name[lang]}. {t.rights}.</span>
          <span>{t.license}: <span className="num ltr">{site.tradeLicense}</span></span>
          <span>{t.trn}: <span className="num ltr">{site.trn}</span></span>
        </div>
      </div>
    </footer>
  );
}
