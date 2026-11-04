/** Checks the store's price list was entered exactly, and that the cart charges the offer price. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { allowedCuts, categories, discountPct, productById, products, qtyRule, validQty, wasPrice } from '../src/data/catalog';
import { unitPrice } from '../src/lib/pricing';

// [id, English name, Arabic name, category, unit, [option id, en, ar, regular, offer][]]
type Opt = [string, string, string, number, number];
const LIST: [string, string, string, string, string, Opt[]][] = [
  ['hawar-local', 'Local Hawar Meat', 'لحم حوار محلي', 'hawar', 'kg', [['bone', 'With bone', 'بعظم', 69, 59], ['boneless', 'Boneless', 'بدون عظم', 79, 69]]],
  ['naimi-local', 'Local Naimi Meat', 'لحم خروف نعيمي محلي', 'sheep', 'kg', [['kg', 'Per kg', 'للكيلو', 79, 69]]],
  ['najdi-local', 'Local Najdi Meat', 'لحم خروف نجدي محلي', 'sheep', 'kg', [['kg', 'Per kg', 'للكيلو', 79, 69]]],
  ['harri-local', 'Local Harri Meat', 'لحم خروف حري محلي', 'sheep', 'kg', [['kg', 'Per kg', 'للكيلو', 85, 75]]],
  ['goat-local', 'Local Goat Meat', 'لحم تيس عارضي محلي', 'goat', 'kg', [['kg', 'Per kg', 'للكيلو', 65, 55]]],
  ['calf-local', 'Local Calf Meat', 'لحم عجل محلي', 'calf', 'kg', [['bone', 'With bone', 'بعظم', 35, 25], ['boneless', 'Boneless', 'بدون عظم', 45, 35]]],
  ['burger-meat', 'Meat Burger', 'برجر لحم', 'burgers', 'pack', [['5pc', '5 Pieces', '٥ قطع', 60, 50], ['box12', 'Box of 12', 'بوكس ١٢ قطعة', 120, 110]]],
  ['burger-hawar', 'Hawar Burger', 'برجر حوار', 'burgers', 'pack', [['5pc', '5 Pieces', '٥ قطع', 35, 25], ['box6', 'Box of 6', 'بوكس ٦ قطعة', 60, 50], ['box12', 'Box of 12', 'بوكس ١٢ قطعة', 120, 110]]],
  ['burger-beef', 'Beef Burger', 'برجر لحم بقر', 'burgers', 'pack', [['box6', 'Box of 6', 'بوكس ٦ قطعة', 60, 50]]],
  ['kabsa-barriah-2', 'Kabsa Barriah - 2 Persons', 'كبسة برية - لحم نعيمي محلي - شخصين', 'meals', 'meal', [['meal', 'Meal', 'وجبة', 120, 110]]],
];

describe("store's price list", () => {
  it('has exactly these 10 products (all sample products deleted)', () => {
    assert.deepEqual(products.map((p) => p.id).sort(), LIST.map((x) => x[0]).sort());
  });

  for (const [id, en, ar, cat, unit, opts] of LIST) {
    it(`${en}: names, options and prices exactly as supplied`, () => {
      const p = productById(id)!;
      assert.equal(p.name.en, en);
      assert.equal(p.name.ar, ar);
      assert.equal(p.category, cat);
      assert.equal(p.unit, unit);
      assert.equal(p.byWeight === true, unit === 'kg');
      assert.equal(p.sizes.length, opts.length);
      for (const [oid, oen, oar, regular, offer] of opts) {
        const s = p.sizes.find((x) => x.id === oid)!;
        assert.ok(s, oid);
        assert.equal(s.name.en, oen);
        assert.equal(s.name.ar, oar);
        assert.equal(s.price, offer, 'offer');
        assert.equal(wasPrice(s), regular, 'regular');
        assert.equal(discountPct(s), Math.round(((regular - offer) / regular) * 100));
        // Every cut is free, so the cart charges exactly the offer price per kg / pack.
        for (const c of allowedCuts(p)) assert.equal(unitPrice(p, oid, c), offer);
      }
    });
  }

  it('fresh meat has cut styles; burgers and kabsa do not', () => {
    for (const p of products) assert.equal(p.cuts.length > 0, p.unit === 'kg', p.id);
  });

  it('kg amounts go in 0.5 steps from 0.5; packs in whole numbers from 1', () => {
    const kg = productById('naimi-local')!;
    const pack = productById('burger-meat')!;
    assert.deepEqual(qtyRule(kg), { min: 0.5, step: 0.5, max: 50, def: 1 });
    assert.ok(validQty(kg, 0.5) && validQty(kg, 2.5) && !validQty(kg, 0.25) && !validQty(kg, 0));
    assert.ok(validQty(pack, 1) && validQty(pack, 3) && !validQty(pack, 1.5) && !validQty(pack, 0));
  });

  it('lists categories in the store order, with no empty category', () => {
    assert.deepEqual(categories.map((c) => c.id), ['hawar', 'sheep', 'goat', 'calf', 'burgers', 'meals']);
    for (const c of categories) assert.ok(products.some((p) => p.category === c.id), c.id);
  });
});
