/**
 * Product catalogue. Prices are in AED and INCLUDE 5% VAT.
 * `price` is what the customer pays (the offer price); `was` is the normal price, shown crossed out.
 * Products marked "real" come from the store's price list; the others are older SAMPLE data.
 */
import type { Lang } from '@/config/site';

export type L10n = Record<Lang, string>;

export type CategoryId = 'hawar' | 'lamb' | 'goat' | 'beef' | 'burgers' | 'meals' | 'camel' | 'chicken' | 'livestock' | 'minced';

export const categories: { id: CategoryId; name: L10n }[] = [
  // Store's categories, in the store's order. Ids 'lamb' and 'beef' are kept so existing links still work.
  { id: 'hawar', name: { ar: 'حوار', en: 'Hawar (young camel)' } },
  { id: 'lamb', name: { ar: 'خروف', en: 'Sheep' } },
  { id: 'goat', name: { ar: 'تيس', en: 'Goat' } },
  { id: 'beef', name: { ar: 'عجل', en: 'Calf' } },
  { id: 'burgers', name: { ar: 'برجر', en: 'Burgers' } },
  { id: 'meals', name: { ar: 'وجبات جاهزة', en: 'Ready meals' } },
  // Older sample categories
  { id: 'livestock', name: { ar: 'ذبائح كاملة', en: 'Whole livestock' } },
  { id: 'camel', name: { ar: 'لحم حاشي', en: 'Camel' } },
  { id: 'chicken', name: { ar: 'دجاج', en: 'Chicken' } },
  { id: 'minced', name: { ar: 'مفروم ومتبل', en: 'Minced & marinated' } },
];

/** Cutting options. `extra` is added per item (AED, VAT incl.). */
export const cuts = {
  asis: { name: { ar: 'كما هي', en: 'As is' }, extra: 0 },
  curry: { name: { ar: 'قطع صغيرة (مرق)', en: 'Small pieces (curry)' }, extra: 0 },
  large: { name: { ar: 'قطع كبيرة', en: 'Large pieces' }, extra: 0 },
  biryani: { name: { ar: 'تقطيع برياني', en: 'Biryani cut' }, extra: 0 },
  mandi: { name: { ar: 'تقطيع مندي', en: 'Mandi cut' }, extra: 0 },
  whole: { name: { ar: 'كامل بدون تقطيع', en: 'Whole, uncut' }, extra: 0 },
  steakThick: { name: { ar: 'ستيك سميك 2.5 سم', en: 'Thick steaks, 2.5 cm' }, extra: 0 },
  steakThin: { name: { ar: 'ستيك رفيع 1 سم', en: 'Thin steaks, 1 cm' }, extra: 0 },
  mince: { name: { ar: 'فرم', en: 'Minced' }, extra: 5 },
  fridge: { name: { ar: 'تقطيع ثلاجة (أكياس)', en: 'Fridge cut, bagged' }, extra: 25 },
  halves: { name: { ar: 'أنصاف', en: 'Halves' }, extra: 0 },
  quarters: { name: { ar: 'أرباع', en: 'Quarters' }, extra: 0 },
  eight: { name: { ar: '8 قطع', en: '8 pieces' }, extra: 0 },
  skinless: { name: { ar: '8 قطع بدون جلد', en: '8 pieces, skinless' }, extra: 3 },
} satisfies Record<string, { name: L10n; extra: number }>;

export type CutId = keyof typeof cuts;
export type Unit = 'kg' | 'piece' | 'head' | 'pack' | 'box' | 'meal';
export type Stock = 'in' | 'low' | 'out';

export type Product = {
  id: string;
  category: CategoryId;
  name: L10n;
  desc: L10n;
  origin: L10n;
  unit: Unit;
  storage: 'fresh' | 'frozen';
  stock: Stock;
  /** `price` = what the customer pays; `was` = normal price shown crossed out (optional). */
  sizes: { id: string; name: L10n; price: number; was?: number }[];
  cuts: CutId[];
  image?: string;
  popular?: boolean;
};

const local = { ar: 'محلي', en: 'Local' };
const kg1 = { ar: '1 كغ', en: '1 kg' };

export const products: Product[] = [
  /* ---------- Store's price list (real) ---------- */
  {
    // real
    id: 'hawar-local', category: 'hawar', unit: 'kg', storage: 'fresh', stock: 'in', popular: true,
    name: { ar: 'لحم حوار محلي', en: 'Local Hawar Meat' },
    desc: { ar: 'لحم حوار (جمل صغير) محلي طازج بالعظم، طري وقليل الدهن.', en: 'Fresh local hawar (young camel) meat on the bone, tender and lean.' },
    origin: local,
    sizes: [{ id: '1kg', name: kg1, price: 59, was: 69 }],
    cuts: ['curry', 'large', 'biryani', 'mandi'],
  },
  {
    // real
    id: 'hawar-boneless', category: 'hawar', unit: 'kg', storage: 'fresh', stock: 'in',
    name: { ar: 'لحم حوار محلي - بدون عظم', en: 'Local Hawar Meat - Boneless' },
    desc: { ar: 'لحم حوار محلي طازج بدون عظم، جاهز للطبخ والشوي.', en: 'Fresh local hawar meat, boneless, ready to cook or grill.' },
    origin: local,
    sizes: [{ id: '1kg', name: kg1, price: 69, was: 79 }],
    cuts: ['curry', 'large'],
  },
  {
    // real
    id: 'naimi-local', category: 'lamb', unit: 'kg', storage: 'fresh', stock: 'in', popular: true,
    name: { ar: 'لحم خروف نعيمي محلي', en: 'Local Naimi Meat' },
    desc: { ar: 'لحم خروف نعيمي محلي طازج بالعظم.', en: 'Fresh local Naimi lamb on the bone.' },
    origin: local,
    sizes: [{ id: '1kg', name: kg1, price: 69, was: 79 }],
    cuts: ['curry', 'large', 'biryani', 'mandi'],
  },
  {
    // real
    id: 'najdi-local', category: 'lamb', unit: 'kg', storage: 'fresh', stock: 'in',
    name: { ar: 'لحم خروف نجدي محلي', en: 'Local Najdi Meat' },
    desc: { ar: 'لحم خروف نجدي محلي طازج بالعظم.', en: 'Fresh local Najdi lamb on the bone.' },
    origin: local,
    sizes: [{ id: '1kg', name: kg1, price: 69, was: 79 }],
    cuts: ['curry', 'large', 'biryani', 'mandi'],
  },
  {
    // real
    id: 'harri-local', category: 'lamb', unit: 'kg', storage: 'fresh', stock: 'in',
    name: { ar: 'لحم خروف حري محلي', en: 'Local Harri Meat' },
    desc: { ar: 'لحم خروف حري محلي طازج بالعظم.', en: 'Fresh local Harri lamb on the bone.' },
    origin: local,
    sizes: [{ id: '1kg', name: kg1, price: 75, was: 85 }],
    cuts: ['curry', 'large', 'biryani', 'mandi'],
  },
  {
    // real
    id: 'calf-local', category: 'beef', unit: 'kg', storage: 'fresh', stock: 'in', popular: true,
    name: { ar: 'لحم عجل محلي', en: 'Local Calf Meat' },
    desc: { ar: 'لحم عجل محلي طازج بالعظم.', en: 'Fresh local calf meat on the bone.' },
    origin: local,
    sizes: [{ id: '1kg', name: kg1, price: 25, was: 35 }],
    cuts: ['curry', 'large'],
  },
  {
    // real
    id: 'calf-boneless', category: 'beef', unit: 'kg', storage: 'fresh', stock: 'in',
    name: { ar: 'لحم عجل محلي - بدون عظم', en: 'Local Calf Meat - Boneless' },
    desc: { ar: 'لحم عجل محلي طازج بدون عظم.', en: 'Fresh local calf meat, boneless.' },
    origin: local,
    sizes: [{ id: '1kg', name: kg1, price: 35, was: 45 }],
    cuts: ['curry', 'large'],
  },
  {
    // real
    id: 'burger-meat-12', category: 'burgers', unit: 'box', storage: 'fresh', stock: 'in', popular: true,
    name: { ar: 'بوكس برجر لحم 12 قطعة', en: 'Meat Burger Box - 12 Pieces' },
    desc: { ar: 'بوكس من 12 قطعة برجر لحم.', en: 'A box of 12 meat burger patties.' },
    origin: local,
    sizes: [{ id: 'box', name: { ar: 'بوكس 12 قطعة', en: 'Box of 12' }, price: 110, was: 120 }],
    cuts: ['asis'],
  },
  {
    // real
    id: 'burger-meat-5', category: 'burgers', unit: 'pack', storage: 'fresh', stock: 'in',
    name: { ar: 'برجر لحم - 5 قطع', en: 'Meat Burger - 5 Pieces' },
    desc: { ar: 'عبوة من 5 قطع برجر لحم.', en: 'A pack of 5 meat burger patties.' },
    origin: local,
    sizes: [{ id: 'pack', name: { ar: '5 قطع', en: '5 pieces' }, price: 50, was: 60 }],
    cuts: ['asis'],
  },
  {
    // real
    id: 'burger-hawar-12', category: 'burgers', unit: 'box', storage: 'fresh', stock: 'in',
    name: { ar: 'بوكس برجر حوار 12 قطعة', en: 'Hawar Burger Box - 12 Pieces' },
    desc: { ar: 'بوكس من 12 قطعة برجر من لحم الحوار.', en: 'A box of 12 hawar (young camel) burger patties.' },
    origin: local,
    sizes: [{ id: 'box', name: { ar: 'بوكس 12 قطعة', en: 'Box of 12' }, price: 110, was: 120 }],
    cuts: ['asis'],
  },
  {
    // real
    id: 'burger-hawar-5', category: 'burgers', unit: 'pack', storage: 'fresh', stock: 'in',
    name: { ar: 'برجر حوار - 5 قطع', en: 'Hawar Burger - 5 Pieces' },
    desc: { ar: 'عبوة من 5 قطع برجر من لحم الحوار.', en: 'A pack of 5 hawar (young camel) burger patties.' },
    origin: local,
    sizes: [{ id: 'pack', name: { ar: '5 قطع', en: '5 pieces' }, price: 25, was: 35 }],
    cuts: ['asis'],
  },
  {
    // real
    id: 'burger-beef-6', category: 'burgers', unit: 'box', storage: 'fresh', stock: 'in',
    name: { ar: 'بوكس برجر عجل 6 قطع', en: 'Beef Burger Box - 6 Pieces' },
    desc: { ar: 'بوكس من 6 قطع برجر لحم عجل.', en: 'A box of 6 beef burger patties.' },
    origin: local,
    sizes: [{ id: 'box', name: { ar: 'بوكس 6 قطع', en: 'Box of 6' }, price: 50, was: 60 }],
    cuts: ['asis'],
  },
  {
    // real
    id: 'burger-hawar-6', category: 'burgers', unit: 'box', storage: 'fresh', stock: 'in',
    name: { ar: 'بوكس برجر حوار 6 قطع', en: 'Hawar Burger Box - 6 Pieces' },
    desc: { ar: 'بوكس من 6 قطع برجر من لحم الحوار.', en: 'A box of 6 hawar (young camel) burger patties.' },
    origin: local,
    sizes: [{ id: 'box', name: { ar: 'بوكس 6 قطع', en: 'Box of 6' }, price: 50, was: 60 }],
    cuts: ['asis'],
  },
  {
    // real
    id: 'kabsa-barriah-2', category: 'meals', unit: 'meal', storage: 'fresh', stock: 'in',
    name: { ar: 'كبسة برية - لحم نعيمي محلي - لشخصين', en: 'Kabsa Barriah - 2 Persons' },
    desc: { ar: 'كبسة برية بلحم خروف نعيمي محلي، تكفي شخصين.', en: 'Kabsa Barriah with local Naimi lamb, serves 2.' },
    origin: local,
    sizes: [{ id: 'meal', name: { ar: 'وجبة لشخصين', en: 'Meal for 2' }, price: 110, was: 120 }],
    cuts: ['asis'],
  },

  /* ---------- Older SAMPLE products (not in the store's price list) ---------- */
  {
    id: 'lamb-local-mix', category: 'lamb', unit: 'kg', storage: 'fresh', stock: 'in',
    name: { ar: 'لحم غنم محلي (مشكل)', en: 'Local lamb, mixed cuts' },
    desc: { ar: 'لحم غنم طازج مذبوح اليوم، مشكل من الكتف والفخذ والضلوع.', en: 'Fresh lamb slaughtered today, mixed from shoulder, leg and ribs.' },
    origin: local,
    sizes: [
      { id: '1kg', name: { ar: '1 كغ', en: '1 kg' }, price: 65 },
      { id: '2kg', name: { ar: '2 كغ', en: '2 kg' }, price: 125 },
      { id: '3kg', name: { ar: '3 كغ', en: '3 kg' }, price: 180 },
    ],
    cuts: ['curry', 'large', 'biryani', 'mandi'],
  },
  {
    id: 'lamb-chops', category: 'lamb', unit: 'kg', storage: 'fresh', stock: 'in',
    name: { ar: 'ريش غنم', en: 'Lamb chops' },
    desc: { ar: 'ريش غنم طرية للشوي، مقطعة ومنظفة.', en: 'Tender lamb chops for grilling, trimmed and ready.' },
    origin: local,
    sizes: [
      { id: '500g', name: { ar: '500 غ', en: '500 g' }, price: 45 },
      { id: '1kg', name: { ar: '1 كغ', en: '1 kg' }, price: 85 },
    ],
    cuts: ['asis', 'steakThin'],
  },
  {
    id: 'lamb-shoulder', category: 'lamb', unit: 'piece', storage: 'fresh', stock: 'low',
    name: { ar: 'كتف غنم محلي', en: 'Local lamb shoulder' },
    desc: { ar: 'كتف كامل بالعظم، مثالي للمندي والفرن.', en: 'Whole bone-in shoulder, ideal for mandi or slow roasting.' },
    origin: local,
    sizes: [{ id: '1pc', name: { ar: 'قطعة ~1.8 كغ', en: '1 piece, ~1.8 kg' }, price: 110 }],
    cuts: ['whole', 'mandi', 'large'],
  },
  {
    id: 'lamb-leg-au', category: 'lamb', unit: 'piece', storage: 'frozen', stock: 'in',
    name: { ar: 'فخذ غنم أسترالي', en: 'Australian lamb leg' },
    desc: { ar: 'فخذ غنم مجمد بالعظم.', en: 'Frozen bone-in lamb leg.' },
    origin: { ar: 'أستراليا', en: 'Australia' },
    sizes: [{ id: '1pc', name: { ar: 'قطعة ~2.2 كغ', en: '1 piece, ~2.2 kg' }, price: 79 }],
    cuts: ['whole', 'large', 'curry'],
  },
  {
    id: 'naimi-whole', category: 'livestock', unit: 'head', storage: 'fresh', stock: 'in',
    name: { ar: 'ذبيحة نعيمي', en: 'Whole Naimi sheep' },
    desc: { ar: 'ذبيحة نعيمي كاملة، تُذبح وتُقطع حسب طلبك. السعر يشمل الذبح والتنظيف.', en: 'Whole Naimi sheep, slaughtered and cut to order. Price includes slaughter and cleaning.' },
    origin: local,
    sizes: [
      { id: 'small', name: { ar: 'صغير 12–14 كغ', en: 'Small, 12–14 kg' }, price: 950 },
      { id: 'medium', name: { ar: 'وسط 15–17 كغ', en: 'Medium, 15–17 kg' }, price: 1100 },
      { id: 'large', name: { ar: 'كبير 18–20 كغ', en: 'Large, 18–20 kg' }, price: 1250 },
    ],
    cuts: ['mandi', 'fridge', 'halves', 'quarters', 'whole'],
  },
  {
    id: 'harri-whole', category: 'livestock', unit: 'head', storage: 'fresh', stock: 'in',
    name: { ar: 'ذبيحة حري', en: 'Whole Harri sheep' },
    desc: { ar: 'ذبيحة حري كاملة، لحم طري ودهن معتدل.', en: 'Whole Harri sheep: tender meat, moderate fat.' },
    origin: local,
    sizes: [
      { id: 'small', name: { ar: 'صغير 12–14 كغ', en: 'Small, 12–14 kg' }, price: 850 },
      { id: 'medium', name: { ar: 'وسط 15–17 كغ', en: 'Medium, 15–17 kg' }, price: 990 },
    ],
    cuts: ['mandi', 'fridge', 'halves', 'quarters', 'whole'],
  },
  {
    id: 'goat-whole', category: 'livestock', unit: 'head', storage: 'fresh', stock: 'in',
    name: { ar: 'ذبيحة تيس محلي', en: 'Whole local goat' },
    desc: { ar: 'تيس محلي كامل يُذبح حسب الطلب.', en: 'Whole local goat, slaughtered to order.' },
    origin: local,
    sizes: [
      { id: 'small', name: { ar: 'صغير 8–10 كغ', en: 'Small, 8–10 kg' }, price: 750 },
      { id: 'medium', name: { ar: 'وسط 11–13 كغ', en: 'Medium, 11–13 kg' }, price: 890 },
    ],
    cuts: ['mandi', 'fridge', 'halves', 'whole'],
  },
  {
    id: 'sawakni-whole', category: 'livestock', unit: 'head', storage: 'fresh', stock: 'out',
    name: { ar: 'ذبيحة سواكني', en: 'Whole Sawakni sheep' },
    desc: { ar: 'ذبيحة سواكني كاملة.', en: 'Whole Sawakni sheep.' },
    origin: { ar: 'السودان', en: 'Sudan' },
    sizes: [{ id: 'medium', name: { ar: 'وسط 15–17 كغ', en: 'Medium, 15–17 kg' }, price: 690 }],
    cuts: ['mandi', 'fridge', 'halves'],
  },
  {
    // real — updated from the store's price list (was sample data)
    id: 'goat-local', category: 'goat', unit: 'kg', storage: 'fresh', stock: 'in',
    name: { ar: 'لحم تيس عارضي محلي', en: 'Local Goat Meat' },
    desc: { ar: 'لحم تيس عارضي محلي طازج بالعظم.', en: 'Fresh local Ardi goat meat on the bone.' },
    origin: local,
    sizes: [{ id: '1kg', name: kg1, price: 55, was: 65 }],
    cuts: ['curry', 'large', 'biryani', 'mandi'],
  },
  {
    id: 'beef-cubes', category: 'beef', unit: 'kg', storage: 'fresh', stock: 'in',
    name: { ar: 'لحم عجل مكعبات', en: 'Beef cubes' },
    desc: { ar: 'لحم عجل بدون عظم، مكعبات للطبخ والمشاوي.', en: 'Boneless beef, cubed for stews and skewers.' },
    origin: { ar: 'باكستان', en: 'Pakistan' },
    sizes: [
      { id: '1kg', name: { ar: '1 كغ', en: '1 kg' }, price: 55 },
      { id: '2kg', name: { ar: '2 كغ', en: '2 kg' }, price: 105 },
    ],
    cuts: ['curry', 'large', 'mince'],
  },
  {
    id: 'beef-ribeye', category: 'beef', unit: 'kg', storage: 'fresh', stock: 'in',
    name: { ar: 'ستيك ريب آي', en: 'Ribeye steak' },
    desc: { ar: 'ريب آي مبرد بتعريق ممتاز.', en: 'Chilled ribeye with excellent marbling.' },
    origin: { ar: 'أستراليا', en: 'Australia' },
    sizes: [
      { id: '500g', name: { ar: '500 غ', en: '500 g' }, price: 79 },
      { id: '1kg', name: { ar: '1 كغ', en: '1 kg' }, price: 149 },
    ],
    cuts: ['steakThick', 'steakThin', 'asis'],
  },
  {
    id: 'camel-local', category: 'camel', unit: 'kg', storage: 'fresh', stock: 'low',
    name: { ar: 'لحم حاشي محلي', en: 'Local camel meat' },
    desc: { ar: 'لحم حاشي صغير طري، طازج يومياً.', en: 'Tender young camel meat, fresh daily.' },
    origin: local,
    sizes: [
      { id: '1kg', name: { ar: '1 كغ', en: '1 kg' }, price: 60 },
      { id: '2kg', name: { ar: '2 كغ', en: '2 kg' }, price: 115 },
    ],
    cuts: ['curry', 'large', 'mince'],
  },
  {
    id: 'camel-hump', category: 'camel', unit: 'kg', storage: 'fresh', stock: 'out',
    name: { ar: 'سنام حاشي', en: 'Camel hump' },
    desc: { ar: 'سنام حاشي طازج.', en: 'Fresh camel hump.' },
    origin: local,
    sizes: [{ id: '1kg', name: { ar: '1 كغ', en: '1 kg' }, price: 45 }],
    cuts: ['asis', 'curry'],
  },
  {
    id: 'chicken-whole', category: 'chicken', unit: 'piece', storage: 'fresh', stock: 'in',
    name: { ar: 'دجاج طازج كامل', en: 'Fresh whole chicken' },
    desc: { ar: 'دجاج محلي طازج ~1.1 كغ للحبة.', en: 'Fresh local chicken, ~1.1 kg each.' },
    origin: local,
    sizes: [
      { id: '1pc', name: { ar: 'حبة واحدة', en: '1 chicken' }, price: 22 },
      { id: '3pc', name: { ar: '3 حبات', en: '3 chickens' }, price: 60 },
    ],
    cuts: ['whole', 'halves', 'eight', 'skinless'],
  },
  {
    id: 'chicken-breast', category: 'chicken', unit: 'kg', storage: 'frozen', stock: 'in',
    name: { ar: 'صدور دجاج بدون عظم', en: 'Boneless chicken breast' },
    desc: { ar: 'صدور دجاج مجمدة بدون عظم وجلد.', en: 'Frozen boneless, skinless chicken breast.' },
    origin: { ar: 'البرازيل', en: 'Brazil' },
    sizes: [
      { id: '1kg', name: { ar: '1 كغ', en: '1 kg' }, price: 38 },
      { id: '2kg', name: { ar: '2 كغ', en: '2 kg' }, price: 72 },
    ],
    cuts: ['asis', 'curry', 'mince'],
  },
  {
    id: 'beef-mince', category: 'minced', unit: 'kg', storage: 'fresh', stock: 'in',
    name: { ar: 'لحم عجل مفروم', en: 'Minced beef' },
    desc: { ar: 'مفروم طازج يومياً، نسبة دهن 15٪.', en: 'Freshly minced daily, 15% fat.' },
    origin: { ar: 'باكستان', en: 'Pakistan' },
    sizes: [
      { id: '500g', name: { ar: '500 غ', en: '500 g' }, price: 28 },
      { id: '1kg', name: { ar: '1 كغ', en: '1 kg' }, price: 52 },
    ],
    cuts: ['asis'],
  },
  {
    id: 'kofta', category: 'minced', unit: 'kg', storage: 'fresh', stock: 'in',
    name: { ar: 'كفتة غنم متبلة', en: 'Seasoned lamb kofta' },
    desc: { ar: 'كفتة غنم بالبصل والبقدونس والبهارات، جاهزة للشوي.', en: 'Lamb kofta with onion, parsley and spices, ready to grill.' },
    origin: local,
    sizes: [{ id: '1kg', name: { ar: '1 كغ', en: '1 kg' }, price: 48 }],
    cuts: ['asis'],
  },
  {
    id: 'lamb-tikka', category: 'minced', unit: 'kg', storage: 'fresh', stock: 'in',
    name: { ar: 'تكة غنم متبلة', en: 'Marinated lamb tikka' },
    desc: { ar: 'مكعبات غنم بتتبيلة التكة، جاهزة للشوي.', en: 'Lamb cubes in tikka marinade, ready to grill.' },
    origin: local,
    sizes: [{ id: '1kg', name: { ar: '1 كغ', en: '1 kg' }, price: 75 }],
    cuts: ['asis'],
  },
];

export const productById = (id: string) => products.find((p) => p.id === id);
export const categoryName = (id: CategoryId, lang: Lang) => categories.find((c) => c.id === id)!.name[lang];
export const productImage = (p: Product) => p.image ?? `/images/cat-${p.category}.svg`;
/** Normal (crossed-out) price for a size, if it is higher than the price paid. */
export const wasPrice = (s: Product['sizes'][number]) => (s.was != null && s.was > s.price ? s.was : null);

export const unitLabel: Record<Unit, L10n> = {
  kg: { ar: 'كغ', en: 'kg' },
  piece: { ar: 'قطعة', en: 'piece' },
  head: { ar: 'رأس', en: 'head' },
  pack: { ar: 'عبوة', en: 'pack' },
  box: { ar: 'بوكس', en: 'box' },
  meal: { ar: 'وجبة', en: 'meal' },
};
