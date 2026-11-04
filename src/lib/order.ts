/**
 * Order validation shared by the client (instant feedback) and the API (authoritative).
 * The server never trusts prices from the browser: totals are recomputed from the catalogue.
 */
import { site, type Lang } from '@/config/site';
import { allowedCuts, productById, validQty, type CutId } from '@/data/catalog';
import { branchById, emirates } from '@/data/places';
import { normaliseUaeMobile } from './format';
import { checkRedemption, type Redemption } from './points';
import { checkPromo } from './promo';
import { lineKey, totals, type CartLine, type Fulfilment } from './pricing';
import { slotAvailable, slotDays } from './uae-time';

export type PaymentMethod = 'wallet' | 'card' | 'cod';

export type OrderInput = {
  lang: Lang;
  name: string;
  phone: string;
  fulfilment: 'delivery' | 'pickup';
  emirate: string;
  area: string;
  street: string;
  building: string;
  apartment: string;
  branchId: string;
  slot: { date: string; slotId: string } | null;
  payment: PaymentMethod;
  lines: Pick<CartLine, 'productId' | 'sizeId' | 'cutId' | 'notes' | 'qty'>[];
};

export type FieldErrors = Partial<Record<'name' | 'phone' | 'emirate' | 'area' | 'street' | 'building' | 'branchId' | 'slot' | 'lines' | 'minOrder', string>>;

/** Returns field → error-code map. Codes are translated by the client. */
export function validateOrder(o: OrderInput, now = new Date()): FieldErrors {
  const e: FieldErrors = {};
  if (!o.name.trim() || o.name.trim().length > 100) e.name = 'required';
  if (!normaliseUaeMobile(o.phone)) e.phone = 'phone';
  if (o.fulfilment === 'delivery') {
    const em = emirates.find((x) => x.id === o.emirate);
    if (!em) e.emirate = 'required';
    else if (!em.areas.some((a) => a.en === o.area)) e.area = 'required';
    if (!o.street.trim()) e.street = 'required';
    if (!o.building.trim()) e.building = 'required';
  } else if (!branchById(o.branchId)) e.branchId = 'required';

  const day = o.slot && slotDays(site.delivery.daysAhead, now).find((d) => d.date === o.slot!.date);
  const s = o.slot && site.delivery.slots.find((x) => x.id === o.slot!.slotId);
  if (!day || !s || !slotAvailable(day.offset, s.start, now)) e.slot = 'required';

  const lines = cleanLines(o.lines);
  if (!lines.length) e.lines = 'required';
  const t = totals(lines, fulfilmentOf(o));
  if (t.minOrder && t.subtotal < t.minOrder) e.minOrder = 'min';
  return e;
}

export const fulfilmentOf = (o: Pick<OrderInput, 'fulfilment' | 'emirate' | 'branchId'>): Fulfilment | null =>
  o.fulfilment === 'pickup' ? (o.branchId ? { type: 'pickup', branchId: o.branchId } : null) : o.emirate ? { type: 'delivery', emirate: o.emirate } : null;

/** Keep only valid, in-stock lines with sane quantities. */
export function cleanLines(lines: OrderInput['lines']): CartLine[] {
  if (!Array.isArray(lines)) return [];
  return lines.slice(0, 50).flatMap((l) => {
    const p = productById(String(l?.productId));
    if (!p || p.stock === 'out') return [];
    if (!p.sizes.some((s) => s.id === l.sizeId) || !allowedCuts(p).includes(l.cutId as CutId)) return [];
    const qty = Number(l.qty);
    if (!validQty(p, qty)) return [];
    const notes = String(l.notes ?? '').slice(0, 200);
    return [{ productId: p.id, sizeId: l.sizeId, cutId: l.cutId as CutId, notes, qty, key: lineKey(p.id, l.sizeId, l.cutId, notes) }];
  });
}

export function newOrderId() {
  const t = Date.now().toString(36).toUpperCase().slice(-5);
  const r = Math.floor(Math.random() * 36 ** 3).toString(36).toUpperCase().padStart(3, '0');
  return `HAB-${t}${r}`;
}

/* ---------------------------------------------------------------- discounts (points + promo codes) */

export type PricedOrder =
  | { ok: true; totals: ReturnType<typeof totals>; pointsUsed: number; promoCode: string | null; promoDiscount: number; pointsDiscount: number }
  | { ok: false; error: string };

/**
 * Applies a promo code and/or points to an order. Rules:
 *  - a promo code and a points money-off discount can't be combined;
 *  - free delivery with points is allowed alongside a promo code (unless the code already gives it).
 */
export function priceOrder(lines: CartLine[], f: Fulfilment | null, o: { redeem: Redemption; promoCode: string; balance: number; now?: Date }): PricedOrder {
  const base = totals(lines, f);
  let promoDiscount = 0;
  let freeDelivery = false;
  let promoCode: string | null = null;
  if (o.promoCode.trim()) {
    if (o.redeem.blocks > 0) return { ok: false, error: 'promo_with_points' };
    const p = checkPromo(o.promoCode, base.subtotal, base.baseDeliveryFee, o.now);
    if (!p.ok) return { ok: false, error: p.error };
    promoDiscount = p.discount;
    freeDelivery = p.freeDelivery;
    promoCode = p.promo.code;
  }
  const redeem = { blocks: o.redeem.blocks, freeDelivery: o.redeem.freeDelivery && !freeDelivery };
  const r = checkRedemption(redeem, o.balance, base.subtotal, base.baseDeliveryFee);
  if (!r.ok) return { ok: false, error: r.error };
  const t = totals(lines, f, { discount: promoDiscount + r.discount, freeDelivery: freeDelivery || r.freeDelivery });
  return { ok: true, totals: t, pointsUsed: r.points, promoCode, promoDiscount, pointsDiscount: r.discount };
}
