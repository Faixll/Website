import { NextResponse } from 'next/server';
import { productById } from '@/data/catalog';
import { createReview } from '@/lib/db/store';
import { currentCustomer, fail, rewardsGuard, str } from '@/lib/server/api';

/** Write a review: signed in, delivered order with this product, one per product. Saved as pending until approved. */
export async function POST(req: Request) {
  const g = rewardsGuard(req);
  if ('res' in g) return g.res;
  const me = await currentCustomer(g.db);
  if (!me) return fail('sign_in_required', 401);
  const b = await req.json().catch(() => null);
  const productId = str(b?.productId, 60);
  if (!productById(productId)) return fail('bad_request', 422);
  const r = await createReview(g.db, { customerId: me.id, productId, stars: Number(b?.stars), text: str(b?.text, 600) });
  if (!r.ok) return fail(r.error, r.error === 'bad_request' ? 422 : 409);
  return NextResponse.json({ ok: true, status: 'pending' });
}
