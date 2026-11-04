'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Branch } from '@/data/places';
import { phoneDisplay } from '@/lib/format';
import { branchStatus, uaeNow, type BranchStatus } from '@/lib/uae-time';
import { Icon } from './Icon';
import { useStore } from './StoreProvider';

/** Status is computed on the client (after mount) so a statically built page never shows a stale open/closed state. */
export function useBranchStatus(b: Branch) {
  const [s, setS] = useState<BranchStatus | null>(null);
  useEffect(() => {
    const tick = () => setS(branchStatus(b));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [b]);
  return s;
}

export function BranchStatusLine({ b }: { b: Branch }) {
  const { t } = useStore();
  const s = useBranchStatus(b);
  if (!s) return <span className="status" aria-hidden>&nbsp;</span>;
  return (
    <span className="status">
      <span className={`dot ${s.open ? 'dot-open' : 'dot-closed'}`} aria-hidden />
      {s.open ? (
        <><span className="status-open">{t.open}</span><span className="muted num">· {t.closesAt(s.closesAt)}</span></>
      ) : (
        <><span className="status-closed">{t.closed}</span>{s.opensAt && <span className="muted num">· {t.opensAt(s.opensAt, s.opensDay != null ? t.weekdays[s.opensDay] : undefined)}</span>}</>
      )}
    </span>
  );
}

export const directionsUrl = (b: Branch) => `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`;

export function BranchCard({ b, showHours, selected, onSelect }: { b: Branch; showHours?: boolean; selected?: boolean; onSelect?: () => void }) {
  const { t, lang, setFulfilment, showToast } = useStore();
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => setToday(uaeNow().getUTCDay()), []);

  return (
    <article className={`branch${selected ? ' selected' : ''}`}>
      <h3>{b.name[lang]}</h3>
      <p className="addr">{b.address[lang]}</p>
      <BranchStatusLine b={b} />
      {showHours && (
        <table className="hours-table">
          <caption className="sr-only">{t.hours}</caption>
          <tbody>
            {[6, 0, 1, 2, 3, 4, 5].map((d) => (
              <tr key={d} className={today === d ? 'today' : undefined}>
                <td>{t.weekdays[d]}</td>
                <td className="num">{b.hours[d].map(([o, c], i) => <span key={o} className="iso">{i > 0 && ' · '}<span className="iso">{o}–{c}</span></span>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="actions">
        <a className="btn btn-ghost" href={`tel:${b.phone}`} aria-label={`${t.call} ${phoneDisplay(b.phone)}`}><Icon name="phone" />{t.call}</a>
        <a className="btn btn-ghost" href={directionsUrl(b)} target="_blank" rel="noopener"><Icon name="pin" />{t.directions}</a>
        {onSelect ? (
          <button type="button" className="btn btn-outline" onClick={onSelect} aria-pressed={selected}>{t.map}</button>
        ) : null}
        <Link
          className="btn btn-outline"
          href={`/${lang}/checkout`}
          onClick={() => { setFulfilment({ type: 'pickup', branchId: b.id }); showToast(t.pickupHere); }}
        >
          <Icon name="store" />{t.pickupHere}
        </Link>
      </div>
    </article>
  );
}
