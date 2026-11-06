import { redirect } from 'next/navigation';
import { productById } from '@/data/catalog';
import { reviewsByStatus } from '@/lib/db/store';
import { getDb } from '@/lib/server/db';
import { isAdmin } from '@/lib/server/session';
import { changeReview } from '../actions';

/** Reviews wait here until approved. Only approved reviews appear on the site. */
export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const db = getDb();
  if (!db || !(await isAdmin())) redirect('/admin');
  const { status: s } = await searchParams;
  const status = s === 'approved' || s === 'rejected' ? s : 'pending';
  const rows = await reviewsByStatus(db, status);

  return (
    <div className="stack" style={{ gap: 16 }}>
      <h1 style={{ fontSize: 26 }}>Reviews</h1>
      <nav className="options-row" aria-label="Filter">
        {(['pending', 'approved', 'rejected'] as const).map((x) => (
          <a key={x} href={`/admin/reviews?status=${x}`} className={`btn btn-option btn-md${status === x ? ' is-selected' : ''}`}>
            <span className="btn-fill" aria-hidden /><span className="btn-label">{x}</span>
          </a>
        ))}
      </nav>
      {rows.length === 0 && <p className="muted">Nothing here.</p>}
      {rows.map((r) => (
        <article key={r.id} className="panel-card" data-testid="admin-review">
          <div><b>{r.firstName}</b> · {'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)} · {productById(r.productId)?.name.en ?? r.productId} · order <span className="num">{r.orderId}</span></div>
          <p>{r.text}</p>
          {status === 'pending' && (
            <div className="options-row">
              <form action={changeReview}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="approved" />
                <button className="btn btn-primary btn-md" type="submit" data-testid="approve-review"><span className="btn-label">Approve</span></button></form>
              <form action={changeReview}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="rejected" />
                <button className="btn btn-secondary btn-md" type="submit"><span className="btn-label">Reject</span></button></form>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
