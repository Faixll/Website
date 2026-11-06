import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';
import type { Db } from '@/lib/db/store';

/**
 * The database (Postgres: Neon or Supabase — set DATABASE_URL). Returns null when it isn't configured;
 * the shop then works exactly as before (guest checkout, orders logged + sent to ORDER_WEBHOOK_URL).
 */
const g = globalThis as unknown as { __habDb?: Db | null };

export function getDb(): Db | null {
  if (g.__habDb !== undefined) return g.__habDb;
  const url = process.env.DATABASE_URL;
  // prepare: false works with poolers (Neon / Supabase pgbouncer in transaction mode).
  g.__habDb = url ? (drizzle(postgres(url, { max: 5, prepare: false }), { schema }) as unknown as Db) : null;
  return g.__habDb;
}
