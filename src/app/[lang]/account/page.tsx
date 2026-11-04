import type { Metadata } from 'next';
import type { Lang } from '@/config/site';
import { AccountPage } from '@/components/AccountView';
import { SiteHeader } from '@/components/SiteHeader';
import { getDict } from '@/lib/i18n';

export async function generateMetadata({ params }: { params: Promise<{ lang: Lang }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(lang).account, robots: { index: false } };
}

export default async function Page({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  const t = getDict(lang);
  return (
    <>
      <SiteHeader />
      <main id="main" className="container section">
        <h1 className="sr-only">{t.account}</h1>
        <AccountPage />
      </main>
    </>
  );
}
