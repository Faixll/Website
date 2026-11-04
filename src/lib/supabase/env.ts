/** Supabase is optional: without these env vars the store runs as guest-only (no accounts or points). */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const accountsEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
