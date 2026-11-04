'use client';

import type { ReviewSummary } from '@/lib/reviews';
import { ReviewsSection } from './Reviews';
import { useStore } from './StoreProvider';

/** Home "What our customers say" — real approved reviews only (empty state until there are some). */
export function HomeReviews({ data }: { data: ReviewSummary }) {
  const { t } = useStore();
  return <ReviewsSection data={data} title={t.reviewsHome} />;
}
