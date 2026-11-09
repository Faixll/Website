'use client';

import { useInView, useReducedMotion } from 'motion/react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { site } from '@/config/site';
import { slotAvailable, slotDays, type SlotDay } from '@/lib/uae-time';
import { Icon, type IconName } from './Icon';
import { useStore } from './StoreProvider';

export const slotLabel = (start: number, end: number) => `${String(start).padStart(2, '0')}:00–${String(end).padStart(2, '0')}:00`;

/** A time range that always reads left-to-right ("09:00–12:00"), also inside Arabic text. */
export function TimeRange({ children }: { children: React.ReactNode }) {
  return <bdi dir="ltr" className="num">{children}</bdi>;
}

/** Day + time-slot picker. Shared by the home delivery card and checkout. */
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

  // Before the browser knows today's date, render the same grid with invisible placeholders, so the card
  // already has its final height at every screen width (no layout shift when the real days appear).
  if (!days.length) {
    return (
      <div className="stack" style={{ gap: 8, visibility: 'hidden' }} aria-hidden data-testid="slot-placeholder">
        <div className="days">
          {Array.from({ length: site.delivery.daysAhead }, (_, i) => (
            <span key={i} className="seg">{t.today}<small className="num">00 {t.today}</small></span>
          ))}
        </div>
        <div className="slots">
          {site.delivery.slots.map((s) => <span key={s.id} className="seg"><TimeRange>{slotLabel(s.start, s.end)}</TimeRange></span>)}
        </div>
      </div>
    );
  }

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
            <button key={d.date} type="button" className="seg" aria-pressed={selDay.date === d.date} disabled={!has} data-day={d.offset}
              onClick={() => {
                const first = site.delivery.slots.find((s) => slotAvailable(d.offset, s.start));
                if (first) setSlot({ date: d.date, slotId: slot?.date === d.date ? slot.slotId : first.id });
              }}>
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
            <button key={s.id} type="button" className="seg" aria-pressed={slot?.date === selDay.date && slot.slotId === s.id} disabled={!ok}
              aria-label={`${dayName(selDay)} ${slotLabel(s.start, s.end)}${ok ? '' : ` (${t.slotFull})`}`}
              onClick={() => setSlot({ date: selDay.date, slotId: s.id })}>
              <TimeRange>{slotLabel(s.start, s.end)}</TimeRange>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- hero */
/**
 * Red hero, no picture: headline, then the two things a customer needs first — when we can deliver
 * (the slot picker) and what we do best (the three specialties). Products follow directly below.
 */
export function Hero() {
  const { t, lang } = useStore();
  const words = t.heroTitle.split(' ');
  return (
    <section id="top" className="hero" aria-labelledby="hero-title" data-testid="hero">
      <div className="container hero-inner">
        <p className="hero-pill"><Icon name="checkCircle" size={18} weight="fill" />{t.heroEyebrow}</p>
        <h1 id="hero-title" className="reveal-words">
          {words.map((w, i) => (
            <Fragment key={i}><span className="mask"><span className="word" style={{ ['--i' as string]: i }}>{w}</span></span>{i < words.length - 1 ? ' ' : ''}</Fragment>
          ))}
        </h1>
        <p className="sub reveal-after" style={{ ['--d' as string]: `${words.length * 60 + 120}ms` }}>{t.heroSub}</p>
        <div className="hero-ctas">
          <a href="#products" className="hero-btn primary">{t.browseProducts}<Icon name={lang === 'ar' ? 'arrowLeft' : 'arrowRight'} size={18} /></a>
          <a href="#branch" className="hero-btn secondary">{t.branchInAlAin}</a>
        </div>
        <ol className="hero-steps">
          {t.heroSteps.map((s, i) => <li key={s}><span className="num">{i + 1}</span>{s}</li>)}
        </ol>
        <div className="picker" data-testid="delivery-card">
          <p className="p-title"><Icon name="clock" size={20} />{t.deliverWhen}</p>
          <SlotPicker />
        </div>
        <section aria-label={t.ourSpecialty}>
          <h2 className="hero-h2">{t.ourSpecialty}</h2>
          <TrustRow />
        </section>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- count-up (real numbers only) */
export function CountUp({ to, from = 0 }: { to: number; from?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [v, setV] = useState(to); // SSR and no-JS show the real number
  useEffect(() => {
    if (!inView || reduce) { setV(to); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 700);
      setV(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    setV(from);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, to, from]);
  return <span ref={ref} className="num">{v}</span>;
}

/** Wraps the first number in a text in a count-up ("0–4°C" counts the 4). */
function withCount(text: string) {
  const m = text.match(/^(.*?\D)(\d+)(°.*)$/);
  if (!m) return text;
  return <>{m[1]}<CountUp to={Number(m[2])} />{m[3]}</>;
}

/* ---------------------------------------------------------------- compact trust row (P7) */
export function TrustRow() {
  const { t } = useStore();
  const icons: IconName[] = ['seal', 'snow', 'knife'];
  return (
    <ul className="trust" data-testid="trust">
      {t.trust3.map(([title, sub], i) => (
        <li key={title}>
          <span className="t-ico"><Icon name={icons[i]} size={26} /></span>
          <span className="stack" style={{ gap: 0 }}>
            <b>{title}</b>
            <small>{withCount(sub)}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}
