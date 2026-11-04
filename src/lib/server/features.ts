import 'server-only';
import type { Features } from '@/components/Features';

/** A way to send sign-in codes: in development the code is printed to the server log; in production a provider is required. */
export function otpAvailable() {
  if (process.env.NODE_ENV !== 'production') return true;
  return !!(process.env.OTP_PROVIDER && process.env.OTP_API_KEY);
}

/** Rewards and review writing need REWARDS_ENABLED=true, a database and a way to send codes. Default: off. */
export function getFeatures(): Features {
  const on = process.env.REWARDS_ENABLED === 'true' && !!process.env.DATABASE_URL && otpAvailable();
  return { rewards: on, reviewsWrite: on };
}
