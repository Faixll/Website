/**
 * Product catalogue — the store's price list. Prices are in AED and INCLUDE 5% VAT.
 *
 * - Each product has one or more `sizes` (its options: bone / boneless, or the pack size).
 *   `price` is the offer price the customer pays; `was` is the regular price, shown crossed out.
 * - `byWeight` products are sold per kg: the customer picks an amount in 0.5 kg steps, and the
 *   price shown is per kg. Other products are sold per pack / meal in whole numbers.
 * - `cuts` are the cutting styles (fresh meat only).
 * - Photos: put real photos in /public/products and set `image` (with alt text in both languages).
 *   Until then a neutral placeholder is shown.
 */
import type { Lang } from '@/config/site';

export type L10n = Record<Lang, string>;

export type CategoryId = 'hawar' | 'sheep' | 'goat' | 'calf' | 'burgers' | 'meals';

/** Categories, in the store's order. The header strip, chips, home sections and footer all use this list. */
export const categories: { id: CategoryId; name: L10n }[] = [
  { id: 'hawar', name: { ar: 'حوار', en: 'Hawar' } },
  { id: 'sheep', name: { ar: 'خروف', en: 'Sheep' } },
  { id: 'goat', name: { ar: 'تيس', en: 'Goat' } },
  { id: 'calf', name: { ar: 'عجل', en: 'Calf' } },
  { id: 'burgers', name: { ar: 'برجر', en: 'Burgers' } },
  { id: 'meals', name: { ar: 'وجبات جاهزة', en: 'Ready meals' } },
];

/** Cutting styles for fresh meat. `extra` is added per kg (AED, VAT incl.); all free for now. */
export const cuts = {
  curry: { name: { ar: 'قطع صغيرة (مرق)', en: 'Small pieces (stew)' }, extra: 0 },
  large: { name: { ar: 'قطع كبيرة', en: 'Large pieces' }, extra: 0 },
  biryani: { name: { ar: 'تقطيع برياني', en: 'Biryani cut' }, extra: 0 },
  mandi: { name: { ar: 'تقطيع مندي', en: 'Mandi cut' }, extra: 0 },
  asis: { name: { ar: 'كما هي', en: 'As is' }, extra: 0 },
} satisfies Record<string, { name: L10n; extra: number }>;

export type CutId = keyof typeof cuts;
export type Unit = 'kg' | 'pack' | 'meal';
export type Stock = 'in' | 'low' | 'out';

export type Size = { id: string; name: L10n; price: number; was?: number };

export type Product = {
  id: string;
  category: CategoryId;
  name: L10n;
  desc: L10n;
  unit: Unit;
  /** Sold by weight (kg, 0.5 steps) instead of whole packs. */
  byWeight?: boolean;
  /** Shown as a badge; omit when unknown. */
  storage?: 'fresh' | 'frozen';
  stock: Stock;
  /** Label of the option group (only shown when there is more than one size). */
  sizeLabel?: L10n;
  sizes: Size[];
  /** Cutting styles (fresh meat). Empty = no cutting choice. */
  cuts: CutId[];
  /** Real photo, when available. */
  image?: { src: string; alt: L10n };
  popular?: boolean;
};

const CUTS: CutId[] = ['curry', 'large', 'biryani', 'mandi'];
const perKg = { ar: 'للكيلو', en: 'Per kg' };
const bone = { ar: 'العظم', en: 'Bone' };
const packSize = { ar: 'حجم العبوة', en: 'Pack size' };

export const products: Product[] = [
  /* ---------- Hawar ---------- */
  {
    id: 'hawar-local', category: 'hawar', unit: 'kg', byWeight: true, storage: 'fresh', stock: 'in',
    name: { ar: 'لحم حوار محلي', en: 'Local Hawar Meat' },
    desc: { ar: 'لحم حوار (جمل صغير) محلي طازج، بعظم أو بدون عظم.', en: 'Fresh local hawar (young camel) meat, with bone or boneless.' },
    sizeLabel: bone,
    sizes: [
      { id: 'bone', name: { ar: 'بعظم', en: 'With bone' }, price: 59, was: 69 },
      { id: 'boneless', name: { ar: 'بدون عظم', en: 'Boneless' }, price: 69, was: 79 },
    ],
    cuts: CUTS,
  },
  /* ---------- Sheep ---------- */
  {
    id: 'naimi-local', category: 'sheep', unit: 'kg', byWeight: true, storage: 'fresh', stock: 'in',
    name: { ar: 'لحم خروف نعيمي محلي', en: 'Local Naimi Meat' },
    desc: { ar: 'لحم خروف نعيمي محلي طازج.', en: 'Fresh local Naimi lamb.' },
    sizes: [{ id: 'kg', name: perKg, price: 69, was: 79 }],
    cuts: CUTS,
  },
  {
    id: 'najdi-local', category: 'sheep', unit: 'kg', byWeight: true, storage: 'fresh', stock: 'in',
    name: { ar: 'لحم خروف نجدي محلي', en: 'Local Najdi Meat' },
    desc: { ar: 'لحم خروف نجدي محلي طازج.', en: 'Fresh local Najdi lamb.' },
    sizes: [{ id: 'kg', name: perKg, price: 69, was: 79 }],
    cuts: CUTS,
  },
  {
    id: 'harri-local', category: 'sheep', unit: 'kg', byWeight: true, storage: 'fresh', stock: 'in',
    name: { ar: 'لحم خروف حري محلي', en: 'Local Harri Meat' },
    desc: { ar: 'لحم خروف حري محلي طازج.', en: 'Fresh local Harri lamb.' },
    sizes: [{ id: 'kg', name: perKg, price: 75, was: 85 }],
    cuts: CUTS,
  },
  /* ---------- Goat ---------- */
  {
    id: 'goat-local', category: 'goat', unit: 'kg', byWeight: true, storage: 'fresh', stock: 'in',
    name: { ar: 'لحم تيس عارضي محلي', en: 'Local Goat Meat' },
    desc: { ar: 'لحم تيس عارضي محلي طازج.', en: 'Fresh local Ardi goat meat.' },
    sizes: [{ id: 'kg', name: perKg, price: 55, was: 65 }],
    cuts: CUTS,
  },
  /* ---------- Calf ---------- */
  {
    id: 'calf-local', category: 'calf', unit: 'kg', byWeight: true, storage: 'fresh', stock: 'in',
    name: { ar: 'لحم عجل محلي', en: 'Local Calf Meat' },
    desc: { ar: 'لحم عجل محلي طازج، بعظم أو بدون عظم.', en: 'Fresh local calf meat, with bone or boneless.' },
    sizeLabel: bone,
    sizes: [
      { id: 'bone', name: { ar: 'بعظم', en: 'With bone' }, price: 25, was: 35 },
      { id: 'boneless', name: { ar: 'بدون عظم', en: 'Boneless' }, price: 35, was: 45 },
    ],
    cuts: CUTS,
  },
  /* ---------- Burgers (names and pack labels exactly as supplied) ---------- */
  {
    id: 'burger-meat', category: 'burgers', unit: 'pack', stock: 'in',
    name: { ar: 'برجر لحم', en: 'Meat Burger' },
    desc: { ar: 'برجر لحم، عبوة 5 قطع أو بوكس 12 قطعة.', en: 'Meat burgers, a pack of 5 or a box of 12.' },
    sizeLabel: packSize,
    sizes: [
      { id: '5pc', name: { ar: '٥ قطع', en: '5 Pieces' }, price: 50, was: 60 },
      { id: 'box12', name: { ar: 'بوكس ١٢ قطعة', en: 'Box of 12' }, price: 110, was: 120 },
    ],
    cuts: [],
  },
  {
    id: 'burger-hawar', category: 'burgers', unit: 'pack', stock: 'in',
    name: { ar: 'برجر حوار', en: 'Hawar Burger' },
    desc: { ar: 'برجر من لحم الحوار، عبوة 5 قطع أو بوكس 6 أو 12 قطعة.', en: 'Hawar (young camel) burgers, a pack of 5 or a box of 6 or 12.' },
    sizeLabel: packSize,
    sizes: [
      { id: '5pc', name: { ar: '٥ قطع', en: '5 Pieces' }, price: 25, was: 35 },
      { id: 'box6', name: { ar: 'بوكس ٦ قطعة', en: 'Box of 6' }, price: 50, was: 60 },
      { id: 'box12', name: { ar: 'بوكس ١٢ قطعة', en: 'Box of 12' }, price: 110, was: 120 },
    ],
    cuts: [],
  },
  {
    id: 'burger-beef', category: 'burgers', unit: 'pack', stock: 'in',
    name: { ar: 'برجر لحم بقر', en: 'Beef Burger' },
    desc: { ar: 'برجر لحم بقر، بوكس 6 قطع.', en: 'Beef burgers, a box of 6.' },
    sizeLabel: packSize,
    sizes: [{ id: 'box6', name: { ar: 'بوكس ٦ قطعة', en: 'Box of 6' }, price: 50, was: 60 }],
    cuts: [],
  },
  /* ---------- Ready meals ---------- */
  {
    id: 'kabsa-barriah-2', category: 'meals', unit: 'meal', stock: 'in',
    name: { ar: 'كبسة برية - لحم نعيمي محلي - شخصين', en: 'Kabsa Barriah - 2 Persons' },
    desc: { ar: 'كبسة برية بلحم خروف نعيمي محلي، لشخصين.', en: 'Kabsa Barriah with local Naimi lamb, for 2 persons.' },
    sizes: [{ id: 'meal', name: { ar: 'وجبة', en: 'Meal' }, price: 110, was: 120 }],
    cuts: [],
  },
];

export const productById = (id: string) => products.find((p) => p.id === id);
export const categoryName = (id: CategoryId, lang: Lang) => categories.find((c) => c.id === id)!.name[lang];

/** Normal (crossed-out) price for a size, if it is higher than the price paid. */
export const wasPrice = (s: Size) => (s.was != null && s.was > s.price ? s.was : null);
/** Discount percentage, calculated from the regular and offer price (never typed by hand). */
export const discountPct = (s: Size) => (wasPrice(s) ? Math.round(((s.was! - s.price) / s.was!) * 100) : 0);

/** Cutting choices that are valid for a product's cart lines (products without cuts use 'asis'). */
export const allowedCuts = (p: Product): CutId[] => (p.cuts.length ? p.cuts : ['asis']);

/** Amount rules: kg products in 0.5 steps (0.5–50 kg), others in whole numbers (1–20). */
export const qtyRule = (p: Product) => (p.byWeight ? { min: 0.5, step: 0.5, max: 50, def: 1 } : { min: 1, step: 1, max: 20, def: 1 });
export const validQty = (p: Product, q: number) => {
  const r = qtyRule(p);
  return Number.isFinite(q) && q >= r.min && q <= r.max && Math.abs(q / r.step - Math.round(q / r.step)) < 1e-9;
};
/** Quick amount buttons for kg products. */
export const QUICK_KG = [0.5, 1, 2, 5];

export const unitLabel: Record<Unit, L10n> = {
  kg: { ar: 'كغ', en: 'kg' },
  pack: { ar: 'عبوة', en: 'pack' },
  meal: { ar: 'وجبة', en: 'meal' },
};
