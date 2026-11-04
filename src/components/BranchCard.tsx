'use client';

import { useEffect, useId, useState } from 'react';
import type { Branch } from '@/data/places';
import { phoneDisplay } from '@/lib/format';
import { branchStatus, uaeNow, type BranchStatus } from '@/lib/uae-time';
import { TimeRange } from './HomeParts';
import { Button, ButtonLink } from './Button';
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

const ranges = (r: [string, string][]) =>
  r.map(([o, c], i) => <span key={o}>{i > 0 && ' · '}<TimeRange>{o}–{c}</TimeRange></span>);

export function BranchStatusLine({ b }: { b: Branch }) {
  const { t } = useStore();
  const s = useBranchStatus(b);
  if (!s) return <span className="status" aria-hidden>&nbsp;</span>;
  return (
    <span className="status">
      <span className={`dot ${s.open ? 'dot-open' : 'dot-closed'}`} aria-hidden />
      {s.open ? (
        <><span className="status-open">{t.open}</span><span className="muted">· {t.closesAt('')}<TimeRange>{s.closesAt}</TimeRange></span></>
      ) : (
        <><span className="status-closed">{t.closed}</span>{s.opensAt && <span className="muted">· {t.opensAt('', s.opensDay != null ? t.weekdays[s.opensDay] : undefined)}<TimeRange>{s.opensAt}</TimeRange></span>}</>
      )}
    </span>
  );
}

export const directionsUrl = (b: Branch) => `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`;

export function BranchCard({ b, selected, onSelect }: { b: Branch; selected?: boolean; onSelect?: () => void }) {
  const { t, lang, setFulfilment, showToast } = useStore();
  const [today, setToday] = useState<number | null>(null);
  const [allHours, setAllHours] = useState(false);
  const tableId = useId();
  useEffect(() => setToday(uaeNow().getUTCDay()), []);

  return (
    <article className={`branch${selected ? ' selected' : ''}`} data-testid="branch">
      <h3>{b.name[lang]}</h3>
      <p className="addr">{b.address[lang]}</p>
      <BranchStatusLine b={b} />
      {today != null && (
        <p className="small"><span className="muted">{t.todayHours}: </span>{ranges(b.hours[today])}</p>
      )}
      <div>
        <Button variant="ghost" arrow={false} icon="clock" aria-expanded={allHours} aria-controls={tableId} onClick={() => setAllHours((v) => !v)}>
          {allHours ? t.hideAllHours : t.showAllHours}
        </Button>
        {allHours && (
          <table className="hours-table" id={tableId}>
            <caption className="sr-only">{t.hours}</caption>
            <tbody>
              {[6, 0, 1, 2, 3, 4, 5].map((d) => (
                <tr key={d} className={today === d ? 'today' : undefined}>
                  <td>{t.weekdays[d]}</td>
                  <td>{ranges(b.hours[d])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="actions">
        <ButtonLink variant="secondary" icon="phone" href={`tel:${b.phone}`} aria-label={`${t.call} ${phoneDisplay(b.phone)}`}>{t.call}</ButtonLink>
        <ButtonLink variant="secondary" icon="pin" href={directionsUrl(b)} external>{t.openInMaps}</ButtonLink>
        {onSelect && <Button variant="option" selected={selected} onClick={onSelect} aria-pressed={selected}>{t.map}</Button>}
        <ButtonLink icon="store" href={`/${lang}/checkout`} onClick={() => { setFulfilment({ type: 'pickup', branchId: b.id }); showToast(t.pickupHere); }}>
          {t.pickupHere}
        </ButtonLink>
      </div>
    </article>
  );
}
