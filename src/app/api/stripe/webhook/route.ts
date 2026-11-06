import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { notifyBusiness } from '@/lib/server/notify';
import { setOrderStatus } from '@/lib/db/store';
import { getDb } from '@/lib/server/db';

/**
 * Stripe webhook: the source of truth that a card / Apple Pay / Google Pay order was paid.
 * Register https://<your-domain>/api/stripe/webhook in the Stripe dashboard for
 * payment_intent.succeeded, payment_intent.payment_failed and payment_intent.canceled,
 * and set STRIPE_WEBHOOK_SECRET.
 *
 * Paid → order becomes "new" (to prepare). Failed/canceled → points spent on it are given back.
 * Points are earned only when the shop marks the order delivered. Both changes happen at most once,
 * so Stripe's retries are harmless.
 */
export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !secret) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const stripe = new Stripe(key);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), req.headers.get('stripe-signature') ?? '', secret);
  } catch {
    return NextResponse.json({ error: 'bad_signature' }, { status: 400 });
  }

  const handled = ['payment_intent.succeeded', 'payment_intent.payment_failed', 'payment_intent.canceled'];
  if (!handled.includes(event.type)) return NextResponse.json({ received: true });

  const pi = event.data.object as Stripe.PaymentIntent;
  const orderId = pi.metadata.orderId;
  const paid = event.type === 'payment_intent.succeeded';
  const db = getDb();
  if (db && orderId) {
    try {
      // false = unknown order or already moved on (e.g. a Stripe test event or a retry): acknowledge either way.
      await setOrderStatus(db, orderId, paid ? 'new' : 'payment_failed', { paymentIntent: pi.id });
    } catch (e) {
      console.error('webhook db error', e);
      return NextResponse.json({ error: 'db' }, { status: 500 }); // Stripe retries later
    }
  }
  await notifyBusiness('order-paid', {
    orderId, status: paid ? 'paid' : 'payment_failed', amount: pi.amount / 100, currency: pi.currency.toUpperCase(), paymentIntent: pi.id,
  });
  return NextResponse.json({ received: true });
}
