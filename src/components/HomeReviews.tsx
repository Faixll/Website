'use client';

import type { ReviewSummary } from '@/lib/reviews';
import { ReviewsSection } from './Reviews';
import { useReviewWriter } from './ReviewSheet';
import { useStore } from './StoreProvider';

/** Home "What our customers say" — real approved reviews only (empty state until there are some). */
export function HomeReviews({ data }: { data: ReviewSummary }) {
  const { t } = useStore();
  const { start, sheet } = useReviewWriter();
  return (
    <>
      <ReviewsSection data={data} title={t.reviewsHome} onWrite={(stars) => start(stars)} />
      {sheet}
    </>
  );
}
