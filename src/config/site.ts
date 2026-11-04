/**
 * ONE FILE TO EDIT for business details.
 * Everything marked PLACEHOLDER must be replaced with real values before launch.
 */

export const site = {
  name: {
    en: 'Hawar Al Bada Fresh Meat Trading',
    // PLACEHOLDER spelling: confirm the official Arabic trade name on the trade license.
    ar: 'حوار البدع لتجارة اللحوم الطازجة',
  },
  /** PLACEHOLDER: the live domain (used for share links and SEO). */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.ae',

  shortName: { en: 'Hawar Al Bada', ar: 'حوار البدع' },

  /** Logo file in /public. PLACEHOLDER: replace /public/logo.svg with the real logo. */
  logo: '/logo.svg',

  /** PLACEHOLDER contact details. Phone in E.164 (+971…). */
  phone: '+971500000000',
  whatsapp: '+971500000000',
  email: 'orders@example.ae',
  instagram: 'https://instagram.com/example',

  /** PLACEHOLDER legal details shown in the footer and on receipts. */
  tradeLicense: 'CN-0000000',
  trn: '100000000000003',

  /** Tax: UAE VAT, prices on the site INCLUDE VAT. */
  vatRate: 0.05,
  currency: 'AED',

  /** Delivery rules. PLACEHOLDER AMOUNTS: to be provided by the business. */
  delivery: {
    freeAbove: 200,
    /** Fee and minimum order per emirate, in AED (VAT inclusive). */
    emirates: {
      // Al Ain only for now: 15 AED, no minimum order (still free above `freeAbove`).
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
   * Loyalty points. Earned on what the customer pays for products (after any points discount,
   * excluding the delivery fee), credited when a card order is paid or a cash order is delivered.
   */
  points: {
    perAed: 1,
    /** Money off: each block of `points` gives `aed` off (500 = 25 AED, i.e. 5% back). */
    moneyOff: { points: 500, aed: 25 },
    /** Free delivery on one order. */
    freeDelivery: { points: 150 },
  },

  /** Payment methods shown in the footer / checkout. */
  payments: ['applepay', 'googlepay', 'visa', 'mastercard', 'cod'] as const,

  /** Fixed UAE offset (GST, UTC+4, no daylight saving). */
  utcOffsetHours: 4,
} as const;

export type Lang = 'ar' | 'en';
export const LANGS: Lang[] = ['ar', 'en'];
