import 'server-only';
import { NextResponse } from 'next/server';
import { getCustomer, type Db } from '@/lib/db/store';
import { getDb } from './db';
import { rewardsOn } from './features';
import { clearCustomerCookie, customerIdFromCookie, sameOrigin } from './session';

export const fail = (error: string, status: number, extra: Record<string, unknown> = {}) => NextResponse.json({ error, ...extra }, { status });
export const str = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);

/** Guards for the rewards APIs: switched on, same-origin, database ready. */
export function rewardsGuard(req: Request): { db: Db } | { res: NextResponse } {
  if (!rewardsOn()) return { res: fail('not_found', 404) };
  if (!sameOrigin(req)) return { res: fail('forbidden', 403) };
  const db = getDb();
  if (!db) return { res: fail('not_configured', 503) };
  return { db };
}

/** The signed-in customer, or null. A cookie for a deleted customer is cleared. */
export async function currentCustomer(db: Db) {
  const cid = await customerIdFromCookie();
  if (!cid) return null;
  const me = await getCustomer(db, cid);
  if (!me) await clearCustomerCookie();
  return me;
}
