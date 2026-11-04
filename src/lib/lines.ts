import type { Lang } from '@/config/site';
import { cuts, productById } from '@/data/catalog';
import type { Dict } from './i18n';
import type { CartLine } from './pricing';

/** Formats an amount: "1.5 kg" for weight products, otherwise the number. */
export const amountLabel = (productId: string, qty: number, t: Dict) => (productById(productId)?.byWeight ? t.kgN(qty) : String(qty));

/** "Local Hawar Meat - Boneless - 2 kg - Mandi cut" (same structure in Arabic). */
export function lineLabel(l: Pick<CartLine, 'productId' | 'sizeId' | 'cutId' | 'qty' | 'notes'>, lang: Lang, t: Dict, opts: { withName?: boolean } = {}) {
  const p = productById(l.productId);
  if (!p) return '';
  const parts: string[] = [];
  if (opts.withName !== false) parts.push(p.name[lang]);
  const size = p.sizes.find((s) => s.id === l.sizeId);
  if (size && p.sizes.length > 1) parts.push(size.name[lang]);
  if (p.byWeight) parts.push(t.kgN(l.qty));
  if (p.cuts.length && p.cuts.includes(l.cutId)) parts.push(cuts[l.cutId].name[lang]);
  return parts.join(' - ');
}
