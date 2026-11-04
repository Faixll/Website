import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { notifyBusiness } from '@/lib/server/notify';
import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Stripe webhook: the source of truth that a card / Apple Pay / Google Pay order was paid.
 * Register https://<your-domain>/api/stripe/webhook in the Stripe dashboard for
 * payment_intent.succeeded, payment_intent.payment_failed and payment_intent.canceled,
 * and set STRIPE_WEBHOOK_SECRET.
 *
 * Paid → order marked paid and points credited. Failed/canceled → points spent on it are refunded.
 * Both database calls are idempotent, so Stripe's retries are harmless.
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
  const db = supabaseAdmin();
  if (db && orderId) {
    const { error } = paid
      ? await db.rpc('complete_order', { p_order: orderId, p_status: 'paid', p_payment_intent: pi.id })
      : await db.rpc('cancel_order', { p_order: orderId, p_status: 'payment_failed' });
    // 500 makes Stripe retry later (e.g. database briefly unavailable).
    // Unknown order (e.g. a Stripe test event): acknowledge so Stripe stops retrying.
    if (error && !error.message.includes('order_not_found')) { console.error('webhook db error', error); return NextResponse.json({ error: 'db' }, { status: 500 }); }
  }
  await notifyBusiness('order-paid', {
    orderId, status: paid ? 'paid' : 'payment_failed', amount: pi.amount / 100, currency: pi.currency.toUpperCase(), paymentIntent: pi.id,
  });
  return NextResponse.json({ received: true });
}
