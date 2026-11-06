/**
 * Reviews shown on the site. Only REAL, approved reviews from customers with a delivered order —
 * never sample or fake ones. Without a database the list is empty (the UI shows the empty state).
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

/** Server only. The database is imported lazily so client bundles never include it. */
export async function getReviews(productId?: string): Promise<ReviewSummary> {
  if (typeof window !== 'undefined' || !process.env.DATABASE_URL) return summarize([]);
  try {
    const { getDb } = await import('./server/db');
    const { approvedReviews, reviewStats } = await import('./db/store');
    const db = getDb();
    if (!db) return summarize([]);
    const [rows, stats] = await Promise.all([approvedReviews(db, productId), reviewStats(db, productId)]);
    return {
      reviews: rows.map((r) => ({ id: String(r.id), firstName: r.firstName, stars: r.stars as Review['stars'], text: r.text, createdAt: r.createdAt.toISOString(), verified: true })),
      average: stats.average,
      count: stats.count,
    };
  } catch (e) {
    console.error('reviews unavailable', e);
    return summarize([]);
  }
}
