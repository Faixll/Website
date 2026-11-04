/* Server-rendered layout pieces: announcement bar, footer, trust strip. The header is in SiteHeader.tsx. */
import Link from 'next/link';
import { instagramUrl, site, type Lang } from '@/config/site';
import { categories } from '@/data/catalog';
import { phoneDisplay, waLink } from '@/lib/format';
import { getDict } from '@/lib/i18n';
import { Icon, type IconName } from './Icon';

export function AnnouncementBar({ lang }: { lang: Lang }) {
  return (
    <div className="announce" data-testid="announcement">
      <Icon name="truck" size={20} />
      <span>{getDict(lang).promise}</span>
    </div>
  );
}

const trustIcons: IconName[] = ['seal', 'snow', 'knife'];

export function TrustStrip({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  return (
    <ul className="trust">
      {t.trust3.map(([title, sub], i) => (
        <li key={title}>
          <span className="t-ico"><Icon name={trustIcons[i]} /></span>
          <span className="stack" style={{ gap: 0 }}><b>{title}</b><small className="muted">{sub}</small></span>
        </li>
      ))}
    </ul>
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
            <h2>{site.name[lang]}</h2>
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
