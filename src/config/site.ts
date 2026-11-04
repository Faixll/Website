/**
 * ONE FILE TO EDIT for business, contact and legal details.
 * Every value marked `TODO` is a placeholder and must be replaced before launch.
 * The header, footer, branches page, profile page, checkout and contact forms all read from here.
 */

/** Opening hours per weekday (0 = Sunday … 6 = Saturday), as [open, close] in "HH:MM" UAE time. */
export type Hours = Record<number, [string, string][]>;
const everyDay = (ranges: [string, string][], friday?: [string, string][]): Hours =>
  Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, d === 5 && friday ? friday : ranges]));

export const site = {
  name: {
    en: 'Hawar Albada Fresh Meat Trading',
    // TODO: confirm the official Arabic trade name on the trade license.
    ar: 'حوار البدع لتجارة اللحوم الطازجة',
  },
  shortName: { en: 'Hawar Albada', ar: 'حوار البدع' },

  /** TODO: the live domain (used for share links and SEO). */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.ae',

  /** TODO: replace /public/logo.svg with the real logo. */
  logo: '/logo.svg',

  /* ---------------- contact (TODO: all placeholders) ---------------- */
  /** TODO: main phone, E.164 format (+971…). */
  phone: '+971500000000',
  /** TODO: WhatsApp number, E.164 format. Used by the floating WhatsApp button. */
  whatsapp: '+971500000000',
  /** TODO: orders email. */
  email: 'orders@example.ae',
  /** TODO: Instagram handle (without @) — the link is built from it. */
  instagramHandle: 'example',

  /* ---------------- legal (TODO: placeholders) ---------------- */
  /** TODO: trade license number. */
  tradeLicense: 'CN-0000000',
  /** TODO: tax registration number (TRN). */
  trn: '100000000000003',

  /* ---------------- branches ----------------
   * The site has one branch for now (Al Ain, Al Towayya). Name, address and map pin live in src/data/places.ts.
   * TODO: confirm each branch phone and its opening hours.
   */
  branches: {
    'al-ain-towayya': {
      /** TODO: branch phone. */
      phone: '+971500000001',
      /** TODO: confirm hours. Currently: daily 07:00–23:00; Friday 07:00–11:30 and 13:30–23:00 (prayer break). */
      hours: everyDay([['07:00', '23:00']], [['07:00', '11:30'], ['13:30', '23:00']]),
    },
  } as Record<string, { phone: string; hours: Hours }>,

  /* ---------------- payments ---------------- */
  /**
   * Online payments (Apple Pay / Google Pay / card via Stripe) are OFF until Stripe is connected.
   * Turn on by setting NEXT_PUBLIC_ONLINE_PAYMENTS_ENABLED=true (and the Stripe keys) in the environment.
   */
  onlinePayments: process.env.NEXT_PUBLIC_ONLINE_PAYMENTS_ENABLED === 'true' && !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,

  /** Tax: UAE VAT, prices on the site INCLUDE VAT. */
  vatRate: 0.05,
  currency: 'AED',

  /** Delivery rules. */
  delivery: {
    /** Free delivery above this products subtotal (AED). */
    freeAbove: 200,
    /** Fee and minimum order per delivery city, in AED (VAT inclusive). */
    emirates: {
      // Al Ain only for now: 15 AED, no minimum order.
      'al-ain': { fee: 15, minOrder: 0, sameDay: true },
    } as Record<string, { fee: number; minOrder: number; sameDay: boolean }>,
    /** Delivery slots (UAE time, 24h). Same-day orders close `cutoffMinutes` before a slot starts. */
    slots: [
      { id: '09-12', start: 9, end: 12 },
      { id: '12-15', start: 12, end: 15 },
      { id: '15-18', start: 15, end: 18 },
      { id: '18-21', start: 18, end: 21 },
    ],
    cutoffMinutes: 90,
    /** How many days ahead customers can book. */
    daysAhead: 3,
  },

  /**
   * Loyalty points (only active when Supabase accounts are configured; currently off).
   */
  points: {
    perAed: 1,
    moneyOff: { points: 500, aed: 25 },
    freeDelivery: { points: 150 },
  },

  /** Fixed UAE offset (GST, UTC+4, no daylight saving). */
  utcOffsetHours: 4,
} as const;

export const instagramUrl = `https://instagram.com/${site.instagramHandle}`;

export type Lang = 'ar' | 'en';
export const LANGS: Lang[] = ['ar', 'en'];
