'use client';

import type { ReviewSummary } from '@/lib/reviews';
import { ReviewsSection } from './Reviews';
import { useStore } from './StoreProvider';

/** Product page "Reviews" — real approved reviews for this product only. */
export function ProductReviews({ data, productId }: { data: ReviewSummary; productId: string }) {
  const { t } = useStore();
  return <ReviewsSection data={data} title={t.reviewsTitle} productId={productId} />;
}
