'use client';

import { site } from '@/config/site';
import type { ReviewSummary } from '@/lib/reviews';
import { Button, ButtonLink } from './Button';
import { useFeatures } from './Features';
import { Icon } from './Icon';
import { useStore } from './StoreProvider';

function Stars({ value, size = 18 }: { value: number; size?: number }) {
  return (
    <span className="stars" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => <Icon key={n} name="star" size={size} weight={n <= Math.round(value) ? 'fill' : 'regular'} />)}
    </span>
  );
}

/**
 * Reviews area (home: "What our customers say", product page: "Reviews").
 * Shows ONLY real approved reviews; no average unless there is at least one review.
 * Empty state: an illustration made from the site's icons, the invitation text and five outline gold stars.
 * Tapping a star opens the review form — only when writing reviews is switched on (Part B: sign-in first).
 */
export function ReviewsSection({ data, title, productId, onWrite }: { data: ReviewSummary; title: string; productId?: string; onWrite?: (stars: number, productId?: string) => void }) {
  const { t, lang } = useStore();
  const { reviewsWrite } = useFeatures();
  const canWrite = reviewsWrite && !!onWrite;
  const date = (iso: string) => new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-AE-u-nu-latn' : 'en-AE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' });

  return (
    <div className="stack" style={{ gap: 'var(--s4)' }} data-testid="reviews">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <h2 className="section-title">{title}</h2>
        {data.count > 0 && (
          <span className="stack" style={{ justifyItems: 'end', gap: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><b className="num" style={{ fontSize: 20 }}>{data.average}</b><Stars value={data.average ?? 0} /></span>
            <small className="muted">{t.reviewsCount(data.count)}</small>
          </span>
        )}
      </div>

      {data.count === 0 ? (
        <div className="reviews-empty" data-testid="reviews-empty">
          <span className="reviews-illustration" aria-hidden>
            <Icon name="chat" size={52} />
            <span className="plus"><Icon name="plus" size={18} weight="bold" /></span>
          </span>
          <p>{t.noReviews}</p>
          {canWrite ? (
            <span className="stars" role="group" aria-label={t.writeReview}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={t.rateN(n)} onClick={() => onWrite?.(n, productId)}><Icon name="star" size={28} /></button>
              ))}
            </span>
          ) : (
            <Stars value={0} size={28} />
          )}
        </div>
      ) : (
        <>
          <div className="hscroll">
            {data.reviews.map((r) => (
              <article key={r.id} className="review-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b>{r.firstName}</b><Stars value={r.stars} size={16} /></div>
                <p>{r.text}</p>
                <div className="review-meta">
                  <span className="num">{date(r.createdAt)}</span>
                  {r.verified && <span className="badge badge-gold"><Icon name="seal" size={14} />&nbsp;{t.verifiedOrder}</span>}
                </div>
              </article>
            ))}
          </div>
          {canWrite && <div><Button variant="secondary" icon="star" onClick={() => onWrite?.(5, productId)}>{t.writeReview}</Button></div>}
        </>
      )}

      {site.googleReviewUrl && (
        <div><ButtonLink href={site.googleReviewUrl} variant="ghost" external>{t.reviewOnGoogle}</ButtonLink></div>
      )}
    </div>
  );
}
