'use client';

import type { Lang } from '@/config/site';
import { money } from '@/lib/format';
import { useStore } from './StoreProvider';

/** Normal price, crossed out. Screen readers hear "Normal price …" since strikethrough isn't announced. */
export function WasPrice({ amount }: { amount: number | null; lang?: Lang }) {
  const { t, lang } = useStore();
  if (amount == null) return null;
  return (
    <s className="was num">
      <span className="sr-only">{t.wasLabel} </span>
      {money(amount, lang)}
    </s>
  );
}
