import type { Lang } from '@/config/site';
import { SiteHeader } from '@/components/SiteHeader';
import { OrderConfirmation } from '@/components/OrderConfirmation';

export const metadata = { robots: { index: false } };
// Order IDs are not known at build time (overrides dynamicParams = false in the [lang] layout).
export const dynamicParams = true;

export default async function OrderPage({ params, searchParams }: { params: Promise<{ lang: Lang; id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { lang, id } = await params;
  const sp = await searchParams;
  const safeId = /^HAB-[A-Z0-9]{5,12}$/.test(id) ? id : '—';
  // `paid=1` comes from an in-page confirmation; `redirect_status` from Stripe's redirect. The webhook is the source of truth.
  const paid = sp.paid === '1' || sp.redirect_status === 'succeeded';
  return (
    <>
      <SiteHeader />
      <main id="main" className="container">
        <OrderConfirmation id={safeId} paid={paid} points={Math.max(0, Math.min(100000, Number(sp.pts) || 0))} />
      </main>
    </>
  );
}
