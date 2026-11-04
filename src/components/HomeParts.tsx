'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { site } from '@/config/site';
import { categories, type CategoryId } from '@/data/catalog';
import { slotAvailable, slotDays, type SlotDay } from '@/lib/uae-time';
import { categoryIcon, Icon } from './Icon';
import { useStore } from './StoreProvider';

export const slotLabel = (start: number, end: number) => `${String(start).padStart(2, '0')}:00–${String(end).padStart(2, '0')}:00`;

/** A time range that always reads left-to-right ("09:00–12:00"), also inside Arabic text. */
export function TimeRange({ children }: { children: React.ReactNode }) {
  return <bdi dir="ltr" className="num">{children}</bdi>;
}

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
              data-day={d.offset}
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
              className="seg"
              aria-pressed={slot?.date === selDay.date && slot.slotId === s.id}
              disabled={!ok}
              aria-label={`${dayName(selDay)} ${slotLabel(s.start, s.end)}${ok ? '' : ` (${t.slotFull})`}`}
              onClick={() => setSlot({ date: selDay.date, slotId: s.id })}
            >
              <TimeRange>{slotLabel(s.start, s.end)}</TimeRange>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Home hero: red radial gradient, white headline, photo slot (parallax on tablet/desktop), claim pills, and the delivery picker overlapping its bottom edge. */
export function Hero() {
  const { t } = useStore();
  const reduce = useReducedMotion();
  const photoRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const m = matchMedia('(min-width: 768px)');
    const on = () => setWide(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  const { scrollYProgress } = useScroll({ target: photoRef, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [24, -24]);
  const parallax = wide && !reduce;

  return (
    <>
      <section className="hero" aria-labelledby="hero-title" data-testid="hero">
        <div className="container hero-inner">
          <div>
            <span className="eyebrow"><Icon name="seal" size={18} />{t.heroEyebrow}</span>
            <h1 id="hero-title">{t.heroTitle}</h1>
            <p className="sub">{t.heroSub}</p>
          </div>
          <div className="hero-photo" ref={photoRef}>
            <motion.div className="photo" style={parallax ? { y } : undefined} data-testid="hero-photo">
              {/* Neutral placeholder until a real hero photo is added (use next/image with `priority` here). */}
              <div className="ph lg" aria-hidden />
            </motion.div>
            <div className="hero-pills" aria-hidden>
              {t.claims.map((c) => <span key={c} className="hero-pill">{c}</span>)}
            </div>
          </div>
        </div>
      </section>
      <div className="container picker-wrap">
        <div className="picker">
          <p className="p-title"><Icon name="clock" size={20} />{t.deliverWhen}</p>
          <SlotPicker />
        </div>
      </div>
    </>
  );
}

/**
 * Category chips (round icon bubble + label). `mode="scroll"` (home): sticky, highlights the section in view
 * and smooth-scrolls to it on tap. `mode="link"`: links to the category page.
 */
export function CategoryChips({ mode, active, sticky }: { mode: 'scroll' | 'link'; active?: CategoryId | ''; sticky?: boolean }) {
  const { t, lang } = useStore();
  const [current, setCurrent] = useState<CategoryId | ''>(active ?? '');
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (mode === 'link') setCurrent(active ?? ''); }, [mode, active]);

  // Scroll-spy: highlight the chip of the section currently under the sticky bars.
  useEffect(() => {
    if (mode !== 'scroll') return;
    const sections = categories.map((c) => document.getElementById(`cat-${c.id}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id.replace('cat-', '') as CategoryId);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [mode]);

  // Keep the highlighted chip in view inside the horizontal strip.
  useEffect(() => {
    stripRef.current?.querySelector<HTMLElement>(`[data-cat="${current}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [current]);

  const chips = categories.map((c) => {
    const isActive = current === c.id;
    const content = (
      <>
        <span className="bubble"><Icon name={categoryIcon[c.id]} weight={isActive ? 'fill' : 'regular'} size={26} /></span>
        <span className="label caps">{c.name[lang]}</span>
      </>
    );
    return mode === 'scroll' ? (
      <a key={c.id} href={`#cat-${c.id}`} className="chip" data-cat={c.id} aria-current={isActive ? 'true' : undefined}
        onClick={() => setCurrent(c.id)}>{content}</a>
    ) : (
      <Link key={c.id} href={`/${lang}/search?cat=${c.id}`} className="chip" data-cat={c.id} aria-current={isActive ? 'page' : undefined}>{content}</Link>
    );
  });

  return (
    <nav className={sticky ? 'chip-bar' : undefined} aria-label={t.categories} data-testid="category-chips">
      <div className={sticky ? 'container' : undefined}>
        <div className="hscroll chips" ref={stripRef}>{chips}</div>
      </div>
    </nav>
  );
}
