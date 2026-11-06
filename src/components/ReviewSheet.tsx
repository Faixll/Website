'use client';
/**
 * Writing a review: sign in first; then only products from a delivered order can be reviewed (checked again
 * on the server). The review is saved as pending and appears once the shop approves it.
 */
import { useId, useState } from 'react';
import { productById } from '@/data/catalog';
import { useAccount } from './AccountProvider';
import { Button } from './Button';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { useStore } from './StoreProvider';

export function useReviewWriter() {
  const { me, reviewable, openSignIn, refresh } = useAccount();
  const { t, showToast } = useStore();
  const [open, setOpen] = useState<{ stars: number; productId?: string } | null>(null);

  const start = (stars: number, productId?: string, signedIn = !!me, can = reviewable) => {
    if (!signedIn) return openSignIn(() => setOpen({ stars, productId }));
    const choices = productId ? can.filter((p) => p === productId) : can;
    if (!choices.length) return showToast(t.reviewErrors.not_eligible);
    setOpen({ stars, productId: productId ?? (choices.length === 1 ? choices[0] : undefined) });
  };

  const sheet = open ? (
    <ReviewSheet initial={open} choices={open.productId ? [open.productId] : reviewable} onClose={() => setOpen(null)}
      onSent={() => { setOpen(null); showToast(t.reviewSent); refresh(); }} />
  ) : null;

  return { start, sheet };
}

function ReviewSheet({ initial, choices, onClose, onSent }: { initial: { stars: number; productId?: string }; choices: string[]; onClose: () => void; onSent: () => void }) {
  const { t, lang } = useStore();
  const id = useId();
  const [productId, setProductId] = useState(initial.productId ?? choices[0] ?? '');
  const [stars, setStars] = useState(initial.stars);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const p = productById(productId);

  const send = async () => {
    setErr('');
    setBusy(true);
    const r = await fetch('/api/reviews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId, stars, text }) }).catch(() => null);
    setBusy(false);
    if (r?.ok) return onSent();
    const d = await r?.json().catch(() => ({}));
    setErr(t.reviewErrors[d?.error] ?? t.orderError);
  };

  return (
    <Sheet open onClose={onClose} title={p ? t.reviewFor(p.name[lang]) : t.writeReview} testId="review-sheet">
      <form className="stack" style={{ gap: 'var(--s4)' }} noValidate onSubmit={(e) => { e.preventDefault(); send(); }}>
        {choices.length > 1 && (
          <div className="options-row" role="radiogroup" aria-label={t.writeReview}>
            {choices.map((c) => (
              <Button key={c} variant="option" role="radio" aria-checked={c === productId} selected={c === productId} onClick={() => setProductId(c)}>
                {productById(c)?.name[lang] ?? c}
              </Button>
            ))}
          </div>
        )}
        <div className="stars stars-input" role="radiogroup" aria-label={t.writeReview}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={t.rateN(n)} onClick={() => setStars(n)}>
              <Icon name="star" size={32} weight={n <= stars ? 'fill' : 'regular'} />
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor={id}>{t.yourReview}</label>
          <textarea id={id} className="textarea" rows={4} maxLength={600} placeholder={t.reviewPh} value={text} onChange={(e) => setText(e.target.value)} data-testid="review-text" />
        </div>
        {err && <p className="error" role="alert">{err}</p>}
        <Button type="submit" size="lg" block loading={busy} disabled={!productId || text.trim().length < 3} data-testid="review-send">{t.sendReview}</Button>
      </form>
    </Sheet>
  );
}
