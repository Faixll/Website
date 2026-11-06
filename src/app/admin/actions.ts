'use server';
/**
 * Admin actions (server actions — Next checks the request comes from this site).
 * Every action re-checks the signed admin cookie.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { adjustPoints, adminLocked, recordAdminFailure, setOrderStatus, setReviewStatus, type OrderStatus } from '@/lib/db/store';
import { getDb } from '@/lib/server/db';
import { clearAdminCookie, clientIp, isAdmin, sessionSecret, setAdminCookie } from '@/lib/server/session';

const sha = (s: string) => createHash('sha256').update(s).digest();

export async function login(_: unknown, form: FormData): Promise<{ error: string } | undefined> {
  const db = getDb();
  const want = process.env.ADMIN_PASSWORD;
  if (!db || !want || !sessionSecret()) return { error: 'Admin is not configured (DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET).' };
  const ip = await clientIp();
  if (await adminLocked(db, ip)) return { error: 'Too many wrong passwords. Try again in 15 minutes.' };
  const got = String(form.get('password') ?? '');
  if (!timingSafeEqual(sha(got), sha(want))) {
    await recordAdminFailure(db, ip);
    return { error: 'Wrong password.' };
  }
  await setAdminCookie();
  redirect('/admin/orders');
}

export async function logout() {
  await clearAdminCookie();
  redirect('/admin');
}

async function guard() {
  const db = getDb();
  if (!db || !(await isAdmin())) redirect('/admin');
  return db;
}

export async function changeOrder(form: FormData) {
  const db = await guard();
  const to = String(form.get('status')) as OrderStatus;
  if (!['delivered', 'cancelled', 'new'].includes(to)) return;
  await setOrderStatus(db, String(form.get('id')), to);
  revalidatePath('/admin/orders');
}

export async function changePoints(form: FormData) {
  const db = await guard();
  const delta = Math.trunc(Number(form.get('delta')));
  if (!delta) return;
  await adjustPoints(db, String(form.get('customerId')), delta, String(form.get('note') ?? '').slice(0, 200));
  revalidatePath('/admin/orders');
}

export async function changeReview(form: FormData) {
  const db = await guard();
  const status = String(form.get('status'));
  if (status !== 'approved' && status !== 'rejected') return;
  await setReviewStatus(db, Number(form.get('id')), status);
  revalidatePath('/admin/reviews');
  revalidatePath('/[lang]', 'layout'); // approved reviews show up on the site
}
