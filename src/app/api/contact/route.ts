import { NextResponse } from 'next/server';
import { normaliseUaeMobile } from '@/lib/format';
import { notifyBusiness } from '@/lib/server/notify';

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? '').trim().slice(0, 100);
  const phone = normaliseUaeMobile(String(b?.phone ?? ''));
  const message = String(b?.message ?? '').trim().slice(0, 2000);
  if (!name || !phone || !message) return NextResponse.json({ ok: false }, { status: 400 });
  await notifyBusiness('contact', { name, phone, message });
  return NextResponse.json({ ok: true });
}
