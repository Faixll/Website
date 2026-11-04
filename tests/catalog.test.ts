/** Checks the store's price list was entered exactly, and that the cart charges the offer price. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { categories, productById, products, wasPrice } from '../src/data/catalog';
import { unitPrice } from '../src/lib/pricing';

// [id, English name, Arabic name, category, unit, normal price, offer price]
const LIST: [string, string, string, string, string, number, number][] = [
  ['hawar-local', 'Local Hawar Meat', 'لحم حوار محلي', 'hawar', 'kg', 69, 59],
  ['hawar-boneless', 'Local Hawar Meat - Boneless', 'لحم حوار محلي - بدون عظم', 'hawar', 'kg', 79, 69],
  ['naimi-local', 'Local Naimi Meat', 'لحم خروف نعيمي محلي', 'lamb', 'kg', 79, 69],
  ['najdi-local', 'Local Najdi Meat', 'لحم خروف نجدي محلي', 'lamb', 'kg', 79, 69],
  ['harri-local', 'Local Harri Meat', 'لحم خروف حري محلي', 'lamb', 'kg', 85, 75],
  ['goat-local', 'Local Goat Meat', 'لحم تيس عارضي محلي', 'goat', 'kg', 65, 55],
  ['calf-local', 'Local Calf Meat', 'لحم عجل محلي', 'beef', 'kg', 35, 25],
  ['calf-boneless', 'Local Calf Meat - Boneless', 'لحم عجل محلي - بدون عظم', 'beef', 'kg', 45, 35],
  ['burger-meat-12', 'Meat Burger Box - 12 Pieces', 'بوكس برجر لحم 12 قطعة', 'burgers', 'box', 120, 110],
  ['burger-meat-5', 'Meat Burger - 5 Pieces', 'برجر لحم - 5 قطع', 'burgers', 'pack', 60, 50],
  ['burger-hawar-12', 'Hawar Burger Box - 12 Pieces', 'بوكس برجر حوار 12 قطعة', 'burgers', 'box', 120, 110],
  ['burger-hawar-5', 'Hawar Burger - 5 Pieces', 'برجر حوار - 5 قطع', 'burgers', 'pack', 35, 25],
  ['burger-beef-6', 'Beef Burger Box - 6 Pieces', 'بوكس برجر عجل 6 قطع', 'burgers', 'box', 60, 50],
  ['burger-hawar-6', 'Hawar Burger Box - 6 Pieces', 'بوكس برجر حوار 6 قطع', 'burgers', 'box', 60, 50],
  ['kabsa-barriah-2', 'Kabsa Barriah - 2 Persons', 'كبسة برية - لحم نعيمي محلي - لشخصين', 'meals', 'meal', 120, 110],
];

describe("store's price list", () => {
  for (const [id, en, ar, cat, unit, was, offer] of LIST) {
    it(`${en}: ${offer} (was ${was})`, () => {
      const p = productById(id);
      assert.ok(p, 'exists');
      assert.equal(p.name.en, en);
      assert.equal(p.name.ar, ar);
      assert.equal(p.category, cat);
      assert.equal(p.unit, unit);
      assert.equal(p.sizes.length, 1);
      assert.equal(p.sizes[0].price, offer);
      assert.equal(wasPrice(p.sizes[0]), was);
      // Every cut on these products is free, so the cart charges exactly the offer price.
      for (const c of p.cuts) assert.equal(unitPrice(p, p.sizes[0].id, c), offer);
    });
  }

  it('lists categories in the store order', () => {
    assert.deepEqual(categories.slice(0, 6).map((c) => c.id), ['hawar', 'lamb', 'goat', 'beef', 'burgers', 'meals']);
  });

  it('has unique product ids and an image for every category', async () => {
    const ids = products.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
    const { existsSync } = await import('node:fs');
    for (const c of categories) assert.ok(existsSync(`public/images/cat-${c.id}.svg`), c.id);
  });
});
