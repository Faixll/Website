import 'server-only';

/**
 * Deliver an event (new order, notify-me request, contact message) to the business.
 * PLACEHOLDER: set ORDER_WEBHOOK_URL (e.g. a Make/Zapier hook that forwards to WhatsApp/email),
 * or replace this with your order system / database. Without it, events are only logged.
 */
export async function notifyBusiness(kind: 'order' | 'order-paid' | 'notify-me' | 'contact', payload: Record<string, unknown>) {
  const body = { kind, at: new Date().toISOString(), ...payload };
  console.info(`[${kind}]`, JSON.stringify(body));
  const url = process.env.ORDER_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } catch (e) {
    console.error('webhook failed', e);
  }
}
