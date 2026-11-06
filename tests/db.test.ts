/**
 * Part B against a real (in-memory) Postgres: PGlite + the Drizzle migration in /drizzle.
 * Sign-in codes, points, orders, reviews and the admin password limit. Run: npm test
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import * as schema from '../src/lib/db/schema';
import {
  adjustPoints, adminLocked, approvedReviews, balanceOf, createOtp, createReview, deleteCustomer, getCustomer, hashCode,
  NotEnoughPoints, OTP_RULES, placeOrder, recordAdminFailure, reviewableProducts, reviewStats, setOrderStatus, setReviewStatus,
  verifyOtp, type Db, type NewOrder,
} from '../src/lib/db/store';
import { signValue, verifyValue } from '../src/lib/session-token';

const SECRET = 'test-secret-test-secret-test-secret';
let db: Db;
const T0 = new Date('2026-11-04T10:00:00Z');
const at = (ms: number) => new Date(T0.getTime() + ms);

async function signUp(phone: string, firstName = 'Sara', ip = '1.1.1.1', now = T0) {
  const s = await createOtp(db, { phone, ip, secret: SECRET, now });
  assert.ok(s.ok, JSON.stringify(s));
  const v = await verifyOtp(db, { phone, code: s.code, firstName, consent: true, secret: SECRET, now });
  assert.ok(v.ok);
  return v.customer;
}

const order = (id: string, customerId: string | null, extra: Partial<NewOrder> = {}): NewOrder => ({
  id, customerId, status: 'new', payment: 'cod', name: 'Sara', phone: '+971501234567',
  subtotal: 11800, discount: 0, deliveryFee: 1500, total: 13300, vat: 633, pointsRedeemed: 0, pointsEarnable: 118,
  promoCode: null, details: { lines: [{ productId: 'hawar-local', sizeId: 'bone-in', cutId: 'mandi', qty: 2 }] }, ...extra,
});

before(async () => {
  const client = new PGlite();
  db = drizzle(client, { schema }) as unknown as Db;
  await migrate(drizzle(client), { migrationsFolder: 'drizzle' });
});

describe('sign-in codes', () => {
  it('stores only a hash of the code, never the code', async () => {
    const s = await createOtp(db, { phone: '+971500000001', ip: '9.9.9.1', secret: SECRET, now: T0 });
    assert.ok(s.ok);
    const rows = await db.select().from(schema.otpCodes);
    const row = rows.find((r) => r.phone === '+971500000001')!;
    assert.notEqual(row.codeHash, s.code);
    assert.ok(!row.codeHash.includes(s.code));
    assert.equal(row.codeHash, hashCode(SECRET, '+971500000001', s.code));
    assert.match(s.code, /^\d{6}$/);
  });

  it('expires after 5 minutes', async () => {
    const phone = '+971500000002';
    const s = await createOtp(db, { phone, ip: '9.9.9.2', secret: SECRET, now: T0 });
    assert.ok(s.ok);
    const v = await verifyOtp(db, { phone, code: s.code, firstName: 'A', consent: true, secret: SECRET, now: at(OTP_RULES.ttlMs + 1) });
    assert.deepEqual(v, { ok: false, error: 'expired' });
  });

  it('allows 5 attempts, then refuses even the right code', async () => {
    const phone = '+971500000003';
    const s = await createOtp(db, { phone, ip: '9.9.9.3', secret: SECRET, now: T0 });
    assert.ok(s.ok);
    const wrong = s.code === '000000' ? '111111' : '000000';
    for (let i = 1; i <= 4; i++) {
      const v = await verifyOtp(db, { phone, code: wrong, firstName: 'A', consent: true, secret: SECRET, now: T0 });
      assert.deepEqual(v, { ok: false, error: 'wrong_code', attemptsLeft: 5 - i });
    }
    assert.deepEqual(await verifyOtp(db, { phone, code: wrong, firstName: 'A', consent: true, secret: SECRET, now: T0 }), { ok: false, error: 'too_many_attempts' });
    assert.deepEqual(await verifyOtp(db, { phone, code: s.code, firstName: 'A', consent: true, secret: SECRET, now: T0 }), { ok: false, error: 'too_many_attempts' });
  });

  it('resend only after 30 s; at most 3 codes per hour per number', async () => {
    const phone = '+971500000004';
    assert.ok((await createOtp(db, { phone, ip: '9.9.9.4', secret: SECRET, now: T0 })).ok);
    const early = await createOtp(db, { phone, ip: '9.9.9.4', secret: SECRET, now: at(10_000) });
    assert.equal(early.ok, false);
    assert.equal(!early.ok && early.error, 'wait');
    assert.equal(!early.ok && early.error === 'wait' && early.retryAfter, 20);
    assert.ok((await createOtp(db, { phone, ip: '9.9.9.4', secret: SECRET, now: at(31_000) })).ok);
    assert.ok((await createOtp(db, { phone, ip: '9.9.9.4', secret: SECRET, now: at(62_000) })).ok);
    const fourth = await createOtp(db, { phone, ip: '9.9.9.4', secret: SECRET, now: at(93_000) });
    assert.deepEqual(fourth, { ok: false, error: 'too_many_phone' });
    assert.ok((await createOtp(db, { phone, ip: '9.9.9.4', secret: SECRET, now: at(61 * 60_000) })).ok, 'allowed again after an hour');
  });

  it('at most 10 codes per hour per IP address', async () => {
    for (let i = 0; i < 10; i++) assert.ok((await createOtp(db, { phone: `+97150100${String(i).padStart(4, '0')}`, ip: '7.7.7.7', secret: SECRET, now: T0 })).ok);
    assert.deepEqual(await createOtp(db, { phone: '+971501009999', ip: '7.7.7.7', secret: SECRET, now: T0 }), { ok: false, error: 'too_many_ip' });
  });

  it('a new customer needs a first name and consent; a code works only once', async () => {
    const phone = '+971500000005';
    const s = await createOtp(db, { phone, ip: '9.9.9.5', secret: SECRET, now: T0 });
    assert.ok(s.ok);
    assert.deepEqual(await verifyOtp(db, { phone, code: s.code, firstName: 'Ali', consent: false, secret: SECRET, now: T0 }), { ok: false, error: 'bad_request' });
    const s2 = await createOtp(db, { phone, ip: '9.9.9.5', secret: SECRET, now: at(31_000) });
    assert.ok(s2.ok);
    const v = await verifyOtp(db, { phone, code: s2.code, firstName: 'Ali', consent: true, secret: SECRET, now: at(31_000) });
    assert.ok(v.ok && v.customer.firstName === 'Ali');
    assert.deepEqual(await verifyOtp(db, { phone, code: s2.code, firstName: 'Ali', consent: true, secret: SECRET, now: at(32_000) }), { ok: false, error: 'expired' });
  });
});

describe('session cookie', () => {
  it('is signed: tampering or expiry is rejected', () => {
    const v = signValue(SECRET, { cid: 'abc' }, 30 * 86400, T0);
    assert.deepEqual(verifyValue(SECRET, v, at(1000)), { cid: 'abc' });
    assert.equal(verifyValue(SECRET, v.replace(/^./, (c) => (c === 'a' ? 'b' : 'a')), at(1000)), null);
    assert.equal(verifyValue('other-secret-other-secret-other', v, at(1000)), null);
    assert.equal(verifyValue(SECRET, v, at(31 * 86400 * 1000)), null);
  });
});

describe('points', () => {
  it('are credited only when the order is marked delivered — once', async () => {
    const c = await signUp('+971502000001');
    await placeOrder(db, order('O-1', c.id));
    assert.equal(await balanceOf(db, c.id), 0, 'nothing on placing the order');
    assert.equal(await setOrderStatus(db, 'O-1', 'delivered'), true);
    assert.equal(await balanceOf(db, c.id), 118);
    assert.equal(await setOrderStatus(db, 'O-1', 'delivered'), false, 'cannot deliver twice');
    assert.equal(await balanceOf(db, c.id), 118);
  });

  it('spending is checked on the server against the real balance (no overspend)', async () => {
    const c = await signUp('+971502000002');
    await adjustPoints(db, c.id, 100, 'welcome');
    await assert.rejects(placeOrder(db, order('O-2', c.id, { pointsRedeemed: 150 })), NotEnoughPoints);
    assert.equal(await balanceOf(db, c.id), 100, 'failed order spends nothing');
    await placeOrder(db, order('O-3', c.id, { pointsRedeemed: 100, discount: 500 }));
    assert.equal(await balanceOf(db, c.id), 0);
    await assert.rejects(placeOrder(db, order('O-4', c.id, { pointsRedeemed: 100 })), NotEnoughPoints);
  });

  it('a guest cannot spend points', async () => {
    await assert.rejects(placeOrder(db, order('O-5', null, { pointsRedeemed: 10 })), NotEnoughPoints);
  });

  it('cancelling an order gives the spent points back (once) and never credits earned points', async () => {
    const c = await signUp('+971502000003');
    await adjustPoints(db, c.id, 200, 'test');
    await placeOrder(db, order('O-6', c.id, { pointsRedeemed: 200 }));
    assert.equal(await balanceOf(db, c.id), 0);
    assert.equal(await setOrderStatus(db, 'O-6', 'cancelled'), true);
    assert.equal(await balanceOf(db, c.id), 200);
    assert.equal(await setOrderStatus(db, 'O-6', 'delivered'), false);
    assert.equal(await balanceOf(db, c.id), 200);
  });

  it('admin can adjust points either way', async () => {
    const c = await signUp('+971502000004');
    await adjustPoints(db, c.id, 50, 'goodwill');
    await adjustPoints(db, c.id, -20, 'correction');
    assert.equal(await balanceOf(db, c.id), 30);
    await assert.rejects(adjustPoints(db, c.id, 1.5, 'x'));
  });
});

describe('reviews', () => {
  it('only after a delivered order with that product; pending until approved; one per customer per product', async () => {
    const c = await signUp('+971503000001', 'Mariam');
    assert.deepEqual(await createReview(db, { customerId: c.id, productId: 'hawar-local', stars: 5, text: 'Very fresh' }), { ok: false, error: 'not_eligible' });
    await placeOrder(db, order('R-1', c.id));
    assert.deepEqual(await createReview(db, { customerId: c.id, productId: 'hawar-local', stars: 5, text: 'Very fresh' }), { ok: false, error: 'not_eligible' }, 'not yet delivered');
    await setOrderStatus(db, 'R-1', 'delivered');
    assert.deepEqual(await reviewableProducts(db, c.id), ['hawar-local']);
    assert.deepEqual(await createReview(db, { customerId: c.id, productId: 'naimi-local', stars: 5, text: 'Very fresh' }), { ok: false, error: 'not_eligible' }, 'product not in the order');
    const r = await createReview(db, { customerId: c.id, productId: 'hawar-local', stars: 5, text: 'Very fresh' });
    assert.ok(r.ok);
    assert.deepEqual(await createReview(db, { customerId: c.id, productId: 'hawar-local', stars: 4, text: 'Again' }), { ok: false, error: 'already_reviewed' });
    assert.equal((await approvedReviews(db, 'hawar-local')).length, 0, 'pending reviews are not shown');
    await setReviewStatus(db, r.id, 'approved');
    const shown = await approvedReviews(db, 'hawar-local');
    assert.equal(shown.length, 1);
    assert.equal(shown[0].firstName, 'Mariam');
    assert.deepEqual(await reviewStats(db, 'hawar-local'), { count: 1, average: 5 });
    assert.deepEqual(await reviewableProducts(db, c.id), []);
  });

  it('rejects bad star values and empty text', async () => {
    const c = await signUp('+971503000002');
    await placeOrder(db, order('R-2', c.id));
    await setOrderStatus(db, 'R-2', 'delivered');
    assert.deepEqual(await createReview(db, { customerId: c.id, productId: 'hawar-local', stars: 6, text: 'Fine' }), { ok: false, error: 'bad_request' });
    assert.deepEqual(await createReview(db, { customerId: c.id, productId: 'hawar-local', stars: 4, text: ' ' }), { ok: false, error: 'bad_request' });
  });
});

describe('delete my account', () => {
  it('removes the customer, their points and reviews; orders stay without the link', async () => {
    const c = await signUp('+971504000001');
    await placeOrder(db, order('D-1', c.id));
    await setOrderStatus(db, 'D-1', 'delivered');
    const r = await createReview(db, { customerId: c.id, productId: 'hawar-local', stars: 5, text: 'Great' });
    assert.ok(r.ok);
    await deleteCustomer(db, c.id);
    assert.equal(await getCustomer(db, c.id), null);
    assert.equal(await balanceOf(db, c.id), 0);
    const [o] = await db.select().from(schema.orders).where((await import('drizzle-orm')).eq(schema.orders.id, 'D-1'));
    assert.equal(o.customerId, null);
    assert.equal((await db.select().from(schema.reviews)).filter((x) => x.customerId === c.id).length, 0);
  });
});

describe('admin password', () => {
  it('locks an IP address after 5 failures for 15 minutes', async () => {
    for (let i = 0; i < 5; i++) {
      assert.equal(await adminLocked(db, '5.5.5.5', T0), false);
      await recordAdminFailure(db, '5.5.5.5', T0);
    }
    assert.equal(await adminLocked(db, '5.5.5.5', at(60_000)), true);
    assert.equal(await adminLocked(db, '5.5.5.5', at(16 * 60_000)), false);
    assert.equal(await adminLocked(db, '6.6.6.6', T0), false);
  });
});
