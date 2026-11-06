import { redirect } from 'next/navigation';
import { balanceOf, customersById, listOrders, toAed } from '@/lib/db/store';
import { getDb } from '@/lib/server/db';
import { isAdmin } from '@/lib/server/session';
import { changeOrder, changePoints } from '../actions';

type Line = { product?: string; size?: string; cut?: string; qty?: number };
const STATUSES = ['', 'new', 'awaiting_payment', 'delivered', 'cancelled', 'payment_failed'];
const aed = (fils: number) => `AED ${toAed(fils).toFixed(2)}`;

/** Every order saved on the site. "Mark delivered" credits the customer's points (once). */
export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const db = getDb();
  if (!db || !(await isAdmin())) redirect('/admin');
  const { status = '' } = await searchParams;
  const rows = await listOrders(db, { status: STATUSES.includes(status) && status ? status : undefined, limit: 200 });
  const people = await customersById(db, [...new Set(rows.map((r) => r.customerId).filter(Boolean) as string[])]);
  const balances = new Map(await Promise.all([...people.keys()].map(async (id) => [id, await balanceOf(db, id)] as const)));

  return (
    <div className="stack" style={{ gap: 16 }}>
      <h1 style={{ fontSize: 26 }}>Orders</h1>
      <nav className="options-row" aria-label="Filter">
        {STATUSES.map((s) => (
          <a key={s || 'all'} href={s ? `/admin/orders?status=${s}` : '/admin/orders'} className={`btn btn-option btn-md${status === s ? ' is-selected' : ''}`}>
            <span className="btn-fill" aria-hidden /><span className="btn-label">{s || 'all'}</span>
          </a>
        ))}
      </nav>
      {rows.length === 0 && <p className="muted">No orders yet.</p>}
      {rows.map((o) => {
        const d = o.details as { lines?: Line[]; fulfilment?: Record<string, string>; slot?: { date: string; slotId: string } | null };
        const c = o.customerId ? people.get(o.customerId) : null;
        return (
          <article key={o.id} className="panel-card" data-testid="admin-order" data-order={o.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <b className="num">{o.id}</b> · <span className="badge">{o.status}</span> · {o.payment}
                <div className="muted small">{o.createdAt.toISOString().replace('T', ' ').slice(0, 16)} UTC</div>
              </div>
              <b className="num">{aed(o.total)}</b>
            </div>
            <div className="small">
              {o.name} · <span className="num ltr">{o.phone}</span>
              {d.fulfilment && <> · {Object.values(d.fulfilment).filter(Boolean).join(', ')}</>}
              {d.slot && <> · {d.slot.date} {d.slot.slotId}</>}
            </div>
            <ul className="small" style={{ margin: 0, paddingInlineStart: 18 }}>
              {(d.lines ?? []).map((l, i) => <li key={i}>{l.qty} × {l.product} ({[l.size, l.cut].filter(Boolean).join(', ')})</li>)}
            </ul>
            <div className="small muted">
              Subtotal {aed(o.subtotal)} · Discount {aed(o.discount)} · Delivery {aed(o.deliveryFee)}
              {o.promoCode && <> · Code {o.promoCode}</>}
              {o.pointsRedeemed > 0 && <> · Points used {o.pointsRedeemed}</>}
              {c && <> · Customer {c.firstName} (balance {balances.get(c.id)}) · earns {o.pointsEarnable} on delivery</>}
            </div>
            <div className="options-row">
              {o.status === 'new' && (
                <form action={changeOrder}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value="delivered" />
                  <button className="btn btn-primary btn-md" type="submit" data-testid="mark-delivered"><span className="btn-label">Mark delivered</span></button></form>
              )}
              {(o.status === 'new' || o.status === 'awaiting_payment') && (
                <form action={changeOrder}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value="cancelled" />
                  <button className="btn btn-secondary btn-md" type="submit"><span className="btn-label">Cancel order</span></button></form>
              )}
              {c && (
                <form action={changePoints} className="options-row" style={{ alignItems: 'center' }}>
                  <input type="hidden" name="customerId" value={c.id} />
                  <label className="sr-only" htmlFor={`d-${o.id}`}>Points (+/-)</label>
                  <input id={`d-${o.id}`} name="delta" className="input" type="number" inputMode="numeric" step={1} placeholder="+/- points" style={{ width: 130 }} />
                  <input name="note" className="input" placeholder="Note" maxLength={200} style={{ width: 160 }} />
                  <button className="btn btn-secondary btn-md" type="submit"><span className="btn-label">Adjust points</span></button>
                </form>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
