'use client';
/**
 * Rewards UI. Everything here renders NOTHING while rewards are switched off (REWARDS_ENABLED=false),
 * so no "coming soon" text ever shows. The signed-in parts are completed in Part B.
 */
import { useFeatures } from './Features';

export function RewardsChip() {
  const { rewards } = useFeatures();
  if (!rewards) return null;
  return null;
}

/** Filled in Part B (sign-in sheet, balance). Only reached when rewards are on. */
export function RewardsBandInner() {
  return null;
}
