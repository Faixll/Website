'use client';

import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { site } from '@/config/site';
import { slotAvailable, slotDays, type SlotDay } from '@/lib/uae-time';
import { ButtonLink } from './Button';
import { useMedia } from './hooks';
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

  // Reserve the final height before the client fills it in (no layout shift).
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

/* ---------------------------------------------------------------- live hero video */
type HeroSet = { mp4: string; webm: string; poster: string };
const SETS: Record<'portrait' | 'landscape', HeroSet> = {
  portrait: { mp4: '/hero/hero-portrait-720.mp4', webm: '/hero/hero-portrait-720.webm', poster: '/hero/poster-portrait.jpg' },
  landscape: { mp4: '/hero/hero-landscape-720.mp4', webm: '/hero/hero-landscape-720.webm', poster: '/hero/poster-landscape.jpg' },
};

/**
 * Background video: poster shows instantly (<picture> picks portrait/landscape without JS); the matching video set
 * is chosen with matchMedia (the `media` attribute doesn't work on <source> in video), fades in when it can play,
 * and pauses off-screen. Never autoplays under reduced motion or data saver — the poster gets a slow zoom instead.
 * `hasVideo` is false until the six files exist in public/hero: then an animated gradient placeholder shows.
 */
function HeroMedia({ hasVideo, scale }: { hasVideo: boolean; scale: ReturnType<typeof useTransform<number, number>> }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [set, setSet] = useState<HeroSet | null>(null);
  const [ready, setReady] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (!hasVideo) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (reduce || saveData) { setStill(true); return; }
    setSet(matchMedia('(min-width: 768px)').matches ? SETS.landscape : SETS.portrait);
  }, [hasVideo]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.1 });
    io.observe(v);
    return () => io.disconnect();
  }, [set]);

  return (
    <motion.div className="hero-media" style={{ scale }} aria-hidden data-testid="hero-media">
      {hasVideo ? (
        <>
          <picture>
            <source media="(min-width: 768px)" srcSet={SETS.landscape.poster} />
            <img className={`poster${still ? ' kenburns' : ''}`} src={SETS.portrait.poster} alt="" fetchPriority="high" />
          </picture>
          {set && (
            <video ref={ref} className={ready ? 'ready' : undefined} autoPlay muted loop playsInline preload="metadata" poster={set.poster}
              onCanPlay={() => setReady(true)} data-testid="hero-video">
              <source src={set.webm} type="video/webm" />
              <source src={set.mp4} type="video/mp4" />
            </video>
          )}
        </>
      ) : (
        <div className="hero-placeholder" data-testid="hero-placeholder">
          <img className="ph-mark" src={site.brand.mark} alt="" />
        </div>
      )}
    </motion.div>
  );
}

export function Hero({ hasVideo }: { hasVideo: boolean }) {
  const { t, lang } = useStore();
  const reduce = useReducedMotion();
  const phone = useMedia('(max-width: 767px)');
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  // As the first screen scrolls away: the video scales 1 → 1.08 (1.04 on phones) and the overlay darkens.
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : phone ? 1.04 : 1.08]);
  const darken = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 0.35]);
  const words = t.heroTitle.split(' ');
  const pillIcons: IconName[] = ['seal', 'snow', 'knife'];

  return (
    <>
      <section ref={ref} className="hero" aria-labelledby="hero-title" data-testid="hero">
        <HeroMedia hasVideo={hasVideo} scale={scale} />
        <div className="hero-overlay" aria-hidden />
        <motion.div className="hero-overlay" style={{ opacity: darken, background: 'var(--red-deep)' }} aria-hidden />
        <div className="container">
          <div className="hero-inner">
            <h1 id="hero-title" className="reveal-words">
              {words.map((w, i) => (
                <Fragment key={i}><span className="mask"><span className="word" style={{ ['--i' as string]: i }}>{w}</span></span>{i < words.length - 1 ? ' ' : ''}</Fragment>
              ))}
            </h1>
            <p className="sub reveal-after" style={{ ['--d' as string]: `${words.length * 60 + 120}ms` }}>{t.heroSub}</p>
            <div className="reveal-after" style={{ ['--d' as string]: `${words.length * 60 + 200}ms` }}>
              <ButtonLink href={`/${lang}/search`} size="xl" glow icon="cart" data-testid="order-now">{t.orderNow}</ButtonLink>
            </div>
            <div className="hero-pills reveal-after" style={{ ['--d' as string]: `${words.length * 60 + 280}ms` }}>
              {t.claims.map((c, i) => <span key={c} className="hero-pill"><Icon name={pillIcons[i]} size={16} />{c}</span>)}
            </div>
          </div>
        </div>
      </section>
      <div className="container picker-wrap">
        <div className="picker" data-testid="delivery-card">
          <p className="p-title"><Icon name="clock" size={20} />{t.deliverWhen}</p>
          <SlotPicker />
        </div>
      </div>
    </>
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
