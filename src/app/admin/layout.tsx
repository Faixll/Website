import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/config/site';
import { isAdmin } from '@/lib/server/session';
import { logout } from './actions';
import '../globals.css';

export const metadata: Metadata = { metadataBase: new URL(site.url), title: 'Admin · Hawar Albada', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** Staff-only area: orders, points and reviews. Protected by ADMIN_PASSWORD. Never indexed. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdmin();
  return (
    <html lang="en" dir="ltr">
      <body style={{ fontFamily: 'system-ui, sans-serif' }}>
        <header className="admin-bar">
          <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 16, minHeight: 56, flexWrap: 'wrap' }}>
            <b>Hawar Albada · Admin</b>
            {admin && (
              <>
                <Link href="/admin/orders">Orders</Link>
                <Link href="/admin/reviews">Reviews</Link>
                <form action={logout} style={{ marginInlineStart: 'auto' }}><button className="btn btn-secondary btn-md" type="submit"><span className="btn-label">Sign out</span></button></form>
              </>
            )}
          </div>
        </header>
        <main className="container" style={{ paddingBlock: 24 }}>{children}</main>
      </body>
    </html>
  );
}
