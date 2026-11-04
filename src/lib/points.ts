/** Loyalty points rules (pure functions, shared by checkout UI and the API). */
import { site } from '@/config/site';
import { round2 } from './pricing';

export type Redemption = { blocks: number; freeDelivery: boolean };
export const NO_REDEMPTION: Redemption = { blocks: 0, freeDelivery: false };

const { moneyOff, freeDelivery, perAed } = site.points;

/** Points needed for a redemption. */
export const pointsFor = (r: Redemption) => r.blocks * moneyOff.points + (r.freeDelivery ? freeDelivery.points : 0);

/** Most money-off blocks the customer can use: limited by balance and by the products subtotal. */
export function maxBlocks(balance: number, subtotal: number, freeDeliveryToo: boolean) {
  const left = balance - (freeDeliveryToo ? freeDelivery.points : 0);
  return Math.max(0, Math.min(Math.floor(left / moneyOff.points), Math.floor(subtotal / moneyOff.aed)));
}

export type RedemptionCheck =
  | { ok: true; discount: number; freeDelivery: boolean; points: number }
  | { ok: false; error: 'not_enough_points' | 'too_much_discount' | 'no_delivery_fee' | 'bad_request' };

/** Validates a requested redemption against the balance and the order. */
export function checkRedemption(r: Redemption, balance: number, subtotal: number, deliveryFee: number): RedemptionCheck {
  if (!Number.isInteger(r.blocks) || r.blocks < 0 || r.blocks > 1000) return { ok: false, error: 'bad_request' };
  if (r.freeDelivery && deliveryFee <= 0) return { ok: false, error: 'no_delivery_fee' };
  const points = pointsFor(r);
  if (points > balance) return { ok: false, error: 'not_enough_points' };
  const discount = round2(r.blocks * moneyOff.aed);
  if (discount > subtotal) return { ok: false, error: 'too_much_discount' };
  return { ok: true, discount, freeDelivery: r.freeDelivery, points };
}

/** Points earned on an order: whole AED paid for products (after discount, delivery excluded). */
export const pointsEarned = (subtotal: number, discount: number) => Math.max(0, Math.floor((subtotal - discount) * perAed));

/** Progress towards the next money-off reward, for the account page. */
export function nextReward(balance: number) {
  const step = moneyOff.points;
  const toNext = balance % step === 0 && balance > 0 ? 0 : step - (balance % step);
  return { blocksNow: Math.floor(balance / step), aedNow: Math.floor(balance / step) * moneyOff.aed, toNext, pct: ((balance % step) / step) * 100 };
}
