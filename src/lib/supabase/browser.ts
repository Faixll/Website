'use client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { accountsEnabled, SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

let client: Promise<SupabaseClient> | null = null;

/**
 * Browser client (customer's own session; row-level security limits it to their own rows).
 * Loaded on demand so the Supabase library is not in every page's initial JavaScript.
 */
export function supabaseBrowser(): Promise<SupabaseClient | null> {
  if (!accountsEnabled) return Promise.resolve(null);
  return (client ??= import('@supabase/ssr').then(({ createBrowserClient }) => createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)));
}
