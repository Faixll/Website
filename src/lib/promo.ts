import { promos, type Promo } from '@/data/promos';
import { round2 } from './pricing';
import { uaeNow } from './uae-time';

/** Codes are matched case-insensitively, ignoring spaces and dashes ("nation day" → NATIONDAY). */
export const normaliseCode = (s: string) => s.toUpperCase().replace(/[\s\-_]/g, '').slice(0, 30);

export type PromoCheck =
  | { ok: true; promo: Promo; discount: number; freeDelivery: boolean }
  | { ok: false; error: 'invalid_code' | 'expired' | 'min_order' | 'no_delivery_fee' };

function inWindow(p: Promo, now: Date) {
  if (!p.yearly) return true;
  const u = uaeNow(now);
  const md = `${String(u.getUTCMonth() + 1).padStart(2, '0')}-${String(u.getUTCDate()).padStart(2, '0')}`;
  const { from, to } = p.yearly;
  return from <= to ? md >= from && md <= to : md >= from || md <= to; // supports ranges over New Year
}

export function checkPromo(code: string, subtotal: number, baseDeliveryFee: number, now = new Date()): PromoCheck {
  const c = normaliseCode(code);
  const p = promos.find((x) => x.active !== false && normaliseCode(x.code) === c);
  if (!p) return { ok: false, error: 'invalid_code' };
  if (!inWindow(p, now)) return { ok: false, error: 'expired' };
  if (p.minOrder && subtotal < p.minOrder) return { ok: false, error: 'min_order' };
  if (p.type === 'freeDelivery') {
    if (baseDeliveryFee <= 0) return { ok: false, error: 'no_delivery_fee' };
    return { ok: true, promo: p, discount: 0, freeDelivery: true };
  }
  let d = p.type === 'percent' ? (subtotal * p.value) / 100 : p.value;
  if (p.maxDiscount) d = Math.min(d, p.maxDiscount);
  return { ok: true, promo: p, discount: round2(Math.min(d, subtotal)), freeDelivery: false };
}
