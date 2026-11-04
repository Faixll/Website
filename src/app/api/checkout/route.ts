import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { site } from '@/config/site';
import { cuts, productById } from '@/data/catalog';
import { branchById } from '@/data/places';
import { normaliseUaeMobile } from '@/lib/format';
import { cleanLines, fulfilmentOf, newOrderId, priceOrder, validateOrder, type OrderInput } from '@/lib/order';
import { NO_REDEMPTION, pointsEarned, type Redemption } from '@/lib/points';
import { linePrice } from '@/lib/pricing';
import { notifyBusiness } from '@/lib/server/notify';
import { currentProfile, supabaseAdmin } from '@/lib/supabase/server';

const str = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);
const fail = (error: string, status: number, extra: Record<string, unknown> = {}) => NextResponse.json({ error, ...extra }, { status });

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b) return fail('bad_request', 400);

  const input: OrderInput = {
    lang: b.lang === 'en' ? 'en' : 'ar',
    name: str(b.name, 100),
    phone: str(b.phone, 30),
    fulfilment: b.fulfilment === 'pickup' ? 'pickup' : 'delivery',
    emirate: str(b.emirate, 40),
    area: str(b.area, 80),
    street: str(b.street),
    building: str(b.building),
    apartment: str(b.apartment, 40),
    branchId: str(b.branchId, 40),
    slot: b.slot ? { date: str(b.slot.date, 10), slotId: str(b.slot.slotId, 10) } : null,
    payment: b.payment === 'card' || b.payment === 'wallet' ? b.payment : 'cod',
    lines: Array.isArray(b.lines) ? b.lines : [],
  };
  const redeem: Redemption = b.redeem
    ? { blocks: Number(b.redeem.blocks) || 0, freeDelivery: b.redeem.freeDelivery === true }
    : NO_REDEMPTION;
  const wantsPoints = redeem.blocks > 0 || redeem.freeDelivery;
  const promoCode = str(b.promoCode, 30);

  const errors = validateOrder(input);
  if (Object.keys(errors).length) return fail('invalid', 422, { fields: errors });

  const profile = await currentProfile();
  if (wantsPoints && !profile) return fail('sign_in_required', 401);

  // Prices are recomputed from the catalogue; nothing price-related from the browser is trusted.
  const lines = cleanLines(input.lines);
  const f = fulfilmentOf(input);
  const priced = priceOrder(lines, f, { redeem, promoCode, balance: profile?.points_balance ?? 0 });
  if (!priced.ok) return fail(priced.error, 409);
  const t = priced.totals;

  const orderId = newOrderId();
  const phone = normaliseUaeMobile(input.phone)!;
  const payment = t.total === 0 ? 'points' : input.payment;
  if (payment !== 'cod' && payment !== 'points' && t.total < 2) return fail('amount_too_small', 409); // Stripe minimum
  const earnable = profile ? pointsEarned(t.subtotal, t.discount) : 0;

  const details = {
    fulfilment:
      input.fulfilment === 'pickup'
        ? { type: 'pickup', branchId: input.branchId, branch: branchById(input.branchId)!.name.en }
        : { type: 'delivery', emirate: input.emirate, area: input.area, street: input.street, building: input.building, apartment: input.apartment },
    slot: input.slot,
    lines: lines.map((l) => {
      const p = productById(l.productId)!;
      return {
        productId: p.id, sizeId: l.sizeId, cutId: l.cutId, qty: l.qty, notes: l.notes, total: linePrice(l),
        product: p.name.en, size: p.sizes.find((s) => s.id === l.sizeId)!.name.en, cut: cuts[l.cutId].name.en,
      };
    }),
    freeDelivery: t.deliveryFee === 0 && t.baseDeliveryFee > 0,
    promo: priced.promoCode ? { code: priced.promoCode, discount: priced.promoDiscount } : null,
    pointsDiscount: priced.pointsDiscount,
    lang: input.lang,
  };
  const status = payment === 'points' ? 'paid' : payment === 'cod' ? 'pending_cod' : 'awaiting_payment';
  const record = {
    id: orderId, user_id: profile?.id ?? null, status, payment, name: input.name, phone,
    subtotal: t.subtotal, discount: t.discount, delivery_fee: t.deliveryFee, total: t.total, vat: t.vat,
    points_redeemed: priced.pointsUsed, points_earnable: earnable, promo_code: priced.promoCode, details,
  };

  // Persist (when Supabase is configured). Spending points happens atomically with the insert.
  const db = supabaseAdmin();
  if (db) {
    const { error } = await db.rpc('place_order', { p_order: record });
    if (error) {
      if (error.message.includes('insufficient_points')) return fail('not_enough_points', 409);
      console.error('place_order failed', error);
      return fail('order_failed', 500);
    }
    if (payment === 'points') await db.rpc('complete_order', { p_order: orderId, p_status: 'paid' });
  } else if (wantsPoints) {
    return fail('accounts_not_configured', 503);
  }

  const notify = { ...record, currency: site.currency };
  if (payment === 'cod' || payment === 'points') {
    await notifyBusiness('order', notify);
    return NextResponse.json({ orderId, total: t.total, pointsEarnable: earnable });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  const cancel = async () => { if (db) await db.rpc('cancel_order', { p_order: orderId, p_status: 'payment_failed' }); };
  if (!key) { await cancel(); return fail('payments_not_configured', 503); }

  try {
    const stripe = new Stripe(key);
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(t.total * 100), // fils
      currency: 'aed',
      automatic_payment_methods: { enabled: true },
      description: `${site.name.en} order ${orderId}`,
      metadata: {
        orderId,
        phone,
        name: input.name.slice(0, 100),
        fulfilment: input.fulfilment,
        summary: details.lines.map((l) => `${l.qty}x ${l.product} (${l.size}, ${l.cut})`).join('; ').slice(0, 480),
      },
    });
    if (db) await db.from('orders').update({ payment_intent: intent.id }).eq('id', orderId);
    await notifyBusiness('order', { ...notify, paymentIntent: intent.id });
    return NextResponse.json({ orderId, total: t.total, clientSecret: intent.client_secret, pointsEarnable: earnable });
  } catch (e) {
    console.error('stripe intent failed', e);
    await cancel(); // gives back any points spent on this order
    return fail('order_failed', 502);
  }
}
