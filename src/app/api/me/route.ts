import { NextResponse } from 'next/server';
import { ordersForCustomer, reviewableProducts, toAed } from '@/lib/db/store';
import { currentCustomer, rewardsGuard } from '@/lib/server/api';

export const dynamic = 'force-dynamic';

/** The signed-in customer (name, masked phone, points), recent orders and products they can review. */
export async function GET(req: Request) {
  const g = rewardsGuard(req);
  if ('res' in g) return g.res;
  const me = await currentCustomer(g.db);
  if (!me) return NextResponse.json({ customer: null }, { headers: { 'cache-control': 'no-store' } });
  const [orders, reviewable] = await Promise.all([ordersForCustomer(g.db, me.id, 10), reviewableProducts(g.db, me.id)]);
  return NextResponse.json({
    customer: me,
    reviewable,
    orders: orders.map((o) => ({ id: o.id, status: o.status, total: toAed(o.total), createdAt: o.createdAt.toISOString(), pointsEarnable: o.pointsEarnable })),
  }, { headers: { 'cache-control': 'no-store' } });
}
