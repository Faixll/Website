/** Checks the store's price list was entered exactly, and that the cart charges the offer price. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { allowedCuts, categories, discountPct, productById, products, qtyRule, roundQty, validQty, wasPrice } from '../src/data/catalog';
import { unitPrice } from '../src/lib/pricing';

import source from '../data/products.json';

/* The source of truth is data/products.json (from the client's pack). The site must match it exactly —
   product ids, names, categories, units, option ids, labels and prices. Single-price products have one
   implicit option on the site ("kg" per kilo, "meal" for meals). */
type Opt = [string, string, string, number, number];
type SrcOpt = { id: string; label: { en: string; ar: string }; regular: number; offer: number };
type Src = { id: string; category: string; unit: string; name: { en: string; ar: string }; regular?: number; offer?: number; optionGroup?: { options: SrcOpt[] } };
const IMPLICIT: Record<string, [string, string, string]> = { kg: ['kg', 'Per kg', 'للكيلو'], meal: ['meal', 'Meal', 'وجبة'] };
const LIST: [string, string, string, string, string, Opt[]][] = (source.products as Src[]).map((p) => [
  p.id, p.name.en, p.name.ar, p.category, p.unit,
  p.optionGroup
    ? p.optionGroup.options.map((o) => [o.id, o.label.en, o.label.ar, o.regular, o.offer] as Opt)
    : [[...IMPLICIT[p.unit], p.regular!, p.offer!] as Opt],
]);

describe('categories match products.json', () => {
  it('same ids, names and order', () => {
    assert.deepEqual(categories.map((c) => [c.id, c.name.en, c.name.ar]), source.categories.map((c) => [c.id, c.en, c.ar]));
  });
});

describe("store's price list", () => {
  it('has exactly the products in products.json', () => {
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

  it('kg: customers type any amount 0.5–50 kg to the nearest 0.1 kg; packs are whole numbers 1–20', () => {
    const kg = productById('naimi-local')!;
    const pack = productById('burger-meat')!;
    assert.deepEqual(qtyRule(kg), { min: 0.5, step: 0.5, precision: 0.1, max: 50, def: 1 });
    assert.ok(validQty(kg, 0.5) && validQty(kg, 1.3) && validQty(kg, 2.5) && validQty(kg, 0.1 + 0.2 + 1) && validQty(kg, 50));
    assert.ok(!validQty(kg, 0.4) && !validQty(kg, 1.25) && !validQty(kg, 0) && !validQty(kg, 50.1) && !validQty(kg, NaN));
    assert.equal(roundQty(kg, 1.26), 1.3);
    assert.equal(roundQty(kg, 1.3 + 0.5), 1.8);
    assert.ok(validQty(pack, 1) && validQty(pack, 3) && !validQty(pack, 1.5) && !validQty(pack, 0));
  });

  it('a typed kg amount is charged exactly (1.3 kg Naimi at 69 AED = 89.70 AED)', () => {
    const kg = productById('naimi-local')!;
    assert.equal(Math.round(unitPrice(kg, 'kg', allowedCuts(kg)[0]) * 1.3 * 100) / 100, 89.7);
  });

  it('lists categories in the store order, with no empty category', () => {
    assert.deepEqual(categories.map((c) => c.id), ['hawar', 'sheep', 'goat', 'calf', 'burgers', 'meals']);
    for (const c of categories) assert.ok(products.some((p) => p.category === c.id), c.id);
  });
});
