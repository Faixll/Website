import { site } from '@/config/site';
import { cuts, productById, type CutId, type Product } from '@/data/catalog';

/** One line in the cart. Prices are always recomputed from the catalogue, never trusted from storage. */
export type CartLine = {
  key: string;
  productId: string;
  sizeId: string;
  cutId: CutId;
  notes: string;
  qty: number;
};

export const lineKey = (productId: string, sizeId: string, cutId: string, notes: string) =>
  [productId, sizeId, cutId, notes.trim()].join('|');

export const MAX_QTY = 20;

/** Unit price (one item) for a product with the chosen size and cut. */
export function unitPrice(p: Product, sizeId: string, cutId: CutId): number {
  const size = p.sizes.find((s) => s.id === sizeId) ?? p.sizes[0];
  const extra = p.cuts.includes(cutId) ? cuts[cutId].extra : 0;
  return round2(size.price + extra);
}

export function linePrice(line: CartLine): number {
  const p = productById(line.productId);
  if (!p) return 0;
  return round2(unitPrice(p, line.sizeId, line.cutId) * line.qty);
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** VAT contained in a VAT-inclusive amount. */
export const vatOf = (inclusive: number) => round2((inclusive * site.vatRate) / (1 + site.vatRate));

export type Fulfilment = { type: 'delivery'; emirate: string } | { type: 'pickup'; branchId: string };

export function deliveryFee(subtotal: number, f: Fulfilment | null): number {
  if (!f || f.type === 'pickup') return 0;
  if (subtotal >= site.delivery.freeAbove) return 0;
  return site.delivery.emirates[f.emirate]?.fee ?? 0;
}

export function minOrderFor(f: Fulfilment | null): number {
  if (!f || f.type === 'pickup') return 0;
  return site.delivery.emirates[f.emirate]?.minOrder ?? 0;
}

/** Order totals. `discount` (points money-off) comes off products; `freeDelivery` waives the fee. */
export function totals(lines: CartLine[], f: Fulfilment | null, r: { discount?: number; freeDelivery?: boolean } = {}) {
  const valid = lines.filter((l) => {
    const p = productById(l.productId);
    return p && p.stock !== 'out' && l.qty > 0;
  });
  const subtotal = round2(valid.reduce((s, l) => s + linePrice(l), 0));
  const baseFee = deliveryFee(subtotal, f);
  const fee = r.freeDelivery ? 0 : baseFee;
  const discount = round2(Math.min(Math.max(0, r.discount ?? 0), subtotal));
  const total = round2(subtotal - discount + fee);
  return {
    lines: valid,
    count: valid.reduce((s, l) => s + l.qty, 0),
    subtotal,
    deliveryFee: fee,
    /** Fee before any points waiver (decides whether free delivery can be redeemed). */
    baseDeliveryFee: baseFee,
    discount,
    total,
    vat: vatOf(total),
    minOrder: minOrderFor(f),
    remainingForFree: Math.max(0, round2(site.delivery.freeAbove - subtotal)),
  };
}
