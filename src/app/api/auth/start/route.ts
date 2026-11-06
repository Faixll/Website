import { NextResponse } from 'next/server';
import { createOtp } from '@/lib/db/store';
import { normaliseUaeMobile } from '@/lib/format';
import { sendOtp } from '@/lib/otp';
import { fail, rewardsGuard, str } from '@/lib/server/api';
import { clientIp, sessionSecret } from '@/lib/server/session';

/** Step 1 of sign-in: first name + UAE mobile + consent → a 6-digit code by SMS/WhatsApp. */
export async function POST(req: Request) {
  const g = rewardsGuard(req);
  if ('res' in g) return g.res;
  const b = await req.json().catch(() => null);
  const phone = normaliseUaeMobile(str(b?.phone, 30));
  const firstName = str(b?.firstName, 40);
  if (!phone) return fail('phone_invalid', 422);
  if (!firstName) return fail('name_required', 422);
  if (b?.consent !== true) return fail('consent_required', 422);

  const r = await createOtp(g.db, { phone, ip: await clientIp(), secret: sessionSecret()! });
  if (!r.ok) return fail(r.error, 429, r.error === 'wait' ? { retryAfter: r.retryAfter } : {});
  const sent = await sendOtp(phone, r.code, b?.lang === 'en' ? 'en' : 'ar');
  if (!sent) return fail('send_failed', 503);
  return NextResponse.json({ ok: true, phone, resendIn: 30 });
}
