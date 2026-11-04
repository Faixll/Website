'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import type { CartLine } from '@/lib/pricing';
import { Icon } from './Icon';
import { useStore } from './StoreProvider';

/** After a redirect-based payment (e.g. 3-D Secure), clear the cart here once Stripe reports success. */
export function OrderConfirmation({ id, paid, points = 0 }: { id: string; paid: boolean; points?: number }) {
  const { t, lang, ready, clear, saveLastOrder } = useStore();
  useEffect(() => {
    if (!ready) return;
    try {
      const pending = JSON.parse(sessionStorage.getItem('hab-pending') ?? 'null') as { orderId: string; lines: CartLine[] } | null;
      if (pending?.orderId === id) {
        saveLastOrder(pending.lines);
        clear();
        sessionStorage.removeItem('hab-pending');
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, id]);

  return (
    <div className="panel-card" style={{ maxWidth: 560, margin: '32px auto', textAlign: 'center', justifyItems: 'center' }}>
      <span className="t-ico" style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--fresh-50)', color: 'var(--fresh)', display: 'grid', placeItems: 'center' }}>
        <Icon name="check" className="icon" />
      </span>
      <h1 style={{ fontSize: 24 }}>{t.thanks}</h1>
      <p>{t.orderNo}: <b className="num ltr">{id}</b>{paid && <> · <span className="badge badge-fresh">{t.paid}</span></>}</p>
      <p className="muted">{t.willCall}</p>
      {points > 0 && <p className="earn"><Icon name="check" />{t.pointsComing(points)}</p>}
      <Link href={`/${lang}`} className="btn btn-primary">{t.backHome}</Link>
    </div>
  );
}
