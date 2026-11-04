import { NextResponse } from 'next/server';
import { normaliseUaeMobile } from '@/lib/format';
import { requireStaff } from '@/lib/server/staff';

/** { phone, delta, note } — manual points adjustment, recorded in the ledger with the staff member's id. */
export async function POST(req: Request) {
  const s = await requireStaff();
  if ('error' in s) return s.error;
  const b = await req.json().catch(() => null);
  const phone = normaliseUaeMobile(String(b?.phone ?? ''));
  const delta = Math.trunc(Number(b?.delta));
  const note = String(b?.note ?? '').trim().slice(0, 200);
  if (!phone || !delta || Math.abs(delta) > 100000 || !note) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  const { data: p } = await s.db.from('profiles').select('id').eq('phone', phone).maybeSingle();
  if (!p) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const { data, error } = await s.db.rpc('apply_points', { p_user: p.id, p_order: null, p_delta: delta, p_reason: 'adjust', p_note: note, p_by: s.me.id });
  if (error) return NextResponse.json({ error: error.message.includes('insufficient_points') ? 'not_enough_points' : 'db' }, { status: 400 });
  return NextResponse.json({ balance: data });
}
