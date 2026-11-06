/**
 * Signed, expiring tokens for cookies (customer session, admin session): base64url(JSON).HMAC-SHA256.
 * The signature uses SESSION_SECRET; anything tampered with, expired or signed with another secret is rejected.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const b64 = (s: string) => Buffer.from(s).toString('base64url');
const sign = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest('base64url');

export function signValue(secret: string, payload: Record<string, unknown>, ttlSeconds: number, now = new Date()) {
  const data = b64(JSON.stringify({ ...payload, exp: Math.floor(now.getTime() / 1000) + ttlSeconds }));
  return `${data}.${sign(secret, data)}`;
}

export function verifyValue<T extends Record<string, unknown>>(secret: string, token: string | undefined | null, now = new Date()): T | null {
  if (!token) return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const want = Buffer.from(sign(secret, data));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const { exp, ...rest } = JSON.parse(Buffer.from(data, 'base64url').toString()) as { exp: number } & T;
    if (typeof exp !== 'number' || exp * 1000 <= now.getTime()) return null;
    return rest as unknown as T;
  } catch {
    return null;
  }
}
