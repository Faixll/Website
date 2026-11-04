import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { accountsEnabled, SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

/** The signed-in customer for this request (from the session cookie), or null. */
export async function currentUser() {
  if (!accountsEnabled) return null;
  const store = await cookies();
  const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* read-only in some contexts */ }
      },
    },
  });
  const { data } = await sb.auth.getUser(); // verified with Supabase, not just decoded
  return data.user ?? null;
}

let admin: SupabaseClient | null = null;

/**
 * Service-role client: bypasses row-level security. SERVER ONLY — used to create orders,
 * move points and run the staff tools. Requires SUPABASE_SERVICE_ROLE_KEY.
 */
export function supabaseAdmin(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!accountsEnabled || !key) return null;
  return (admin ??= createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } }));
}

/** Profile (balance, role) of the signed-in customer, read with the service role. */
export async function currentProfile() {
  const user = await currentUser();
  const db = supabaseAdmin();
  if (!user || !db) return null;
  const { data } = await db.from('profiles').select('id, phone, name, role, points_balance').eq('id', user.id).single();
  return data as { id: string; phone: string | null; name: string | null; role: 'customer' | 'staff'; points_balance: number } | null;
}
