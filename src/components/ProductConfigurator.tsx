'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { site } from '@/config/site';
import { allowedCuts, cuts, qtyRule, wasPrice, type CutId, type Product } from '@/data/catalog';
import { money, normaliseUaeMobile } from '@/lib/format';
import { round2, unitPrice } from '@/lib/pricing';
import { firstSlot, slotDays, type SlotDay } from '@/lib/uae-time';
import { Button, ButtonLink } from './Button';
import { flyToCart } from './Chrome';
import { slotLabel, TimeRange } from './HomeParts';
import { Icon } from './Icon';
import { AnimatedValue, EASE } from './Motion';
import { StockBadges, unitText } from './ProductCard';
import { Stepper } from './Stepper';
import { useStore } from './StoreProvider';

function DeliveryEstimate() {
  const { t, slot } = useStore();
  const [label, setLabel] = useState<{ day: string; range: string } | null>(null);
  useEffect(() => {
    const name = (d: SlotDay) => (d.offset === 0 ? t.today : d.offset === 1 ? t.tomorrow : t.weekdays[d.weekday]);
    const chosenDay = slot && slotDays(site.delivery.daysAhead).find((d) => d.date === slot.date);
    const chosen = slot && site.delivery.slots.find((s) => s.id === slot.slotId);
    if (chosenDay && chosen) return setLabel({ day: name(chosenDay), range: slotLabel(chosen.start, chosen.end) });
    const f = firstSlot();
    if (f) setLabel({ day: name(f.day), range: slotLabel(f.slot.start, f.slot.end) });
  }, [slot, t]);
  return (
    <p className="eta">
      <Icon name="truck" size={20} />
      <span>{t.deliveryEst}: <b>{label ? <>{label.day} <TimeRange>{label.range}</TimeRange></> : '…'}</b></span>
    </p>
  );
}

export function NotifyMe({ p }: { p: Product }) {
  const { t, lang } = useStore();
  const id = useId();
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <div className="panel-card" id="notify">
      <p className="label" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="bell" size={20} />{t.notifyMe}</p>
      {sent ? (
        <p role="status">{t.notifySent}</p>
      ) : (
        <form className="promo-row" noValidate onSubmit={async (e) => {
          e.preventDefault();
          const e164 = normaliseUaeMobile(phone);
          if (!e164) return setErr(t.phoneInvalid);
          setErr('');
          await fetch('/api/notify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId: p.id, phone: e164, lang }) }).catch(() => {});
          setSent(true);
        }}>
          <label htmlFor={id} className="sr-only">{t.notifyPhone}</label>
          <div className="phone-wrap" style={{ flex: 1 }}>
            <span className="prefix">+971</span>
            <input id={id} className="input" type="tel" inputMode="tel" autoComplete="tel-national" placeholder={t.phoneHint}
              value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!err} aria-describedby={err ? `${id}-err` : undefined} />
          </div>
          <Button type="submit">{t.send}</Button>
        </form>
      )}
      {err && <p className="error" id={`${id}-err`}>{err}</p>}
    </div>
  );
}

/** Add-to-cart button that turns into a check with a short bounce after adding; the photo flies to the cart. */
function AddButton({ onAdd, label, glow }: { onAdd: () => void; label: string; glow?: boolean }) {
  const { t } = useStore();
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);
  return (
    <Button size="lg" glow={glow} data-testid="add-to-cart" onClick={() => {
      onAdd(); setDone(true); setTimeout(() => setDone(false), 1200);
      flyToCart(document.querySelector<HTMLElement>('.pdp-photo'));
    }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={done ? 'done' : 'add'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          initial={{ opacity: 0, scale: reduce ? 1 : 0.8 }} animate={{ opacity: 1, scale: reduce ? 1 : [0.8, 1.08, 1] }}
          exit={{ opacity: 0, scale: reduce ? 1 : 0.8 }} transition={{ duration: 0.3, ease: EASE }}>
          <Icon name={done ? 'check' : 'cart'} size={20} weight={done ? 'bold' : 'regular'} />
          {done ? t.addedToCart : label}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}

export function ProductConfigurator({ p }: { p: Product }) {
  const { t, lang, add, showToast } = useStore();
  const router = useRouter();
  const reduce = useReducedMotion();
  const rule = qtyRule(p);
  const [sizeId, setSizeId] = useState(p.sizes[0].id);
  const [cutId, setCutId] = useState<CutId>(allowedCuts(p)[0]);
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState(rule.def);
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    const m = matchMedia('(max-width: 767px)');
    setIsPhone(m.matches);
  }, []);
  const out = p.stock === 'out';
  const size = p.sizes.find((s) => s.id === sizeId) ?? p.sizes[0];
  const each = unitPrice(p, sizeId, cutId);
  const total = round2(each * qty);
  const was = wasPrice(size);
  const wasTotal = was != null ? round2((was + (each - size.price)) * qty) : null;
  const fmtAmount = (v: number) => (p.byWeight ? t.kgN(v) : String(v));

  useEffect(() => {
    document.body.classList.add('has-actionbar');
    return () => document.body.classList.remove('has-actionbar');
  }, []);

  const addLine = () => add({ productId: p.id, sizeId, cutId, notes: notes.slice(0, 200) }, qty);
  const onAdd = () => { addLine(); showToast(t.addedToCart); };
  const onBuy = () => { addLine(); router.push(`/${lang}/checkout`); };

  return (
    <motion.div
      className="pdp-sheet"
      initial={isPhone && !reduce ? { y: 48 } : false}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <div className="stack" style={{ gap: 'var(--s2)' }}>
        <div className="options-row" style={{ gap: 6 }}><StockBadges p={p} /></div>
        <h1>{p.name[lang]}</h1>
        <p className="muted">{p.desc[lang]}</p>
      </div>

      <div>
        <p className="price-now num" data-testid="unit-price">
          {money(size.price, lang)}
          {was != null && <span className="was"><span className="sr-only">{t.wasLabel} </span><s>{money(was, lang)}</s></span>}
        </p>
        <p className="muted small">{unitText(p, t, lang)} · {t.vatIncl}</p>
      </div>

      {out ? (
        <NotifyMe p={p} />
      ) : (
        <>
          {p.sizes.length > 1 && (
            <fieldset className="opt-group">
              <legend>{p.sizeLabel?.[lang] ?? t.chooseSize}</legend>
              <div className="options-row" role="radiogroup" aria-label={p.sizeLabel?.[lang] ?? t.chooseSize}>
                {p.sizes.map((s) => (
                  <Button key={s.id} variant="option" role="radio" aria-checked={sizeId === s.id} selected={sizeId === s.id} data-size={s.id} onClick={() => setSizeId(s.id)}>
                    {s.name[lang]} <small className="num">{money(s.price, lang)}</small>
                  </Button>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset className="opt-group">
            <legend>{t.amount}</legend>
            <div className="amount">
              <Stepper value={qty} onChange={setQty} min={rule.min} max={rule.max} step={rule.step} precision={rule.precision} format={fmtAmount} label={p.name[lang]}
                editable={p.byWeight} unit={p.byWeight ? t.kgUnit : undefined} />
              {p.byWeight && <p className="hint">{t.typeAmount(rule.min, rule.max)}</p>}
            </div>
          </fieldset>

          {p.cuts.length > 0 && (
            <fieldset className="opt-group">
              <legend>{t.chooseCut}</legend>
              <div className="options-row" role="radiogroup" aria-label={t.chooseCut}>
                {p.cuts.map((c) => (
                  <Button key={c} variant="option" role="radio" aria-checked={cutId === c} selected={cutId === c} data-cut={c} onClick={() => setCutId(c)}>
                    {cuts[c].name[lang]}
                  </Button>
                ))}
              </div>
            </fieldset>
          )}

          {p.byWeight && (
            <div className="field">
              <label htmlFor={`notes-${p.id}`}>{t.notes} <span className="opt">({t.notesOptional})</span></label>
              <textarea id={`notes-${p.id}`} className="textarea" rows={2} maxLength={200} placeholder={t.notesPh} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          )}

          <div className="total-line">
            <span className="label">{t.lineTotal}</span>
            <span className="t-value num" data-testid="live-total">
              <AnimatedValue value={money(total, lang)} />
              {wasTotal != null && <span className="was"><span className="sr-only">{t.wasLabel} </span><s><AnimatedValue value={money(wasTotal, lang)} /></s></span>}
            </span>
          </div>

          <DeliveryEstimate />

          <div className="desktop-add" style={{ gap: 'var(--s2)' }}>
            <AddButton onAdd={onAdd} label={t.addToCart} glow />
            <Button variant="secondary" size="lg" onClick={onBuy}>{t.buyNow}</Button>
          </div>
        </>
      )}

      {/* Phone: sticky action bar replaces the tab bar on product pages. */}
      <div className="action-bar" data-testid="action-bar">
        {out ? (
          <ButtonLink href="#notify" size="lg" icon="bell">{t.notifyMe}</ButtonLink>
        ) : (
          <>
            <div className="ab-total">
              <b className="num"><AnimatedValue value={money(total, lang)} /></b>
              <span className="tiny muted">{t.vatIncl}</span>
            </div>
            <AddButton onAdd={onAdd} label={t.addToCart} />
          </>
        )}
      </div>
    </motion.div>
  );
}
