import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkRedemption, maxBlocks, nextReward, pointsEarned, pointsFor } from '../src/lib/points';
import { totals, vatOf } from '../src/lib/pricing';

const line = (productId: string, sizeId: string, cutId: string, qty: number) =>
  ({ key: `${productId}|${sizeId}|${cutId}|`, productId, sizeId, cutId, notes: '', qty }) as Parameters<typeof totals>[0][number];

describe('points rules', () => {
  it('earns 1 point per whole AED of products, after discount, excluding delivery', () => {
    assert.equal(pointsEarned(125, 0), 125);
    assert.equal(pointsEarned(129.99, 0), 129);
    assert.equal(pointsEarned(300, 25), 275);
  });

  it('prices redemptions', () => {
    assert.equal(pointsFor({ blocks: 2, freeDelivery: false }), 1000);
    assert.equal(pointsFor({ blocks: 1, freeDelivery: true }), 650);
  });

  it('limits money-off blocks by balance and subtotal', () => {
    assert.equal(maxBlocks(1240, 1000, false), 2);
    assert.equal(maxBlocks(1240, 1000, true), 2); // 1240 - 150 = 1090 → 2 blocks
    assert.equal(maxBlocks(640, 1000, true), 0); // 640 - 150 = 490 → 0
    assert.equal(maxBlocks(5000, 60, false), 2); // subtotal 60 → at most 2 × 25
  });

  it('validates redemptions', () => {
    assert.deepEqual(checkRedemption({ blocks: 1, freeDelivery: false }, 600, 100, 15), { ok: true, discount: 25, freeDelivery: false, points: 500 });
    assert.deepEqual(checkRedemption({ blocks: 2, freeDelivery: false }, 600, 100, 15), { ok: false, error: 'not_enough_points' });
    assert.deepEqual(checkRedemption({ blocks: 0, freeDelivery: true }, 600, 250, 0), { ok: false, error: 'no_delivery_fee' });
    assert.deepEqual(checkRedemption({ blocks: 3, freeDelivery: false }, 5000, 60, 0), { ok: false, error: 'too_much_discount' });
    assert.deepEqual(checkRedemption({ blocks: -1, freeDelivery: false }, 5000, 60, 0), { ok: false, error: 'bad_request' });
    assert.deepEqual(checkRedemption({ blocks: 1.5, freeDelivery: false }, 5000, 60, 0), { ok: false, error: 'bad_request' });
  });

  it('shows progress to the next reward', () => {
    assert.deepEqual(nextReward(0), { blocksNow: 0, aedNow: 0, toNext: 500, pct: 0 });
    assert.deepEqual(nextReward(1200), { blocksNow: 2, aedNow: 50, toNext: 300, pct: 40 });
  });
});

describe('totals with points', () => {
  const lines = [line('hawar-local', 'bone-in', 'mandi', 2)]; // 2 kg × 59 = 118.00
  const alAin = { type: 'delivery' as const, emirate: 'al-ain' }; // fee 15, free above 200

  it('applies money off and keeps VAT inside the total', () => {
    const t = totals(lines, alAin, { discount: 25 });
    assert.equal(t.subtotal, 118);
    assert.equal(t.discount, 25);
    assert.equal(t.deliveryFee, 15);
    assert.equal(t.total, 108);
    assert.equal(t.vat, vatOf(108));
    assert.equal(t.vat, 5.14);
  });

  it('prices half-kilos exactly', () => {
    assert.equal(totals([line('calf-local', 'boneless', 'curry', 1.5)], null).subtotal, 52.5);
  });

  it('waives the delivery fee', () => {
    const t = totals(lines, alAin, { freeDelivery: true });
    assert.equal(t.deliveryFee, 0);
    assert.equal(t.baseDeliveryFee, 15);
    assert.equal(t.total, 118);
  });

  it('never discounts below zero', () => {
    assert.equal(totals(lines, { type: 'pickup', branchId: 'al-ain-towayya' }, { discount: 500 }).total, 0);
  });

  it('bases free delivery threshold and minimum order on the subtotal before discount', () => {
    const big = [line('hawar-local', 'boneless', 'mandi', 3), line('burger-meat', '5', 'asis', 1)]; // 207 + 50 = 257
    const t = totals(big, alAin, { discount: 50 });
    assert.equal(t.deliveryFee, 0, 'still free: 257 ≥ 200');
    assert.equal(t.total, 207);
  });
});
