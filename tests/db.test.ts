/**
 * Runs the Supabase migration against an in-memory Postgres (PGlite) with a minimal stand-in
 * for Supabase's `auth` schema and roles, then exercises the points rules and row-level security.
 * Run: npm test
 */
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { before, describe, it } from 'node:test';

const db = new PGlite();
const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';

const one = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0];
const balance = async (u: string) => (await one<{ points_balance: number }>('select points_balance from profiles where id = $1', [u])).points_balance;
const order = (id: string, extra: Record<string, unknown> = {}) => ({
  id, user_id: A, status: 'pending_cod', payment: 'cod', name: 'Test', phone: '+971501234567',
  subtotal: 300, discount: 0, delivery_fee: 0, total: 300, vat: 14.29, points_redeemed: 0, points_earnable: 300,
  details: { lines: [] }, ...extra,
});
const place = (o: Record<string, unknown>) => db.query('select place_order($1::jsonb) as id', [JSON.stringify(o)]);
const asUser = async (uid: string, fn: () => Promise<unknown>) => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try { return await fn(); } finally { await db.exec('reset role;'); }
};

before(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key, phone text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant usage on schema public to authenticated, anon, service_role;
  `);
  await db.exec(readFileSync('supabase/migrations/0001_accounts_points.sql', 'utf8'));
  await db.query('insert into auth.users (id, phone) values ($1, $2), ($3, $4)', [A, '971501234567', B, '+971509999999']);
});

describe('profiles', () => {
  it('are created for new users with an E.164 phone', async () => {
    assert.equal((await one<{ phone: string }>('select phone from profiles where id = $1', [A])).phone, '+971501234567');
    assert.equal((await one<{ phone: string }>('select phone from profiles where id = $1', [B])).phone, '+971509999999');
    assert.equal(await balance(A), 0);
  });
});

describe('earning', () => {
  it('credits points once when a COD order is delivered, even if called twice', async () => {
    await place(order('O1'));
    assert.equal(await balance(A), 0, 'nothing before delivery');
    await db.query(`select complete_order('O1', 'delivered')`);
    await db.query(`select complete_order('O1', 'delivered')`);
    assert.equal(await balance(A), 300);
  });

  it('credits a card order once on payment and not again on delivery', async () => {
    await place(order('O2', { status: 'awaiting_payment', payment: 'card', points_earnable: 120 }));
    await db.query(`select complete_order('O2', 'paid', 'pi_123')`);
    await db.query(`select complete_order('O2', 'paid', 'pi_123')`); // duplicate webhook
    await db.query(`select complete_order('O2', 'delivered')`);
    assert.equal(await balance(A), 420);
    assert.equal((await one<{ payment_intent: string }>(`select payment_intent from orders where id = 'O2'`)).payment_intent, 'pi_123');
  });

  it('gives guest orders no points', async () => {
    await place(order('G1', { user_id: null }));
    await db.query(`select complete_order('G1', 'delivered')`);
    assert.equal((await one<{ n: number }>(`select count(*)::int as n from points_ledger where order_id = 'G1'`)).n, 0);
  });
});

describe('redeeming', () => {
  it('spends points atomically with the order', async () => {
    await place(order('O3', { points_redeemed: 400, discount: 20, points_earnable: 0 }));
    assert.equal(await balance(A), 20);
  });

  it('rejects spending more than the balance and creates no order', async () => {
    await assert.rejects(place(order('O4', { points_redeemed: 500 })), /insufficient_points/);
    assert.equal(await one(`select id from orders where id = 'O4'`), undefined);
    assert.equal(await balance(A), 20);
  });

  it('refuses points on a guest order', async () => {
    await assert.rejects(place(order('O5', { user_id: null, points_redeemed: 10 })), /points_require_account/);
  });

  it('refunds spent points when the payment fails, once', async () => {
    await db.query(`select cancel_order('O3', 'payment_failed')`);
    await db.query(`select cancel_order('O3', 'payment_failed')`);
    assert.equal(await balance(A), 420);
  });

  it('never revives a failed order with a late webhook', async () => {
    await db.query(`select complete_order('O3', 'paid')`);
    assert.equal((await one<{ status: string }>(`select status from orders where id = 'O3'`)).status, 'payment_failed');
  });
});

describe('cancelling', () => {
  it('takes back earned points, but only down to zero', async () => {
    // A has 420 = 300 (O1) + 120 (O2). Spend 400, then cancel O1 which earned 300.
    await place(order('O6', { points_redeemed: 400, points_earnable: 0 }));
    assert.equal(await balance(A), 20);
    await db.query(`select cancel_order('O1')`);
    assert.equal(await balance(A), 0);
    const rev = await one<{ delta: number }>(`select delta from points_ledger where order_id = 'O1' and reason = 'reverse_earn'`);
    assert.equal(rev.delta, -20);
  });

  it('keeps the balance equal to the sum of the ledger', async () => {
    const r = await one<{ bal: number; sum: number }>(
      `select p.points_balance as bal, coalesce(sum(l.delta), 0)::int as sum from profiles p left join points_ledger l on l.user_id = p.id where p.id = $1 group by p.points_balance`, [A]);
    assert.equal(r.bal, r.sum);
  });
});

describe('row-level security', () => {
  it('lets a customer read only their own orders and points', async () => {
    await place(order('B1', { user_id: B }));
    const rows = (await asUser(B, () => db.query('select id from orders order by id'))) as { rows: { id: string }[] };
    assert.deepEqual(rows.rows.map((r) => r.id), ['B1']);
    const pts = (await asUser(B, () => db.query('select * from points_ledger'))) as { rows: unknown[] };
    assert.equal(pts.rows.length, 0);
  });

  it('lets a customer change their name but not their balance or role', async () => {
    await asUser(B, () => db.query(`update profiles set name = 'Sara' where id = $1`, [B]));
    assert.equal((await one<{ name: string }>('select name from profiles where id = $1', [B])).name, 'Sara');
    await assert.rejects(asUser(B, () => db.query(`update profiles set points_balance = 99999 where id = $1`, [B])), /permission denied/);
    await assert.rejects(asUser(B, () => db.query(`update profiles set role = 'staff' where id = $1`, [B])), /permission denied/);
  });

  it('blocks customers from calling the points functions', async () => {
    await assert.rejects(asUser(B, () => db.query(`select apply_points($1, null, 1000, 'adjust')`, [B])), /permission denied/);
    await assert.rejects(asUser(B, () => db.query(`select complete_order('B1', 'delivered')`)), /permission denied/);
  });
});
