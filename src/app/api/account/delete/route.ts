import { NextResponse } from 'next/server';
import { deleteCustomer } from '@/lib/db/store';
import { currentCustomer, fail, rewardsGuard } from '@/lib/server/api';
import { clearCustomerCookie } from '@/lib/server/session';

/** "Delete my account": removes the customer, their points and reviews, and signs them out. */
export async function POST(req: Request) {
  const g = rewardsGuard(req);
  if ('res' in g) return g.res;
  const me = await currentCustomer(g.db);
  if (!me) return fail('sign_in_required', 401);
  await deleteCustomer(g.db, me.id);
  await clearCustomerCookie();
  return NextResponse.json({ ok: true });
}
