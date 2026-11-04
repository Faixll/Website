'use client';

import { money } from '@/lib/format';
import { useStore } from './StoreProvider';

/** Regular price, crossed out. Screen readers hear "Regular price …" since strikethrough isn't announced. */
export function WasPrice({ amount }: { amount: number | null }) {
  const { t, lang } = useStore();
  if (amount == null) return null;
  return (
    <span className="was num">
      <span className="sr-only">{t.wasLabel} </span>
      <s>{money(amount, lang)}</s>
    </span>
  );
}
