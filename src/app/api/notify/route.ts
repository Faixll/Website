import { NextResponse } from 'next/server';
import { productById } from '@/data/catalog';
import { normaliseUaeMobile } from '@/lib/format';
import { notifyBusiness } from '@/lib/server/notify';

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const p = productById(String(b?.productId ?? ''));
  const phone = normaliseUaeMobile(String(b?.phone ?? ''));
  if (!p || !phone) return NextResponse.json({ ok: false }, { status: 400 });
  await notifyBusiness('notify-me', { productId: p.id, product: p.name.en, phone, lang: b?.lang === 'en' ? 'en' : 'ar' });
  return NextResponse.json({ ok: true });
}
