import { NextResponse } from 'next/server';
import { getCustomer, verifyOtp } from '@/lib/db/store';
import { normaliseUaeMobile } from '@/lib/format';
import { fail, rewardsGuard, str } from '@/lib/server/api';
import { sessionSecret, setCustomerCookie } from '@/lib/server/session';

/** Step 2 of sign-in: the 6-digit code → signed httpOnly cookie for 30 days. */
export async function POST(req: Request) {
  const g = rewardsGuard(req);
  if ('res' in g) return g.res;
  const b = await req.json().catch(() => null);
  const phone = normaliseUaeMobile(str(b?.phone, 30));
  if (!phone) return fail('phone_invalid', 422);
  const r = await verifyOtp(g.db, { phone, code: str(b?.code, 6), firstName: str(b?.firstName, 40), consent: b?.consent === true, secret: sessionSecret()! });
  if (!r.ok) return fail(r.error, r.error === 'too_many_attempts' ? 429 : 401, r.error === 'wrong_code' ? { attemptsLeft: r.attemptsLeft } : {});
  await setCustomerCookie(r.customer.id);
  return NextResponse.json({ customer: await getCustomer(g.db, r.customer.id) });
}
