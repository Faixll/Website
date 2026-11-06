/**
 * Everything that reads or writes the database. Plain functions that take the database as an argument,
 * so the same code runs on Postgres in production and on PGlite in the tests.
 * (No 'server-only' import here so `npm test` can load it; only server code imports this file.)
 */
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { and, count, desc, eq, gt, inArray, isNull, sql, sum } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';
import { customers, loginAttempts, orders, otpCodes, pointsLedger, reviews } from './schema';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIN = 60_000;
export const OTP_RULES = { ttlMs: 5 * MIN, maxAttempts: 5, resendAfterMs: 30_000, perPhonePerHour: 3, perIpPerHour: 10 } as const;
export const ADMIN_RULES = { maxFailures: 5, windowMs: 15 * MIN } as const;

export const toFils = (aed: number) => Math.round(aed * 100);
export const toAed = (fils: number) => fils / 100;

/* ================================================================ sign-in codes */

export const hashCode = (secret: string, phone: string, code: string) => createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');
export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

export type StartResult = { ok: true; code: string } | { ok: false; error: 'wait'; retryAfter: number } | { ok: false; error: 'too_many_phone' | 'too_many_ip' };

/** Creates a code for this phone if the limits allow. The caller sends it (lib/otp.ts) — the code is never stored. */
export async function createOtp(db: Db, a: { phone: string; ip: string; secret: string; now?: Date }): Promise<StartResult> {
  const now = a.now ?? new Date();
  const hourAgo = new Date(now.getTime() - 60 * MIN);
  const [last] = await db.select({ createdAt: otpCodes.createdAt }).from(otpCodes).where(eq(otpCodes.phone, a.phone)).orderBy(desc(otpCodes.createdAt)).limit(1);
  if (last && now.getTime() - last.createdAt.getTime() < OTP_RULES.resendAfterMs) {
    return { ok: false, error: 'wait', retryAfter: Math.ceil((OTP_RULES.resendAfterMs - (now.getTime() - last.createdAt.getTime())) / 1000) };
  }
  const [{ n: byPhone }] = await db.select({ n: count() }).from(otpCodes).where(and(eq(otpCodes.phone, a.phone), gt(otpCodes.createdAt, hourAgo)));
  if (byPhone >= OTP_RULES.perPhonePerHour) return { ok: false, error: 'too_many_phone' };
  const [{ n: byIp }] = await db.select({ n: count() }).from(otpCodes).where(and(eq(otpCodes.ip, a.ip), gt(otpCodes.createdAt, hourAgo)));
  if (byIp >= OTP_RULES.perIpPerHour) return { ok: false, error: 'too_many_ip' };

  const code = newCode();
  await db.insert(otpCodes).values({ phone: a.phone, ip: a.ip, codeHash: hashCode(a.secret, a.phone, code), expiresAt: new Date(now.getTime() + OTP_RULES.ttlMs), createdAt: now });
  return { ok: true, code };
}

export type VerifyResult =
  | { ok: true; customer: schema.Customer }
  | { ok: false; error: 'expired' | 'too_many_attempts' | 'bad_request' }
  | { ok: false; error: 'wrong_code'; attemptsLeft: number };

/** Checks the newest unused code for this phone; on success signs the customer up (or in). */
export async function verifyOtp(db: Db, a: { phone: string; code: string; firstName: string; consent: boolean; secret: string; now?: Date }): Promise<VerifyResult> {
  const now = a.now ?? new Date();
  if (!/^\d{6}$/.test(a.code)) return { ok: false, error: 'bad_request' };
  const [row] = await db.select().from(otpCodes).where(and(eq(otpCodes.phone, a.phone), isNull(otpCodes.consumedAt))).orderBy(desc(otpCodes.createdAt)).limit(1);
  if (!row || row.expiresAt <= now) return { ok: false, error: 'expired' };
  if (row.attempts >= OTP_RULES.maxAttempts) return { ok: false, error: 'too_many_attempts' };

  const want = Buffer.from(row.codeHash, 'hex');
  const got = Buffer.from(hashCode(a.secret, a.phone, a.code), 'hex');
  if (want.length !== got.length || !timingSafeEqual(want, got)) {
    const attempts = row.attempts + 1;
    await db.update(otpCodes).set({ attempts }).where(eq(otpCodes.id, row.id));
    return attempts >= OTP_RULES.maxAttempts ? { ok: false, error: 'too_many_attempts' } : { ok: false, error: 'wrong_code', attemptsLeft: OTP_RULES.maxAttempts - attempts };
  }
  await db.update(otpCodes).set({ consumedAt: now }).where(eq(otpCodes.id, row.id));

  const [existing] = await db.select().from(customers).where(eq(customers.phone, a.phone)).limit(1);
  if (existing) {
    if (a.firstName && a.firstName !== existing.firstName) {
      const [c] = await db.update(customers).set({ firstName: a.firstName }).where(eq(customers.id, existing.id)).returning();
      return { ok: true, customer: c };
    }
    return { ok: true, customer: existing };
  }
  if (!a.firstName || !a.consent) return { ok: false, error: 'bad_request' };
  const [c] = await db.insert(customers).values({ phone: a.phone, firstName: a.firstName, consentAt: now }).returning();
  return { ok: true, customer: c };
}

/* ================================================================ customers + points */

export async function balanceOf(db: Db, customerId: string) {
  const [r] = await db.select({ s: sum(pointsLedger.delta) }).from(pointsLedger).where(eq(pointsLedger.customerId, customerId));
  return Number(r?.s ?? 0);
}

export async function getCustomer(db: Db, id: string) {
  const [c] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  if (!c) return null;
  return { id: c.id, firstName: c.firstName, phone: c.phone, points: await balanceOf(db, c.id) };
}
export type Me = NonNullable<Awaited<ReturnType<typeof getCustomer>>>;

/** "Delete my account": removes the customer, their points and reviews; their past orders stay for the shop's records without the link. */
export async function deleteCustomer(db: Db, id: string) {
  const [c] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  if (!c) return;
  await db.transaction(async (tx) => {
    await tx.update(orders).set({ customerId: null }).where(eq(orders.customerId, id));
    await tx.delete(otpCodes).where(eq(otpCodes.phone, c.phone));
    await tx.delete(customers).where(eq(customers.id, id)); // ledger + reviews cascade
  });
}

export async function adjustPoints(db: Db, customerId: string, delta: number, note: string) {
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 1_000_000) throw new Error('bad_delta');
  await db.insert(pointsLedger).values({ customerId, delta, reason: 'admin_adjust', note: note.slice(0, 200) });
}

/* ================================================================ orders */

export type NewOrder = Omit<typeof orders.$inferInsert, 'createdAt' | 'deliveredAt'>;
export class NotEnoughPoints extends Error { constructor() { super('not_enough_points'); } }

/** Saves an order. Spending points happens in the same transaction, with the customer row locked, so a balance can't be spent twice. */
export async function placeOrder(db: Db, o: NewOrder) {
  await db.transaction(async (tx) => {
    if (o.pointsRedeemed && o.pointsRedeemed > 0) {
      if (!o.customerId) throw new NotEnoughPoints();
      await tx.select({ id: customers.id }).from(customers).where(eq(customers.id, o.customerId)).for('update');
      const [r] = await tx.select({ s: sum(pointsLedger.delta) }).from(pointsLedger).where(eq(pointsLedger.customerId, o.customerId));
      if (Number(r?.s ?? 0) < o.pointsRedeemed) throw new NotEnoughPoints();
    }
    await tx.insert(orders).values(o);
    if (o.pointsRedeemed && o.pointsRedeemed > 0) {
      await tx.insert(pointsLedger).values({ customerId: o.customerId!, delta: -o.pointsRedeemed, reason: 'redeem', orderId: o.id });
    }
  });
}

export type OrderStatus = 'awaiting_payment' | 'new' | 'delivered' | 'cancelled' | 'payment_failed';
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: ['new', 'payment_failed', 'cancelled'],
  new: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
  payment_failed: [],
};

/**
 * Moves an order on. Delivered → the earned points are credited (once). Cancelled / payment failed → points
 * spent on it are given back (once). Returns false if the change isn't allowed.
 */
export async function setOrderStatus(db: Db, id: string, to: OrderStatus, extra: { paymentIntent?: string; now?: Date } = {}) {
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, id)).for('update');
    if (!o || !NEXT[o.status as OrderStatus]?.includes(to)) return false;
    await tx.update(orders).set({
      status: to,
      ...(to === 'delivered' ? { deliveredAt: extra.now ?? new Date() } : {}),
      ...(extra.paymentIntent ? { paymentIntent: extra.paymentIntent } : {}),
    }).where(eq(orders.id, id));
    if (o.customerId && to === 'delivered' && o.pointsEarnable > 0) {
      await tx.insert(pointsLedger).values({ customerId: o.customerId, delta: o.pointsEarnable, reason: 'order_delivered', orderId: id }).onConflictDoNothing();
    }
    if (o.customerId && (to === 'cancelled' || to === 'payment_failed') && o.pointsRedeemed > 0) {
      await tx.insert(pointsLedger).values({ customerId: o.customerId, delta: o.pointsRedeemed, reason: 'refund', orderId: id }).onConflictDoNothing();
    }
    return true;
  });
}

export async function setPaymentIntent(db: Db, id: string, paymentIntent: string) {
  await db.update(orders).set({ paymentIntent }).where(eq(orders.id, id));
}

export async function listOrders(db: Db, a: { status?: string; limit?: number } = {}) {
  const q = db.select().from(orders);
  const rows = await (a.status ? q.where(eq(orders.status, a.status)) : q).orderBy(desc(orders.createdAt)).limit(a.limit ?? 100);
  return rows;
}

export async function ordersForCustomer(db: Db, customerId: string, limit = 20) {
  return db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt)).limit(limit);
}

/* ================================================================ reviews */

type Line = { productId: string };
const hasProduct = (o: schema.OrderRow, productId: string) => ((o.details as { lines?: Line[] }).lines ?? []).some((l) => l.productId === productId);

/** The delivered order that lets this customer review this product, or null. */
export async function reviewableOrder(db: Db, customerId: string, productId: string) {
  const delivered = await db.select().from(orders).where(and(eq(orders.customerId, customerId), eq(orders.status, 'delivered'))).orderBy(desc(orders.deliveredAt));
  return delivered.find((o) => hasProduct(o, productId))?.id ?? null;
}

/** Product ids this customer can still review (delivered, not reviewed yet). */
export async function reviewableProducts(db: Db, customerId: string) {
  const delivered = await db.select().from(orders).where(and(eq(orders.customerId, customerId), eq(orders.status, 'delivered')));
  const done = new Set((await db.select({ p: reviews.productId }).from(reviews).where(eq(reviews.customerId, customerId))).map((r) => r.p));
  return [...new Set(delivered.flatMap((o) => ((o.details as { lines?: Line[] }).lines ?? []).map((l) => l.productId)))].filter((p) => !done.has(p));
}

export type ReviewResult = { ok: true; id: number } | { ok: false; error: 'not_eligible' | 'already_reviewed' | 'bad_request' };

export async function createReview(db: Db, a: { customerId: string; productId: string; stars: number; text: string }): Promise<ReviewResult> {
  const text = a.text.trim().slice(0, 600);
  if (!Number.isInteger(a.stars) || a.stars < 1 || a.stars > 5 || text.length < 3) return { ok: false, error: 'bad_request' };
  const orderId = await reviewableOrder(db, a.customerId, a.productId);
  if (!orderId) return { ok: false, error: 'not_eligible' };
  const [c] = await db.select().from(customers).where(eq(customers.id, a.customerId)).limit(1);
  if (!c) return { ok: false, error: 'not_eligible' };
  const [r] = await db.insert(reviews).values({ customerId: a.customerId, productId: a.productId, orderId, firstName: c.firstName, stars: a.stars, text, status: 'pending' })
    .onConflictDoNothing().returning({ id: reviews.id });
  return r ? { ok: true, id: r.id } : { ok: false, error: 'already_reviewed' };
}

export async function approvedReviews(db: Db, productId?: string, limit = 20) {
  const where = productId ? and(eq(reviews.status, 'approved'), eq(reviews.productId, productId)) : eq(reviews.status, 'approved');
  return db.select().from(reviews).where(where).orderBy(desc(reviews.createdAt)).limit(limit);
}

export async function reviewStats(db: Db, productId?: string) {
  const where = productId ? and(eq(reviews.status, 'approved'), eq(reviews.productId, productId)) : eq(reviews.status, 'approved');
  const [r] = await db.select({ n: count(), avg: sql<string | null>`avg(${reviews.stars})` }).from(reviews).where(where);
  return { count: r.n, average: r.avg == null ? null : Math.round(Number(r.avg) * 10) / 10 };
}

export async function reviewsByStatus(db: Db, status: 'pending' | 'approved' | 'rejected', limit = 100) {
  return db.select().from(reviews).where(eq(reviews.status, status)).orderBy(desc(reviews.createdAt)).limit(limit);
}

export async function setReviewStatus(db: Db, id: number, status: 'approved' | 'rejected') {
  await db.update(reviews).set({ status }).where(eq(reviews.id, id));
}

/* ================================================================ admin password rate limit */

export async function adminLocked(db: Db, ip: string, now = new Date()) {
  const [{ n }] = await db.select({ n: count() }).from(loginAttempts).where(and(eq(loginAttempts.ip, ip), gt(loginAttempts.createdAt, new Date(now.getTime() - ADMIN_RULES.windowMs))));
  return n >= ADMIN_RULES.maxFailures;
}
export async function recordAdminFailure(db: Db, ip: string, now = new Date()) {
  await db.insert(loginAttempts).values({ ip, createdAt: now });
}

/** Look up customers by id for the admin pages. */
export async function customersById(db: Db, ids: string[]) {
  if (!ids.length) return new Map<string, schema.Customer>();
  const rows = await db.select().from(customers).where(inArray(customers.id, ids));
  return new Map(rows.map((r) => [r.id, r]));
}
