import 'server-only';
import type { Features } from '@/components/Features';
import { otpAvailable } from '@/lib/otp';
import { sessionSecret } from './session';

/** Default OFF. Rewards + review writing need REWARDS_ENABLED=true, DATABASE_URL, SESSION_SECRET and a way to send codes. */
export function rewardsOn() {
  return process.env.REWARDS_ENABLED === 'true' && !!process.env.DATABASE_URL && !!sessionSecret() && otpAvailable();
}

export function getFeatures(): Features {
  const on = rewardsOn();
  return { rewards: on, reviewsWrite: on };
}
