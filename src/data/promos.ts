/**
 * Promo codes. Edit this list to add, change or retire codes.
 *
 * - `percent`: % off the products subtotal. `fixed`: AED off. `freeDelivery`: waives the delivery fee.
 * - `yearly`: valid every year between these month-day dates (inclusive, UAE time). Omit for "always".
 * - A promo code can't be combined with a points money-off discount (free delivery with points is fine).
 */
import type { L10n } from './catalog';

export type Promo = {
  code: string;
  type: 'percent' | 'fixed' | 'freeDelivery';
  value: number;
  name: L10n;
  yearly?: { from: string; to: string }; // "MM-DD"
  minOrder?: number;
  maxDiscount?: number;
  active?: boolean;
};

export const promos: Promo[] = [
  {
    code: 'NATIONDAY',
    type: 'percent',
    value: 15,
    name: { ar: 'عرض اليوم الوطني', en: 'National Day offer' },
    yearly: { from: '12-01', to: '12-03' },
  },
  {
    code: 'FAZZA',
    type: 'percent',
    value: 10,
    name: { ar: 'خصم فزعة', en: 'Fazaa discount' },
  },
];
