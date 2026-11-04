'use client';

import { MAX_QTY } from '@/lib/pricing';
import { Icon } from './Icon';
import { useStore } from './StoreProvider';

/** Quantity stepper. Going below 1 calls onChange(0), which callers treat as "remove". */
export function Stepper({
  qty,
  onChange,
  light,
  min = 0,
  label,
}: {
  qty: number;
  onChange: (q: number) => void;
  light?: boolean;
  min?: number;
  label?: string;
}) {
  const { t } = useStore();
  return (
    <div className={`stepper${light ? ' light' : ''}`} role="group" aria-label={label ? `${t.qty}: ${label}` : t.qty}>
      <button type="button" onClick={() => onChange(Math.max(min, qty - 1))} aria-label={t.dec} disabled={qty <= min}>
        <Icon name="minus" />
      </button>
      <output className="num" aria-live="polite">{qty}</output>
      <button type="button" onClick={() => onChange(Math.min(MAX_QTY, qty + 1))} aria-label={t.inc} disabled={qty >= MAX_QTY}>
        <Icon name="plus" />
      </button>
    </div>
  );
}
