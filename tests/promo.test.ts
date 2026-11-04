import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkPromo, normaliseCode } from '../src/lib/promo';

// Dates are given in UTC; UAE is UTC+4.
const at = (iso: string) => new Date(iso);

describe('promo codes', () => {
  it('normalises what customers type', () => {
    assert.equal(normaliseCode(' nation-day '), 'NATIONDAY');
    assert.equal(normaliseCode('Fazza'), 'FAZZA');
  });

  it('FAZZA gives 10% off products, any day', () => {
    assert.deepEqual(
      (({ ok, discount, freeDelivery }) => ({ ok, discount, freeDelivery }))(checkPromo('fazza', 250, 15, at('2026-06-10T12:00:00Z')) as never),
      { ok: true, discount: 25, freeDelivery: false },
    );
    const r = checkPromo('FAZZA', 123.45, 0, at('2026-06-10T12:00:00Z'));
    assert.ok(r.ok && r.discount === 12.35);
  });

  it('NATIONDAY gives 15% off only 1–3 December, UAE time', () => {
    const ok = checkPromo('NATIONDAY', 200, 0, at('2026-12-02T12:00:00Z'));
    assert.ok(ok.ok && ok.discount === 30);
    // 30 Nov 20:00 UTC = 1 Dec 00:00 in the UAE → valid
    assert.equal(checkPromo('NATIONDAY', 200, 0, at('2026-11-30T20:00:00Z')).ok, true);
    // 30 Nov 19:59 UTC = 30 Nov 23:59 UAE → not yet
    assert.deepEqual(checkPromo('NATIONDAY', 200, 0, at('2026-11-30T19:59:00Z')), { ok: false, error: 'expired' });
    // 3 Dec 19:59 UTC = 3 Dec 23:59 UAE → still valid; 20:00 UTC = 4 Dec → expired
    assert.equal(checkPromo('NATIONDAY', 200, 0, at('2026-12-03T19:59:00Z')).ok, true);
    assert.deepEqual(checkPromo('NATIONDAY', 200, 0, at('2026-12-03T20:00:00Z')), { ok: false, error: 'expired' });
    // and again next year
    assert.equal(checkPromo('NATIONDAY', 200, 0, at('2027-12-01T10:00:00Z')).ok, true);
  });

  it('rejects unknown codes', () => {
    assert.deepEqual(checkPromo('FREEMEAT', 200, 0), { ok: false, error: 'invalid_code' });
    assert.deepEqual(checkPromo('', 200, 0), { ok: false, error: 'invalid_code' });
  });
});
