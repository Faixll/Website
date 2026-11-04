import type { Metadata } from 'next';
import type { Lang } from '@/config/site';
import { ProfileView } from '@/components/ProfileView';
import { SiteHeader } from '@/components/SiteHeader';
import { getDict } from '@/lib/i18n';

export async function generateMetadata({ params }: { params: Promise<{ lang: Lang }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(lang).profileTitle, robots: { index: false } };
}

/** Guest profile: no login. Delivery details live only in this browser (localStorage) and prefill checkout. */
export default async function ProfilePage({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  const t = getDict(lang);
  return (
    <>
      <SiteHeader chips />
      <main id="main" className="container">
        <div className="page-title"><h1>{t.profileTitle}</h1></div>
        <ProfileView />
      </main>
    </>
  );
}
