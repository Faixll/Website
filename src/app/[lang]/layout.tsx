import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic, Readex_Pro } from 'next/font/google';
import { notFound } from 'next/navigation';
import { LANGS, site, type Lang } from '@/config/site';
import { BottomNav, CartBar, CartDrawer, Toast } from '@/components/Chrome';
import { Footer, TopBar } from '@/components/Layout';
import { AccountProvider } from '@/components/AccountProvider';
import { StoreProvider } from '@/components/StoreProvider';
import { getDict, isLang } from '@/lib/i18n';
import '../globals.css';

const plex = IBM_Plex_Sans_Arabic({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-plex', display: 'swap' });
const readex = Readex_Pro({ subsets: ['arabic', 'latin'], weight: ['500', '600', '700'], variable: '--font-readex', display: 'swap' });

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

export const viewport: Viewport = { themeColor: '#8C1D2C', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = getDict(lang as Lang);
  return (
    <html lang={lang} dir={t.dir} className={`${plex.variable} ${readex.variable}`}>
      <body>
        <StoreProvider lang={lang as Lang}>
          <AccountProvider>
          <a href="#main" className="skip">{t.skip}</a>
          <TopBar lang={lang as Lang} />
          {children}
          <Footer lang={lang as Lang} />
          <CartBar />
          <BottomNav />
          <CartDrawer />
          <Toast />
          </AccountProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
