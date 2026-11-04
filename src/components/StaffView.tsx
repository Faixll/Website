'use client';

import { useCallback, useEffect, useState } from 'react';
import { money, phoneDisplay } from '@/lib/format';
import { Icon } from './Icon';
import { useStore } from './StoreProvider';

type Row = {
  id: string; status: string; payment: string; name: string; phone: string; total: number; discount: number;
  promo_code: string | null; points_redeemed: number; points_earnable: number; created_at: string;
  details: { fulfilment: { type: string; branch?: string; emirate?: string; area?: string }; slot: { date: string; slotId: string } | null; lines: { product: string; size: string; cut: string; qty: number; notes: string }[] };
};

const STATUSES = ['', 'pending_cod', 'awaiting_payment', 'paid', 'delivered', 'cancelled', 'payment_failed'];

export function StaffView() {
  const { t, lang } = useStore();
  const [status, setStatus] = useState('pending_cod');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setRows(null);
    const res = await fetch(`/api/staff/orders${status ? `?status=${status}` : ''}`);
    const data = await res.json().catch(() => ({}));
    setRows(res.ok ? data.orders : []);
    if (!res.ok) setMsg(t.notStaff);
  }, [status, t]);
  useEffect(() => { load(); }, [load]);

  const act = async (orderId: string, action: 'delivered' | 'cancel') => {
    if (action === 'cancel' && !confirm(t.confirmCancel)) return;
    const res = await fetch('/api/staff/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId, action }) });
    setMsg(res.ok ? `${t.done}: ${orderId}` : t.orderError);
    load();
  };

  const [adj, setAdj] = useState({ phone: '', delta: '', note: '' });
  const adjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/staff/points', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(adj) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setMsg(`${t.done}: ${t.balanceIs(t.pointsN(data.balance))}`); setAdj({ phone: '', delta: '', note: '' }); }
    else setMsg(data.error === 'not_found' ? t.customerNotFound : t.pointsErrors[data.error] ?? t.fixErrors);
  };

  const when = (iso: string) => new Date(iso).toLocaleString(lang === 'ar' ? 'ar-AE-u-nu-latn' : 'en-AE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Dubai' });

  return (
    <div className="stack" style={{ gap: 16 }}>
      {msg && <p className="alert" role="status">{msg}</p>}

      <section className="panel-card" aria-labelledby="h-staff-orders">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <h2 id="h-staff-orders">{t.staffTitle}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <label htmlFor="st-status" className="sr-only">{t.allStatuses}</label>
            <select id="st-status" className="select" style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s ? t.statuses[s] : t.allStatuses}</option>)}
            </select>
            <button type="button" className="btn btn-ghost" onClick={load}><Icon name="repeat" />{t.refresh}</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {rows === null ? <p className="muted" aria-busy="true">…</p> : rows.length === 0 ? <p className="muted">{t.noOrders}</p> : (
            <table className="staff-table">
              <thead><tr><th>{t.orderNo}</th><th>{t.name}</th><th>{t.summary}</th><th>{t.grandTotal}</th><th /></tr></thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <b className="ltr num">{o.id}</b><br />
                      <span className="muted num">{when(o.created_at)}</span><br />
                      <span className="badge badge-low">{t.statuses[o.status] ?? o.status}</span>
                    </td>
                    <td>{o.name}<br /><a className="ltr num" href={`tel:${o.phone}`}>{phoneDisplay(o.phone)}</a></td>
                    <td>
                      {o.details.lines.map((l, i) => <div key={i}>{l.qty}× {l.product} · {l.size} · {l.cut}{l.notes ? ` · “${l.notes}”` : ''}</div>)}
                      <span className="muted">
                        {o.details.fulfilment.type === 'pickup' ? `${t.pickup}: ${o.details.fulfilment.branch}` : `${t.delivery}: ${o.details.fulfilment.emirate} / ${o.details.fulfilment.area}`}
                        {o.details.slot ? ` · ${o.details.slot.date} ${o.details.slot.slotId}` : ''}
                      </span>
                    </td>
                    <td className="num">
                      {money(Number(o.total), lang)}<br />
                      <span className="muted">{o.payment}{o.promo_code ? ` · ${o.promo_code}` : ''}{o.points_redeemed ? ` · −${t.pointsN(o.points_redeemed)}` : ''}</span>
                    </td>
                    <td>
                      <div className="staff-actions">
                        {['pending_cod', 'paid'].includes(o.status) && <button className="btn btn-green" onClick={() => act(o.id, 'delivered')}>{t.markDelivered}</button>}
                        {!['cancelled', 'payment_failed'].includes(o.status) && <button className="btn btn-ghost" onClick={() => act(o.id, 'cancel')}>{t.cancelOrder}</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <form className="panel-card" onSubmit={adjust} aria-labelledby="h-adj">
        <h2 id="h-adj">{t.adjustPoints}</h2>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="adj-phone">{t.phone}</label>
            <div className="phone-wrap"><span className="prefix" aria-hidden>+971</span>
              <input id="adj-phone" className="input" type="tel" inputMode="tel" value={adj.phone} onChange={(e) => setAdj({ ...adj, phone: e.target.value })} required /></div>
          </div>
          <div className="field">
            <label htmlFor="adj-delta">{t.pointsDelta}</label>
            <input id="adj-delta" className="input num ltr" inputMode="numeric" placeholder="+100 / -100" value={adj.delta} onChange={(e) => setAdj({ ...adj, delta: e.target.value })} required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="adj-note">{t.note}</label>
          <input id="adj-note" className="input" maxLength={200} value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} required />
        </div>
        <button className="btn btn-primary" type="submit" style={{ justifySelf: 'start' }}>{t.apply}</button>
      </form>
    </div>
  );
}
