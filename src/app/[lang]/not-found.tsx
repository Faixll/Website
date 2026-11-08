import { NotFoundView } from '@/components/NotFoundView';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata = { robots: { index: false } };

/** Branded 404 in the page's language, with the way back to the shop. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container section">
        <NotFoundView />
      </main>
    </>
  );
}
