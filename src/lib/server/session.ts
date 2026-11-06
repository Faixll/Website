import 'server-only';
import { cookies, headers } from 'next/headers';
import { signValue, verifyValue } from '@/lib/session-token';

const CUSTOMER = 'hab_session';
const ADMIN = 'hab_admin';
export const SESSION_DAYS = 30;

/** SESSION_SECRET (32+ random characters) signs the cookies. Required in production; a fixed value is used in development. */
export function sessionSecret(): string | null {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  return process.env.NODE_ENV === 'production' ? null : 'dev-only-secret-not-for-production-use';
}

const base = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' };

export async function customerIdFromCookie(): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret) return null;
  const v = verifyValue<{ cid: string }>(secret, (await cookies()).get(CUSTOMER)?.value);
  return typeof v?.cid === 'string' ? v.cid : null;
}

export async function setCustomerCookie(cid: string) {
  (await cookies()).set(CUSTOMER, signValue(sessionSecret()!, { cid }, SESSION_DAYS * 86400), { ...base, maxAge: SESSION_DAYS * 86400 });
}

export async function clearCustomerCookie() {
  (await cookies()).set(CUSTOMER, '', { ...base, maxAge: 0 });
}

export async function isAdmin(): Promise<boolean> {
  const secret = sessionSecret();
  if (!secret || !process.env.ADMIN_PASSWORD) return false;
  return verifyValue<{ admin: boolean }>(secret, (await cookies()).get(ADMIN)?.value)?.admin === true;
}

export async function setAdminCookie() {
  (await cookies()).set(ADMIN, signValue(sessionSecret()!, { admin: true }, 12 * 3600), { ...base, maxAge: 12 * 3600 });
}

export async function clearAdminCookie() {
  (await cookies()).set(ADMIN, '', { ...base, maxAge: 0 });
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'unknown').trim().slice(0, 64);
}

/** Rejects cross-site posts to the JSON APIs (simple CSRF guard on top of SameSite cookies). */
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.get('host'); } catch { return false; }
}
