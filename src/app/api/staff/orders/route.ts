import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/server/staff';

const STATUSES = ['awaiting_payment', 'pending_cod', 'paid', 'delivered', 'cancelled', 'payment_failed'];

/** Latest orders, optionally filtered by status. */
export async function GET(req: Request) {
  const s = await requireStaff();
  if ('error' in s) return s.error;
  const status = new URL(req.url).searchParams.get('status') ?? '';
  let q = s.db.from('orders')
    .select('id, status, payment, name, phone, total, discount, promo_code, points_redeemed, points_earnable, details, created_at')
    .order('created_at', { ascending: false }).limit(100);
  if (STATUSES.includes(status)) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: 'db' }, { status: 500 });
  return NextResponse.json({ orders: data });
}

/** { orderId, action: 'delivered' | 'cancel' } — delivered credits points (cash orders); cancel refunds/reverses them. */
export async function POST(req: Request) {
  const s = await requireStaff();
  if ('error' in s) return s.error;
  const b = await req.json().catch(() => null);
  const orderId = String(b?.orderId ?? '').slice(0, 40);
  if (!orderId || !['delivered', 'cancel'].includes(b?.action)) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const { data, error } = b.action === 'delivered'
    ? await s.db.rpc('complete_order', { p_order: orderId, p_status: 'delivered' })
    : await s.db.rpc('cancel_order', { p_order: orderId, p_status: 'cancelled' });
  if (error) return NextResponse.json({ error: error.message.includes('order_not_found') ? 'not_found' : 'db' }, { status: 400 });
  console.info(`[staff] ${s.me.id} ${b.action} ${orderId}`);
  return NextResponse.json({ status: data });
}
