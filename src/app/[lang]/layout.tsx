import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Lalezar, Noto_Kufi_Arabic, Playfair_Display } from 'next/font/google';
import { notFound } from 'next/navigation';
import { LANGS, site, type Lang } from '@/config/site';
import { AccountProvider } from '@/components/AccountProvider';
import { CartDrawer, MiniCart, NavBars, Toast, WhatsAppFab } from '@/components/Chrome';
import { AnnouncementBar, Footer } from '@/components/Layout';
import { MotionProvider } from '@/components/Motion';
import { StoreProvider } from '@/components/StoreProvider';
import { getDict, isLang } from '@/lib/i18n';
import '../globals.css';

/* Fonts (Google, self-hosted by next/font, display: swap). Only the subsets and weights actually used are loaded. */
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-playfair', display: 'swap' });
const plex = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex', display: 'swap' });
const plexAr = IBM_Plex_Sans_Arabic({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600'], variable: '--font-plex-ar', display: 'swap' });
const kufi = Noto_Kufi_Arabic({ subsets: ['arabic'], weight: ['700'], variable: '--font-kufi', display: 'swap' });
const lalezar = Lalezar({ subsets: ['arabic', 'latin'], weight: '400', variable: '--font-lalezar', display: 'swap' });

/** Only /ar and /en exist; anything else is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = getDict(lang);
  return {
    metadataBase: new URL(site.url),
    title: { default: `${site.name[lang]} | ${t.heroTitle}`, template: `%s | ${site.shortName[lang]}` },
    description: t.heroSub,
    icons: { icon: site.logo },
    alternates: { languages: { ar: '/ar', en: '/en' } },
  };
}

export const viewport: Viewport = { themeColor: '#141110', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = getDict(lang as Lang);
  // Load only the families each language uses.
  const fonts = lang === 'ar' ? [plexAr, kufi, lalezar] : [plex, playfair];
  return (
    <html lang={lang} dir={t.dir} className={fonts.map((f) => f.variable).join(' ')}>
      <body>
        <StoreProvider lang={lang as Lang}>
          <AccountProvider>
            <MotionProvider>
              <a href="#main" className="skip">{t.skip}</a>
              <AnnouncementBar lang={lang as Lang} />
              {children}
              <Footer lang={lang as Lang} />
              <MiniCart />
              <WhatsAppFab />
              <NavBars />
              <CartDrawer />
              <Toast />
            </MotionProvider>
          </AccountProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
