'use client';

import { useEffect, useId, useState } from 'react';
import { Icon } from './Icon';
import { useStore } from './StoreProvider';

/** Reads what the customer typed: Arabic or Latin digits, "." or "," or "٫" as the decimal point. */
export function parseAmount(raw: string): number | null {
  const s = raw.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)).replace(/[٫,]/g, '.').replace(/[^\d.]/g, '');
  if (!s || s === '.') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Amount stepper. − / + move by `step`; values are rounded to `precision` (defaults to `step`).
 * `editable`: the amount is a text field the customer can type into (kg products: "1.3").
 * Going below `min` calls onChange(0) when `removable` (cart lines), otherwise stops at `min`.
 */
export function Stepper({
  value, onChange, min = 1, max = 20, step = 1, precision, format = String, label, small, removable, editable, unit,
}: {
  value: number; onChange: (q: number) => void; min?: number; max?: number; step?: number; precision?: number;
  format?: (v: number) => string; label?: string; small?: boolean; removable?: boolean; editable?: boolean; unit?: string;
}) {
  const { t } = useStore();
  const id = useId();
  const p = precision ?? step;
  const round = (v: number) => Math.round(Math.round(v / p) * p * 1000) / 1000;
  const dec = () => onChange(value - step < min - 1e-9 ? (removable ? 0 : min) : round(value - step));
  const inc = () => onChange(Math.min(max, round(value + step)));

  // Typing: keep the raw text while editing; commit a valid amount immediately, clamp on blur.
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const [err, setErr] = useState(false);
  useEffect(() => { if (!focused) setDraft(String(value)); }, [value, focused]);

  const commit = (raw: string, final: boolean) => {
    const n = parseAmount(raw);
    if (n == null) { setErr(true); if (final) { setDraft(String(value)); setErr(false); } return; }
    const ok = n >= min && n <= max;
    setErr(!ok && !final);
    if (ok) onChange(round(n));
    else if (final) { const c = round(Math.min(max, Math.max(min, n))); onChange(c); setDraft(String(c)); setErr(false); }
  };

  return (
    <div className={`stepper${small ? ' sm' : ''}${editable ? ' editable' : ''}`} role="group" aria-label={label ? `${t.qty}: ${label}` : t.qty}>
      <button type="button" onClick={dec} aria-label={t.dec} disabled={!removable && value <= min}>
        <Icon name="minus" size={20} />
      </button>
      {editable ? (
        <span className="amount-field">
          <label htmlFor={id} className="sr-only">{t.typeAmount(min, max)}</label>
          <input id={id} className="num" type="text" inputMode="decimal" autoComplete="off" enterKeyHint="done"
            value={draft} aria-invalid={err || undefined} aria-describedby={`${id}-hint`} data-testid="amount-input"
            onFocus={(e) => { setFocused(true); e.currentTarget.select(); }}
            onChange={(e) => { setDraft(e.target.value); commit(e.target.value, false); }}
            onBlur={(e) => { setFocused(false); commit(e.target.value, true); }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }} />
          {unit && <span className="unit" aria-hidden>{unit}</span>}
          <span id={`${id}-hint`} className="sr-only">{t.typeAmount(min, max)}</span>
        </span>
      ) : (
        <output className="num" aria-live="polite">{format(value)}</output>
      )}
      <button type="button" onClick={inc} aria-label={t.inc} disabled={value >= max}>
        <Icon name="plus" size={20} />
      </button>
    </div>
  );
}
