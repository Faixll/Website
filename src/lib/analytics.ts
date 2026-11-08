/**
 * Ad / analytics tags: Google Analytics 4, Meta (Instagram/Facebook) Pixel, TikTok Pixel.
 * Each one loads only when its ID is set (NEXT_PUBLIC_GA_ID, NEXT_PUBLIC_META_PIXEL_ID, NEXT_PUBLIC_TIKTOK_PIXEL_ID).
 * IDs are format-checked so nothing unexpected is ever written into the page.
 */
const clean = (v: string | undefined, re: RegExp) => (v && re.test(v.trim()) ? v.trim() : '');

export const GA_ID = clean(process.env.NEXT_PUBLIC_GA_ID, /^G-[A-Z0-9]{4,20}$/);
export const META_PIXEL_ID = clean(process.env.NEXT_PUBLIC_META_PIXEL_ID, /^\d{6,20}$/);
export const TIKTOK_PIXEL_ID = clean(process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID, /^[A-Z0-9]{8,30}$/);
export const analyticsOn = !!(GA_ID || META_PIXEL_ID || TIKTOK_PIXEL_ID);

type W = Window & {
  gtag?: (...a: unknown[]) => void;
  fbq?: (...a: unknown[]) => void;
  ttq?: { track: (e: string, d?: object) => void; page: () => void };
};

type Item = { id: string; name: string; price: number; quantity: number };
type Ev =
  | { name: 'add_to_cart'; value: number; items: Item[] }
  | { name: 'begin_checkout'; value: number; items: Item[] }
  | { name: 'purchase'; value: number; orderId: string; items: Item[] };

/** Sends one shop event to every tag that is switched on. Never throws. */
export function track(e: Ev) {
  if (typeof window === 'undefined' || !analyticsOn) return;
  const w = window as W;
  try {
    const items = e.items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity }));
    w.gtag?.('event', e.name, { currency: 'AED', value: e.value, items, ...(e.name === 'purchase' ? { transaction_id: e.orderId } : {}) });
    const meta = { add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'Purchase' }[e.name];
    w.fbq?.('track', meta, { currency: 'AED', value: e.value, content_type: 'product', content_ids: e.items.map((i) => i.id) });
    const tt = { add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'CompletePayment' }[e.name];
    w.ttq?.track(tt, { currency: 'AED', value: e.value, content_type: 'product', contents: e.items.map((i) => ({ content_id: i.id, content_name: i.name, quantity: i.quantity, price: i.price })) });
  } catch {
    /* analytics must never break the shop */
  }
}

/** Page view on client-side navigation (the first page view is sent by the tags themselves). */
export function trackPageView(url: string) {
  if (typeof window === 'undefined' || !analyticsOn) return;
  const w = window as W;
  try {
    if (GA_ID) w.gtag?.('event', 'page_view', { page_location: location.origin + url });
    w.fbq?.('track', 'PageView');
    w.ttq?.page();
  } catch {
    /* ignore */
  }
}
