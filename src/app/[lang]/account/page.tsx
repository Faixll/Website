import type { Metadata } from 'next';
import type { Lang } from '@/config/site';
import { AccountPage } from '@/components/AccountView';
import { Header } from '@/components/Layout';
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
      <Header lang={lang} />
      <main id="main" className="container section">
        <h1 className="sr-only">{t.account}</h1>
        <AccountPage />
      </main>
    </>
  );
}
