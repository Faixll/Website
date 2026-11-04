/**
 * Reviews data layer. Only REAL, approved reviews are ever shown — never sample or fake ones.
 * Part A: no database yet, so this returns an empty list (the UI shows the empty state).
 * Part B replaces the body with a database query (see src/lib/server/reviews-db.ts).
 */
export type Review = {
  id: string;
  firstName: string;
  stars: 1 | 2 | 3 | 4 | 5;
  text: string;
  createdAt: string; // ISO date
  verified: boolean;
};

export type ReviewSummary = { reviews: Review[]; average: number | null; count: number };

export function summarize(reviews: Review[]): ReviewSummary {
  if (!reviews.length) return { reviews, average: null, count: 0 };
  const avg = reviews.reduce((s, r) => s + r.stars, 0) / reviews.length;
  return { reviews, average: Math.round(avg * 10) / 10, count: reviews.length };
}

export async function getReviews(productId?: string): Promise<ReviewSummary> {
  void productId;
  return summarize([]);
}
