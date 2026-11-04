'use client';

import { Icon } from './Icon';
import { useStore } from './StoreProvider';

/** Amount stepper. Going below `min` calls onChange(0) when `removable` (cart lines), otherwise stops at `min`. */
export function Stepper({
  value, onChange, min = 1, max = 20, step = 1, format = String, label, small, removable,
}: {
  value: number; onChange: (q: number) => void; min?: number; max?: number; step?: number;
  format?: (v: number) => string; label?: string; small?: boolean; removable?: boolean;
}) {
  const { t } = useStore();
  const round = (v: number) => Math.round(v / step) * step;
  const dec = () => onChange(value - step < min ? (removable ? 0 : min) : round(value - step));
  const inc = () => onChange(Math.min(max, round(value + step)));
  return (
    <div className={`stepper${small ? ' sm' : ''}`} role="group" aria-label={label ? `${t.qty}: ${label}` : t.qty}>
      <button type="button" onClick={dec} aria-label={t.dec} disabled={!removable && value <= min}>
        <Icon name="minus" size={20} />
      </button>
      <output className="num" aria-live="polite">{format(value)}</output>
      <button type="button" onClick={inc} aria-label={t.inc} disabled={value >= max}>
        <Icon name="plus" size={20} />
      </button>
    </div>
  );
}
