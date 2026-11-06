/**
 * Database schema (Drizzle + Postgres — Neon or Supabase Postgres both work).
 * Money is stored in fils (1 AED = 100 fils) as integers, so there are no rounding surprises.
 * Migrations: `npx drizzle-kit generate` writes SQL into /drizzle; `npm run db:migrate` applies it.
 */
import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/** A signed-in customer. Only first name and UAE mobile are kept (plus when they agreed to the terms). */
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').notNull().unique(), // E.164, +9715XXXXXXXX
  firstName: text('first_name').notNull(),
  consentAt: timestamp('consent_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** One-time sign-in codes. Only an HMAC hash of the code is stored, never the code itself. */
export const otpCodes = pgTable('otp_codes', {
  id: serial('id').primaryKey(),
  phone: text('phone').notNull(),
  codeHash: text('code_hash').notNull(),
  ip: text('ip').notNull(),
  attempts: integer('attempts').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('otp_phone_created').on(t.phone, t.createdAt), index('otp_ip_created').on(t.ip, t.createdAt)]);

/** Every order placed on the site (guest or signed in). */
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  /** new → delivered | cancelled; card/wallet orders start as awaiting_payment (then new, or payment_failed). */
  status: text('status').notNull(),
  payment: text('payment').notNull(), // cod | card | wallet | points
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  subtotal: integer('subtotal_fils').notNull(),
  discount: integer('discount_fils').notNull(),
  deliveryFee: integer('delivery_fee_fils').notNull(),
  total: integer('total_fils').notNull(),
  vat: integer('vat_fils').notNull(),
  pointsRedeemed: integer('points_redeemed').notNull().default(0),
  pointsEarnable: integer('points_earnable').notNull().default(0),
  promoCode: text('promo_code'),
  paymentIntent: text('payment_intent'),
  details: jsonb('details').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
}, (t) => [index('orders_customer').on(t.customerId), index('orders_created').on(t.createdAt)]);

/**
 * Points ledger: the balance is the sum of `delta`. Points are credited only when an order is marked
 * delivered; the unique (order, reason) index makes crediting / spending / refunding happen at most once.
 */
export const pointsLedger = pgTable('points_ledger', {
  id: serial('id').primaryKey(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  delta: integer('delta').notNull(),
  reason: text('reason').notNull(), // order_delivered | redeem | refund | admin_adjust
  orderId: text('order_id'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('ledger_customer').on(t.customerId),
  uniqueIndex('ledger_order_reason').on(t.orderId, t.reason).where(sql`${t.orderId} is not null`),
]);

/** Customer reviews: only after a delivered order containing the product; one per customer per product; shown once approved. */
export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull(),
  orderId: text('order_id').notNull(),
  firstName: text('first_name').notNull(),
  stars: integer('stars').notNull(),
  text: text('text').notNull(),
  status: text('status').notNull().default('pending'), // pending | approved | rejected
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('reviews_one_per_product').on(t.customerId, t.productId),
  index('reviews_product_status').on(t.productId, t.status),
  check('reviews_stars', sql`${t.stars} between 1 and 5`),
]);

/** Failed admin password attempts (rate limit). */
export const loginAttempts = pgTable('login_attempts', {
  id: serial('id').primaryKey(),
  ip: text('ip').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('login_attempts_ip').on(t.ip, t.createdAt)]);

export type Customer = typeof customers.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type ReviewRow = typeof reviews.$inferSelect;
