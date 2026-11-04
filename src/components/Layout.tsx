/* Server-rendered layout pieces: top bar, header, category tabs, trust row, footer. */
import Link from 'next/link';
import { site, type Lang } from '@/config/site';
import { categories, type CategoryId } from '@/data/catalog';
import { phoneDisplay } from '@/lib/format';
import { getDict } from '@/lib/i18n';
import { AccountButton, CartButton, LangToggle } from './Chrome';
import { Icon, type IconName } from './Icon';
import { SearchBox } from './SearchBox';

export function TopBar({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  return (
    <div className="topbar">
      <div className="container">
        <p className="promise"><Icon name="truck" />{t.promise}</p>
        <div className="links">
          <Link href={`/${lang}/stores`} className="hide-sm"><Icon name="pin" />{t.branchesLink}</Link>
          <a href={`tel:${site.phone}`} className="hide-sm num" aria-label={`${t.callUs} ${phoneDisplay(site.phone)}`}>
            <Icon name="phone" /><span className="ltr">{phoneDisplay(site.phone)}</span>
          </a>
          <LangToggle />
        </div>
      </div>
    </div>
  );
}

export function Header({ lang, q }: { lang: Lang; q?: string }) {
  return (
    <header className="header">
      <div className="container">
        <Link href={`/${lang}`} className="logo" aria-label={site.name[lang]}>
          <img src={site.logo} alt="" width={40} height={40} />
          <span className="name">
            <b>{site.shortName[lang]}</b>
            <small>{lang === 'ar' ? 'لتجارة اللحوم الطازجة' : 'Fresh Meat Trading'}</small>
          </span>
        </Link>
        <SearchBox initial={q} />
        <AccountButton />
        <CartButton />
      </div>
    </header>
  );
}

export function CategoryTabs({ lang, active }: { lang: Lang; active?: CategoryId | 'all' }) {
  const t = getDict(lang);
  return (
    <nav className="cat-tabs" aria-label={t.categories}>
      <div className="container">
        <div className="chips">
          <Link href={`/${lang}/search`} className="chip" aria-current={active === 'all' ? 'page' : undefined}>{t.allProducts}</Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/${lang}/search?cat=${c.id}`} className="chip" aria-current={active === c.id ? 'page' : undefined}>
              {c.name[lang]}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

const trustIcons: IconName[] = ['leaf', 'snow', 'knife', 'shield'];

export function TrustRow({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  return (
    <ul className="trust">
      {t.trust.map(([title, sub], i) => (
        <li key={title}>
          <span className="t-ico"><Icon name={trustIcons[i]} /></span>
          <span><b>{title}</b><span>{sub}</span></span>
        </li>
      ))}
    </ul>
  );
}

export function PayIcons() {
  return (
    <div className="pay-icons" aria-label="Apple Pay, Google Pay, Visa, Mastercard, Cash">
      <span>Apple Pay</span><span>Google Pay</span><span>VISA</span><span>Mastercard</span><span>COD</span>
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
            <p>{t.heroSub}</p>
            <div>
              <h2 style={{ marginTop: 8 }}>{t.paymentMethods}</h2>
              <PayIcons />
            </div>
          </div>
          <div>
            <h2>{t.categories}</h2>
            <ul>
              {categories.slice(0, 5).map((c) => (
                <li key={c.id}><Link href={`/${lang}/search?cat=${c.id}`}>{c.name[lang]}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h2>{t.contactUs}</h2>
            <ul>
              <li><a className="num ltr" href={`tel:${site.phone}`}>{phoneDisplay(site.phone)}</a></li>
              <li><a href={`https://wa.me/${site.whatsapp.replace(/\D/g, '')}`} rel="noopener">{t.whatsapp}</a></li>
              <li><a href={`mailto:${site.email}`}>{site.email}</a></li>
              <li><Link href={`/${lang}/stores`}>{t.stores}</Link></li>
            </ul>
          </div>
        </div>
        <div className="legal">
          <span>© {year} {site.name[lang]}. {t.rights}.</span>
          <span>{t.license}: <span className="num">{site.tradeLicense}</span></span>
          <span>{t.trn}: <span className="num">{site.trn}</span></span>
        </div>
      </div>
    </footer>
  );
}
