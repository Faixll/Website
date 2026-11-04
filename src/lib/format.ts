import type { Lang } from '@/config/site';

/** "65.00 د.إ" in Arabic, "AED 65.00" in English. Western digits in both (UAE convention). */
export function money(amount: number, lang: Lang): string {
  const n = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return lang === 'ar' ? `${n} د.إ` : `AED ${n}`;
}

/** "+971 50 000 0000" from "+971500000000". */
export function phoneDisplay(e164: string): string {
  const d = e164.replace(/\D/g, '');
  if (d.startsWith('971') && d.length === 12) return `+971 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  return e164;
}

/**
 * Normalise a UAE mobile typed in any common form (050…, 50…, 97150…, +971 50…) to E.164.
 * Returns null if it is not a valid UAE mobile (5X + 7 digits).
 */
export function normaliseUaeMobile(input: string): string | null {
  let d = input.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)).replace(/\D/g, '');
  if (d.startsWith('00971')) d = d.slice(5);
  else if (d.startsWith('971')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return /^5[0-9]{8}$/.test(d) ? `+971${d}` : null;
}

export const waLink = (e164: string, text = '') =>
  `https://wa.me/${e164.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
