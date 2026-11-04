'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { site } from '@/config/site';
import { cuts, unitLabel, wasPrice, type CutId, type Product } from '@/data/catalog';
import { money, normaliseUaeMobile } from '@/lib/format';
import { unitPrice } from '@/lib/pricing';
import { firstSlot, slotDays, type SlotDay } from '@/lib/uae-time';
import { slotLabel } from './HomeParts';
import { Icon } from './Icon';
import { StockBadges } from './ProductCard';
import { Stepper } from './Stepper';
import { WasPrice } from './WasPrice';
import { useStore } from './StoreProvider';

function DeliveryEstimate() {
  const { t, slot } = useStore();
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const name = (d: SlotDay) => (d.offset === 0 ? t.today : d.offset === 1 ? t.tomorrow : t.weekdays[d.weekday]);
    const chosenDay = slot && slotDays(site.delivery.daysAhead).find((d) => d.date === slot.date);
    const chosen = slot && site.delivery.slots.find((s) => s.id === slot.slotId);
    if (chosenDay && chosen) return setLabel(`${name(chosenDay)} ${slotLabel(chosen.start, chosen.end)}`);
    const f = firstSlot();
    if (f) setLabel(`${name(f.day)} ${slotLabel(f.slot.start, f.slot.end)}`);
  }, [slot, t]);
  return (
    <p className="eta">
      <Icon name="truck" />
      <span>{t.deliveryEst}: <b className="num">{label ?? '…'}</b></span>
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
    <div className="notify" id="notify">
      <p className="label"><Icon name="bell" /> {t.notifyMe}</p>
      {sent ? (
        <p className="status-open" role="status">{t.notifySent}</p>
      ) : (
        <form
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            const e164 = normaliseUaeMobile(phone);
            if (!e164) return setErr(t.phoneInvalid);
            setErr('');
            await fetch('/api/notify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId: p.id, phone: e164, lang }) }).catch(() => {});
            setSent(true);
          }}
        >
          <label htmlFor={id} className="sr-only">{t.notifyPhone}</label>
          <div className="phone-wrap">
            <span className="prefix">+971</span>
            <input id={id} className="input" type="tel" inputMode="tel" autoComplete="tel-national" placeholder={t.phoneHint}
              value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!err} aria-describedby={err ? `${id}-err` : undefined} />
          </div>
          <button className="btn btn-primary" type="submit">{t.send}</button>
        </form>
      )}
      {err && <p className="error" id={`${id}-err`}>{err}</p>}
    </div>
  );
}

export function ProductConfigurator({ p }: { p: Product }) {
  const { t, lang, add, showToast } = useStore();
  const router = useRouter();
  const [sizeId, setSizeId] = useState(p.sizes[0].id);
  const [cutId, setCutId] = useState<CutId>(p.cuts[0]);
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState(1);
  const out = p.stock === 'out';
  const each = unitPrice(p, sizeId, cutId);
  const total = each * qty;
  // Crossed-out normal price for the chosen size, plus any cutting extra.
  const selected = p.sizes.find((s) => s.id === sizeId) ?? p.sizes[0];
  const wasEach = wasPrice(selected) != null ? wasPrice(selected)! + (each - selected.price) : null;

  useEffect(() => {
    document.body.classList.add('has-buybar');
    return () => document.body.classList.remove('has-buybar');
  }, []);

  const addLine = () => add({ productId: p.id, sizeId, cutId, notes: notes.slice(0, 200) }, qty);
  const onAdd = () => { addLine(); showToast(t.addedToCart); };
  const onBuy = () => { addLine(); router.push(`/${lang}/checkout`); };

  const sizeName = `size-${p.id}`;
  const cutName = `cut-${p.id}`;

  return (
    <div className="info">
      <div className="title-row">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><StockBadges p={p} /></div>
        <h1>{p.name[lang]}</h1>
        <p className="muted">{p.desc[lang]}</p>
        <p className="muted" style={{ fontSize: 14 }}>{t.origin}: {p.origin[lang]}</p>
      </div>

      <div>
        <p className="price-now num" aria-live="polite">
          {money(total, lang)}
          <WasPrice amount={wasEach != null ? wasEach * qty : null} />
        </p>
        <p className="muted" style={{ fontSize: 13.5 }}>
          {t.vatIncl}
          {qty > 1 && <> · <span className="num">{money(each, lang)}</span> × <span className="num">{qty}</span></>}
        </p>
      </div>

      {out ? (
        <NotifyMe p={p} />
      ) : (
        <>
          <fieldset>
            <legend>{t.chooseSize}</legend>
            <div className="options">
              {p.sizes.map((s) => (
                <label key={s.id} className="option">
                  <input type="radio" name={sizeName} value={s.id} checked={sizeId === s.id} onChange={() => setSizeId(s.id)} />
                  <span className="o-main"><span className="o-title">{s.name[lang]}</span></span>
                  <span className="o-price num">{money(s.price, lang)} <WasPrice amount={wasPrice(s)} /></span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>{t.chooseCut}</legend>
            <div className="options row">
              {p.cuts.map((c) => (
                <label key={c} className="option">
                  <input type="radio" name={cutName} value={c} checked={cutId === c} onChange={() => setCutId(c)} />
                  <span className="o-main">
                    <span className="o-title">{cuts[c].name[lang]}</span>
                    {cuts[c].extra > 0 && <span className="o-sub num">+{money(cuts[c].extra, lang)}</span>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <label htmlFor={`notes-${p.id}`}>{t.notes} <span className="opt">({t.notesOptional})</span></label>
            <textarea id={`notes-${p.id}`} className="textarea" rows={2} maxLength={200} placeholder={t.notesPh} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <DeliveryEstimate />

          <div className="buy-row">
            <Stepper qty={qty} onChange={setQty} min={1} light label={p.name[lang]} />
            <button type="button" className="btn btn-outline btn-lg" onClick={onAdd}><Icon name="cart" />{t.addToCart}</button>
            <button type="button" className="btn btn-primary btn-lg" onClick={onBuy}>{t.buyNow}</button>
          </div>
          <p className="muted" style={{ fontSize: 13.5 }}>{t.per} {unitLabel[p.unit][lang]} · {t.vatIncl}</p>
        </>
      )}

      {/* Mobile sticky buy bar */}
      <div className="buybar">
        {out ? (
          <a href="#notify" className="btn btn-primary btn-lg"><Icon name="bell" />{t.notifyMe}</a>
        ) : (
          <>
            <div className="bb-total">
              <b className="num">{money(total, lang)}</b>
              <span>{t.vatIncl}</span>
            </div>
            <button type="button" className="btn btn-outline btn-lg" onClick={onAdd} aria-label={t.addToCart}><Icon name="cart" /><span className="sr-only">{t.addToCart}</span></button>
            <button type="button" className="btn btn-primary btn-lg" onClick={onBuy}>{t.buyNow}</button>
          </>
        )}
      </div>
    </div>
  );
}
