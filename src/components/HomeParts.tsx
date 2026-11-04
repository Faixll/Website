'use client';

import { useEffect, useState } from 'react';
import { site } from '@/config/site';
import { productById, productImage } from '@/data/catalog';
import { money } from '@/lib/format';
import { linePrice } from '@/lib/pricing';
import { slotAvailable, slotDays, type SlotDay } from '@/lib/uae-time';
import { Icon } from './Icon';
import { useStore } from './StoreProvider';

export const slotLabel = (start: number, end: number) => `${String(start).padStart(2, '0')}:00–${String(end).padStart(2, '0')}:00`;

/** Day + time-slot picker. Shared by the home hero and checkout. */
export function SlotPicker({ idPrefix = 'hero' }: { idPrefix?: string }) {
  const { t, lang, slot, setSlot } = useStore();
  const [days, setDays] = useState<SlotDay[]>([]);
  const [, force] = useState(0);

  useEffect(() => {
    setDays(slotDays(site.delivery.daysAhead));
    const id = setInterval(() => force((n) => n + 1), 60_000); // re-evaluate same-day cutoffs
    return () => clearInterval(id);
  }, []);

  // Drop a stored slot that is in the past / no longer bookable.
  useEffect(() => {
    if (!days.length || !slot) return;
    const d = days.find((x) => x.date === slot.date);
    const s = site.delivery.slots.find((x) => x.id === slot.slotId);
    if (!d || !s || !slotAvailable(d.offset, s.start)) setSlot(null);
  }, [days, slot, setSlot]);

  if (!days.length) return <div style={{ minHeight: 104 }} aria-hidden />;

  const dayName = (d: SlotDay) => (d.offset === 0 ? t.today : d.offset === 1 ? t.tomorrow : t.weekdays[d.weekday]);
  const fmtDate = (iso: string) =>
    new Date(iso + 'T00:00:00Z').toLocaleDateString(lang === 'ar' ? 'ar-AE-u-nu-latn' : 'en-AE', { day: 'numeric', month: 'short', timeZone: 'UTC' });

  const anyToday = site.delivery.slots.some((s) => slotAvailable(0, s.start));
  const selDate = slot?.date ?? days[anyToday ? 0 : 1]?.date;
  const selDay = days.find((d) => d.date === selDate) ?? days[0];

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="days" role="group" aria-label={t.deliverWhen}>
        {days.map((d) => {
          const has = site.delivery.slots.some((s) => slotAvailable(d.offset, s.start));
          return (
            <button
              key={d.date}
              type="button"
              className="seg"
              aria-pressed={selDay.date === d.date}
              disabled={!has}
              onClick={() => {
                const first = site.delivery.slots.find((s) => slotAvailable(d.offset, s.start));
                if (first) setSlot({ date: d.date, slotId: slot?.date === d.date ? slot.slotId : first.id });
              }}
            >
              {dayName(d)}
              <small className="num">{fmtDate(d.date)}</small>
            </button>
          );
        })}
      </div>
      <div className="slots" role="group" aria-label={t.when} id={`${idPrefix}-slots`}>
        {site.delivery.slots.map((s) => {
          const ok = slotAvailable(selDay.offset, s.start);
          return (
            <button
              key={s.id}
              type="button"
              className="seg num"
              aria-pressed={slot?.date === selDay.date && slot.slotId === s.id}
              disabled={!ok}
              aria-label={`${dayName(selDay)} ${slotLabel(s.start, s.end)}${ok ? '' : ` (${t.slotFull})`}`}
              onClick={() => setSlot({ date: selDay.date, slotId: s.id })}
            >
              {slotLabel(s.start, s.end)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function HeroPicker() {
  const { t } = useStore();
  return (
    <div className="picker">
      <p className="p-title"><Icon name="clock" />{t.deliverWhen}</p>
      <SlotPicker />
    </div>
  );
}

export function ReorderStrip() {
  const { t, lang, lastOrder, add, ready, showToast } = useStore();
  const [done, setDone] = useState(false);
  if (!ready || !lastOrder?.length) return null;
  const available = lastOrder.filter((l) => productById(l.productId)?.stock !== 'out');
  if (!available.length) return null;
  const names = available.map((l) => productById(l.productId)!.name[lang]).join(lang === 'ar' ? '، ' : ', ');
  const total = available.reduce((s, l) => s + linePrice(l), 0);

  return (
    <section className="container" style={{ marginTop: 16 }} aria-label={t.reorderTitle}>
      <div className="reorder">
        <div className="thumbs" aria-hidden>
          {available.slice(0, 3).map((l) => (
            <img key={l.key} src={productImage(productById(l.productId)!)} alt="" width={40} height={40} />
          ))}
        </div>
        <div className="r-text">
          <b>{t.reorderTitle}</b>
          <span>{names} · <span className="num">{money(total, lang)}</span></span>
        </div>
        <button
          type="button"
          className={`btn ${done ? 'btn-green' : 'btn-outline'}`}
          onClick={() => {
            available.forEach((l) => add({ productId: l.productId, sizeId: l.sizeId, cutId: l.cutId, notes: l.notes }, l.qty));
            setDone(true);
            showToast(t.addedToCart);
          }}
        >
          <Icon name={done ? 'check' : 'repeat'} />
          {done ? t.reorderDone : t.reorderBtn}
        </button>
      </div>
    </section>
  );
}
