import Link from 'next/link';
import { connection } from 'next/server';
import type { Lang } from '@/config/site';
import { SiteHeader } from '@/components/SiteHeader';
import { StaffView } from '@/components/StaffView';
import { getDict } from '@/lib/i18n';
import { currentProfile } from '@/lib/supabase/server';

export const metadata = { robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function StaffPage({ params }: { params: Promise<{ lang: Lang }> }) {
  await connection(); // always render per request (reads the signed-in user)
  const { lang } = await params;
  const t = getDict(lang);
  const me = await currentProfile();
  return (
    <>
      <SiteHeader />
      <main id="main" className="container section">
        <div className="page-title"><h1>{t.staffTitle}</h1></div>
        {me?.role === 'staff' ? (
          <StaffView />
        ) : (
          <div className="panel-card" style={{ maxWidth: 520 }}>
            <p>{t.notStaff}</p>
            {!me && <Link className="btn btn-primary" href={`/${lang}/account`} style={{ justifySelf: 'start' }}>{t.signIn}</Link>}
          </div>
        )}
      </main>
    </>
  );
}
