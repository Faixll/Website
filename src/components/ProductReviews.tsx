'use client';

import type { ReviewSummary } from '@/lib/reviews';
import { ReviewsSection } from './Reviews';
import { useReviewWriter } from './ReviewSheet';
import { useStore } from './StoreProvider';

/** Product page "Reviews" — real approved reviews for this product only. */
export function ProductReviews({ data, productId }: { data: ReviewSummary; productId: string }) {
  const { t } = useStore();
  const { start, sheet } = useReviewWriter();
  return (
    <>
      <ReviewsSection data={data} title={t.reviewsTitle} productId={productId} onWrite={(stars, pid) => start(stars, pid)} />
      {sheet}
    </>
  );
}
