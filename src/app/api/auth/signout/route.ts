import { NextResponse } from 'next/server';
import { fail } from '@/lib/server/api';
import { clearCustomerCookie, sameOrigin } from '@/lib/server/session';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail('forbidden', 403);
  await clearCustomerCookie();
  return NextResponse.json({ ok: true });
}
