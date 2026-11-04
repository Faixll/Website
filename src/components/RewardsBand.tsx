'use client';

import { useFeatures } from './Features';
import { RewardsBandInner } from './Rewards';

/** Black rewards band on the home page. Omitted entirely while rewards are switched off. */
export function RewardsBand() {
  const { rewards } = useFeatures();
  if (!rewards) return null;
  return <RewardsBandInner />;
}
