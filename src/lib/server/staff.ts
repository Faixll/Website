import 'server-only';
import { NextResponse } from 'next/server';
import { currentProfile, supabaseAdmin } from '@/lib/supabase/server';

/**
 * Staff are normal accounts with role = 'staff', set in Supabase (Table editor → profiles → role).
 * Returns the staff profile and admin client, or a 401/403/503 response.
 */
export async function requireStaff() {
  const db = supabaseAdmin();
  if (!db) return { error: NextResponse.json({ error: 'accounts_not_configured' }, { status: 503 }) } as const;
  const me = await currentProfile();
  if (!me) return { error: NextResponse.json({ error: 'sign_in_required' }, { status: 401 }) } as const;
  if (me.role !== 'staff') return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) } as const;
  return { me, db } as const;
}
