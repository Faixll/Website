'use client';

import { Elements, ExpressCheckoutElement, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe as StripeJs, type StripeExpressCheckoutElementConfirmEvent } from '@stripe/stripe-js';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { site } from '@/config/site';
import { productById } from '@/data/catalog';
import { lineLabel } from '@/lib/lines';
import { ProductImage } from './ProductImage';
import { branches, emirates } from '@/data/places';
import { money } from '@/lib/format';
import { fulfilmentOf, priceOrder, validateOrder, type FieldErrors, type OrderInput, type PaymentMethod, type PricedOrder } from '@/lib/order';
import { maxBlocks, NO_REDEMPTION, pointsEarned, type Redemption } from '@/lib/points';
import { linePrice, totals as calcTotals } from '@/lib/pricing';
import { useAccount } from './AccountProvider';
import { BranchStatusLine } from './BranchCard';
import { SlotPicker } from './HomeParts';
import { Button, ButtonLink } from './Button';
import { Icon } from './Icon';
import { useStore } from './StoreProvider';

/** Online payments are off until Stripe is connected and NEXT_PUBLIC_ONLINE_PAYMENTS_ENABLED=true (see src/config/site.ts). */
const PK = site.onlinePayments ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY : undefined;
let stripePromise: Promise<StripeJs | null> | null = null;
const getStripe = () => (stripePromise ??= PK ? loadStripe(PK) : Promise.resolve(null));

function useWide(query = '(min-width: 960px)') {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const m = matchMedia(query);
    const on = () => setWide(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return wide;
}

type Form = Omit<OrderInput, 'lang' | 'slot' | 'lines'>;
type Discounts = { redeem: Redemption; promo: string };
type Priced = Extract<PricedOrder, { ok: true }>;

export function Checkout() {
  const { t, lang, lines, ready, fulfilment, slot } = useStore();
  const [form, setForm] = useState<Form>({
    name: '', phone: '', fulfilment: 'delivery', area: '', street: '', building: '', apartment: '', payment: PK ? 'wallet' : 'cod',
    emirate: emirates.length === 1 ? emirates[0].id : '',
    branchId: branches.length === 1 ? branches[0].id : '',
  });

  // Prefill from "pick up here" on a branch card, and remember contact details on this device.
  useEffect(() => {
    if (!ready) return;
    let saved: Partial<Form> = {};
    try { saved = JSON.parse(localStorage.getItem('hab-contact') ?? '{}'); } catch { /* ignore */ }
    setForm((f) => {
      const next: Form = {
        ...f,
        ...saved,
        ...(fulfilment?.type === 'pickup' ? { fulfilment: 'pickup', branchId: fulfilment.branchId } : {}),
      };
      // Drop saved values that no longer exist (e.g. an old emirate or branch), and preselect when there is only one choice.
      const em = emirates.find((e) => e.id === next.emirate);
      if (!em) next.emirate = emirates.length === 1 ? emirates[0].id : '';
      if (!emirates.find((e) => e.id === next.emirate)?.areas.some((a) => a.en === next.area)) next.area = '';
      if (!branches.some((b) => b.id === next.branchId)) next.branchId = branches.length === 1 ? branches[0].id : '';
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Signed-in customers: prefill name and phone from their account (only empty fields).
  const { me } = useAccount();
  useEffect(() => {
    if (!me) return;
    setForm((f) => ({
      ...f,
      name: f.name || me.firstName || '',
      phone: f.phone || me.phone.replace(/^\+971/, '0'),
    }));
  }, [me]);

  // Discounts: a promo code and/or points. Re-priced on every change; dropped if they stop being valid.
  const [disc, setDisc] = useState<Discounts>({ redeem: NO_REDEMPTION, promo: '' });
  const [discError, setDiscError] = useState('');
  const f = fulfilmentOf(form);
  const balance = me?.points ?? 0;
  const priced = useMemo(() => priceOrder(lines, f, { redeem: disc.redeem, promoCode: disc.promo, balance }), [lines, f?.type, f && 'emirate' in f ? f.emirate : '', disc, balance]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (priced.ok) return;
    setDiscError(t.pointsErrors[priced.error] ?? t.orderError);
    setDisc({ redeem: NO_REDEMPTION, promo: '' });
  }, [priced, t]);
  const ok = priced.ok ? priced : (priceOrder(lines, f, { redeem: NO_REDEMPTION, promoCode: '', balance: 0 }) as Extract<PricedOrder, { ok: true }>);
  const fullTotals = ok.totals;

  if (!ready) return <div style={{ minHeight: '60vh' }} aria-busy="true" />;
  if (!fullTotals.lines.length) {
    return (
      <div className="empty">
        <Icon name="cart" />
        <p>{t.emptyCheckout}</p>
        <ButtonLink href={`/${lang}`}>{t.shopNow}</ButtonLink>
      </div>
    );
  }

  const amountFils = Math.max(200, Math.round(fullTotals.total * 100));
  const inner = (
    <CheckoutForm form={form} setForm={setForm} totals={fullTotals} priced={ok}
      disc={disc} setDisc={(d) => { setDiscError(''); setDisc(d); }} discError={discError} setDiscError={setDiscError} />
  );
  if (!PK) return inner;
  return (
    <Elements
      stripe={getStripe()}
      options={{
        mode: 'payment',
        amount: amountFils,
        currency: 'aed',
        locale: lang,
        appearance: {
          theme: 'stripe',
          variables: { colorPrimary: '#8C1D2C', colorText: '#1A1816', borderRadius: '8px', fontFamily: 'IBM Plex Sans Arabic, system-ui, sans-serif' },
        },
      }}
    >
      {inner}
    </Elements>
  );
}

function CheckoutForm({ form, setForm, totals, priced, disc, setDisc, discError, setDiscError }: {
  form: Form; setForm: React.Dispatch<React.SetStateAction<Form>>; totals: ReturnType<typeof calcTotals>; priced: Priced;
  disc: Discounts; setDisc: (d: Discounts) => void; discError: string; setDiscError: (s: string) => void;
}) {
  const { t, lang, slot, clear, saveLastOrder, setFulfilment } = useStore();
  const { me, enabled: rewardsOn, openSignIn, refresh: refreshAccount } = useAccount();
  const earn = pointsEarned(totals.subtotal, totals.discount);
  const router = useRouter();
  const stripe = useStripeSafe();
  const elements = useElementsSafe();
  const wide = useWide();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [walletOk, setWalletOk] = useState<boolean | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const input = (): OrderInput => ({ ...form, lang, slot, lines: totals.lines });

  useEffect(() => {
    // Live re-validation after the first submit attempt.
    if (!submitted) return;
    const e = validateOrder(input());
    setErrors(e);
    if (!Object.keys(e).length) setServerError(''); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, slot, totals, submitted]);

  const emirate = emirates.find((e) => e.id === form.emirate);
  const isPickup = form.fulfilment === 'pickup';
  const errText = (code?: string) => (code === 'phone' ? t.phoneInvalid : code ? t.required : '');

  const validate = () => {
    setSubmitted(true);
    const e = validateOrder(input());
    setErrors(e);
    if (Object.keys(e).length) {
      setServerError(t.fixErrors);
      const first = document.querySelector<HTMLElement>(`[data-field="${Object.keys(e)[0]}"]`);
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      first?.querySelector<HTMLElement>('input, select, button')?.focus({ preventScroll: true });
      return false;
    }
    setServerError('');
    return true;
  };

  const createOrder = async () => {
    try { localStorage.setItem('hab-contact', JSON.stringify({ name: form.name, phone: form.phone, emirate: form.emirate, area: form.area, street: form.street, building: form.building, apartment: form.apartment })); } catch { /* ignore */ }
    const res = await fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...input(), redeem: disc.redeem, promoCode: disc.promo }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data.fields) setErrors(data.fields);
      if (t.pointsErrors[data.error]) { setDisc({ redeem: NO_REDEMPTION, promo: '' }); refreshAccount(); }
      throw new Error(t.pointsErrors[data.error] ?? t.orderError);
    }
    // The cart is cleared on the confirmation page once the order is confirmed.
    try { sessionStorage.setItem('hab-pending', JSON.stringify({ orderId: data.orderId, lines: totals.lines })); } catch { /* ignore */ }
    return data as { orderId: string; clientSecret?: string; total: number; pointsEarnable?: number };
  };

  const finish = (orderId: string, paid: boolean, pts = 0) => {
    saveLastOrder(totals.lines);
    clear();
    setFulfilment(fulfilmentOf(form));
    refreshAccount();
    const q = new URLSearchParams();
    if (paid) q.set('paid', '1');
    if (pts > 0) q.set('pts', String(pts));
    router.push(`/${lang}/order/${orderId}${q.size ? `?${q}` : ''}`);
  };

  const payWithStripe = async () => {
    if (!stripe || !elements) throw new Error(t.orderError);
    const { error: submitError } = await elements.submit();
    if (submitError) throw new Error(submitError.message ?? t.orderError);
    const { orderId, clientSecret, pointsEarnable } = await createOrder();
    const { error } = await stripe.confirmPayment({
      elements,
      clientSecret: clientSecret!,
      redirect: 'if_required',
      confirmParams: { return_url: `${location.origin}/${lang}/order/${orderId}` },
    });
    if (error) throw new Error(error.message ?? t.orderError);
    finish(orderId, true, pointsEarnable);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !validate()) return;
    setBusy(true);
    try {
      if (form.payment === 'cod' || totals.total === 0) {
        const o = await createOrder();
        finish(o.orderId, totals.total === 0, o.pointsEarnable);
      }
      else await payWithStripe();
    } catch (err) {
      setServerError((err as Error).message || t.orderError);
    } finally {
      setBusy(false);
    }
  };

  const onExpressConfirm = async (ev: StripeExpressCheckoutElementConfirmEvent) => {
    setBusy(true);
    try {
      await payWithStripe();
    } catch (err) {
      ev.paymentFailed({ reason: 'fail' });
      setServerError((err as Error).message || t.orderError);
    } finally {
      setBusy(false);
    }
  };

  const total = money(totals.total, lang);
  const payLabel = totals.total === 0 ? t.checkout : form.payment === 'card' ? t.payCard(total) : isPickup ? t.placePickup(total) : t.placeCod(total);

  const payButton = (
    <div className="pay-btn-wrap">
      {serverError && <p className="alert error-box" role="alert">{serverError}</p>}
      {form.payment === 'wallet' && PK && totals.total > 0 ? (
        <>
          <ExpressCheckoutElement
            options={{
              paymentMethods: { applePay: 'always', googlePay: 'always', link: 'never', amazonPay: 'never', paypal: 'never', klarna: 'never' },
              buttonHeight: 52,
              buttonType: { applePay: 'buy', googlePay: 'buy' },
              layout: { maxColumns: 1, maxRows: 2, overflow: 'never' },
            }}
            onReady={({ availablePaymentMethods }) => setWalletOk(!!availablePaymentMethods)}
            onClick={(ev) => { if (validate()) ev.resolve(); }}
            onConfirm={onExpressConfirm}
          />
          {walletOk === false && <p className="alert">{t.walletUnavailable}</p>}
        </>
      ) : (
        <Button type="submit" form="checkout-form" size="lg" block glow loading={busy}>
          {payLabel}
        </Button>
      )}
      <p className="secure"><Icon name="lock" />{t.secure}</p>
    </div>
  );

  return (
    <div className="checkout">
      <form id="checkout-form" className="stack" style={{ gap: 16 }} onSubmit={onSubmit} noValidate>
        {/* 1. Contact */}
        <section className="panel-card" aria-labelledby="h-contact">
          <h2 id="h-contact"><span className="step-n num">1</span>{t.contact}</h2>
          <p className="hint">{t.noAccount}</p>
          <div className="grid-2">
            <div className="field" data-field="name">
              <label htmlFor="co-name">{t.name}</label>
              <input id="co-name" className="input" autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)}
                aria-invalid={!!errors.name} aria-describedby={errors.name ? 'co-name-e' : undefined} />
              {errors.name && <p className="error" id="co-name-e">{errText(errors.name)}</p>}
            </div>
            <div className="field" data-field="phone">
              <label htmlFor="co-phone">{t.phone}</label>
              <div className="phone-wrap">
                <span className="prefix" aria-hidden>+971</span>
                <input id="co-phone" className="input" type="tel" inputMode="tel" autoComplete="tel-national" placeholder={t.phoneHint}
                  value={form.phone} onChange={(e) => set('phone', e.target.value)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'co-phone-e' : undefined} />
              </div>
              {errors.phone && <p className="error" id="co-phone-e">{errText(errors.phone)}</p>}
            </div>
          </div>
        </section>

        {/* 2. Delivery or pickup */}
        <section className="panel-card" aria-labelledby="h-get">
          <h2 id="h-get"><span className="step-n num">2</span>{t.howGet}</h2>
          <div className="options" style={{ gridTemplateColumns: '1fr 1fr' }} role="radiogroup" aria-label={t.howGet}>
            {(['delivery', 'pickup'] as const).map((k) => (
              <label key={k} className="option">
                <input type="radio" name="fulfilment" checked={form.fulfilment === k} onChange={() => setForm((f) => ({ ...f, fulfilment: k, payment: f.payment === 'cod' || PK ? f.payment : 'cod' }))} />
                <Icon name={k === 'delivery' ? 'truck' : 'store'} />
                <span className="o-main"><span className="o-title">{k === 'delivery' ? t.delivery : t.pickup}</span></span>
              </label>
            ))}
          </div>

          {!isPickup ? (
            <div className="stack">
              <div className="grid-2">
                <div className="field" data-field="emirate">
                  <label htmlFor="co-emirate">{t.emirate}</label>
                  <select id="co-emirate" className="select" autoComplete="address-level1" value={form.emirate}
                    onChange={(e) => setForm((f) => ({ ...f, emirate: e.target.value, area: '' }))} aria-invalid={!!errors.emirate}>
                    <option value="">{t.choose}</option>
                    {emirates.map((em) => (
                      <option key={em.id} value={em.id}>
                        {em.name[lang]} · {site.delivery.emirates[em.id] ? money(site.delivery.emirates[em.id].fee, lang) : ''}
                      </option>
                    ))}
                  </select>
                  {errors.emirate && <p className="error">{t.required}</p>}
                </div>
                <div className="field" data-field="area">
                  <label htmlFor="co-area">{t.area}</label>
                  <select id="co-area" className="select" autoComplete="address-level2" value={form.area} disabled={!emirate}
                    onChange={(e) => set('area', e.target.value)} aria-invalid={!!errors.area}>
                    <option value="">{t.choose}</option>
                    {emirate?.areas.map((a) => <option key={a.en} value={a.en}>{a[lang]}</option>)}
                  </select>
                  {errors.area && <p className="error">{t.required}</p>}
                </div>
              </div>
              <div className="field" data-field="street">
                <label htmlFor="co-street">{t.street}</label>
                <input id="co-street" className="input" autoComplete="address-line1" value={form.street} onChange={(e) => set('street', e.target.value)} aria-invalid={!!errors.street} />
                {errors.street && <p className="error">{t.required}</p>}
              </div>
              <div className="grid-2">
                <div className="field" data-field="building">
                  <label htmlFor="co-building">{t.building}</label>
                  <input id="co-building" className="input" autoComplete="address-line2" value={form.building} onChange={(e) => set('building', e.target.value)} aria-invalid={!!errors.building} />
                  {errors.building && <p className="error">{t.required}</p>}
                </div>
                <div className="field">
                  <label htmlFor="co-apt">{t.apartment} <span className="opt">({t.apartmentOpt})</span></label>
                  <input id="co-apt" className="input" value={form.apartment} onChange={(e) => set('apartment', e.target.value)} />
                </div>
              </div>
              {totals.minOrder > 0 && <p className={totals.subtotal < totals.minOrder ? 'alert' : 'hint'} data-field="minOrder">{t.minOrderNote(money(totals.minOrder, lang))}</p>}
            </div>
          ) : (
            <fieldset className="options" data-field="branchId" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="label" style={{ marginBottom: 8 }}>{t.chooseBranch}</legend>
              {branches.map((b) => (
                <label key={b.id} className="option" style={{ alignItems: 'flex-start' }}>
                  <input type="radio" name="branch" checked={form.branchId === b.id} onChange={() => set('branchId', b.id)} />
                  <span className="o-main" style={{ gap: 2 }}>
                    <span className="o-title">{b.name[lang]}</span>
                    <span className="o-sub">{b.address[lang]}</span>
                    <BranchStatusLine b={b} />
                  </span>
                </label>
              ))}
              {errors.branchId && <p className="error">{t.required}</p>}
            </fieldset>
          )}
        </section>

        {/* 3. Time */}
        <section className="panel-card" aria-labelledby="h-when" data-field="slot">
          <h2 id="h-when"><span className="step-n num">3</span>{isPickup ? t.whenPickup : t.when}</h2>
          <SlotPicker idPrefix="co" />
          {errors.slot && <p className="error">{t.required}</p>}
        </section>

        {/* 4. Discounts */}
        <DiscountsPanel totals={totals} priced={priced} disc={disc} setDisc={setDisc} discError={discError} setDiscError={setDiscError} form={form} />

        {/* 5. Payment */}
        <section className="panel-card" aria-labelledby="h-pay">
          <h2 id="h-pay"><span className="step-n num">5</span>{t.payment}</h2>
          <div className="options" role="radiogroup" aria-label={t.payment}>
            {((PK ? ['wallet', 'card', 'cod'] : ['cod']) as PaymentMethod[]).map((m) => (
              <label key={m} className="option">
                <input type="radio" name="payment" value={m} checked={form.payment === m} onChange={() => set('payment', m)} />
                <span className="o-main">
                  <span className="o-title">{m === 'wallet' ? t.wallet : m === 'card' ? t.card : isPickup ? t.codPickup : t.codDelivery}</span>
                  {m === 'card' && <span className="o-sub">Visa · Mastercard</span>}
                </span>
              </label>
            ))}
          </div>
          {PK && form.payment === 'card' && (
            <PaymentElement options={{ layout: 'tabs', wallets: { applePay: 'never', googlePay: 'never' }, fields: { billingDetails: { name: 'auto' } } }} />
          )}
        </section>

        {!wide && <div className="checkout-submit">{payButton}</div>}
      </form>

      <aside className="summary" aria-labelledby="h-summary">
        <div className="panel-card">
          <details open={wide || undefined}>
            <summary>
              <h2 id="h-summary">{t.summary}</h2>
              {!wide && <b className="num">{total}</b>}
            </summary>
            <div className="s-lines" style={{ marginTop: 12 }}>
              {totals.lines.map((l) => {
                const p = productById(l.productId)!;
                return (
                  <div className="s-line" key={l.key}>
                    <span className="thumb"><ProductImage p={p} lang={lang} sizes="48px" /></span>
                    <div>
                      <span>{p.name[lang]}{!p.byWeight && <span className="num"> × {l.qty}</span>}</span>
                      <small>{lineLabel(l, lang, t, { withName: false })}{l.notes ? ` · ${l.notes}` : ''}</small>
                    </div>
                    <span className="num">{money(linePrice(l), lang)}</span>
                  </div>
                );
              })}
            </div>
          </details>
          <div className="totals">
            <div><span>{t.subtotal}</span><span className="num">{money(totals.subtotal, lang)}</span></div>
            <div>
              <span>{t.deliveryFee}</span>
              {isPickup || (form.emirate && totals.deliveryFee === 0) ? <span className="free">{t.free}</span> : form.emirate ? <span className="num">{money(totals.deliveryFee, lang)}</span> : <span className="muted">—</span>}
            </div>
            {priced.promoDiscount > 0 && (
              <div className="disc"><span>{t.promoLine(priced.promoCode!)}</span><span className="num">−{money(priced.promoDiscount, lang)}</span></div>
            )}
            {priced.pointsDiscount > 0 && (
              <div className="disc"><span>{t.pointsDiscount}</span><span className="num">−{money(priced.pointsDiscount, lang)}</span></div>
            )}
            <div className="grand"><span>{t.grandTotal}</span><span className="num">{total}</span></div>
            <span className="vat num">{t.vatIncluded(money(totals.vat, lang))}</span>
            {earn > 0 && rewardsOn && (me ? (
              <span className="earn" data-testid="earn-line"><Icon name="gift" />{t.youWillEarn(earn)}</span>
            ) : (
              <button type="button" className="earn earn-link" onClick={() => openSignIn()} data-testid="earn-signin"><Icon name="gift" />{t.signInToEarn(earn)}</button>
            ))}
          </div>
          {wide && payButton}
        </div>
      </aside>
    </div>
  );
}

function DiscountsPanel({ totals, priced, disc, setDisc, discError, setDiscError, form }: {
  totals: ReturnType<typeof calcTotals>; priced: Priced; disc: Discounts; setDisc: (d: Discounts) => void;
  discError: string; setDiscError: (s: string) => void; form: Form;
}) {
  const { t, lang, lines } = useStore();
  const { me } = useAccount();
  const [code, setCode] = useState(disc.promo);
  const balance = me?.points ?? 0;
  const off = site.points.moneyOff;
  const hasPromo = !!priced.promoCode;
  const blocks = maxBlocks(balance, totals.subtotal, false);
  const using = disc.redeem.blocks > 0;

  const apply = () => {
    if (!code.trim()) return;
    // Check locally first for instant feedback; the server checks again.
    const r = priceOrder(lines, fulfilmentOf(form), { redeem: { ...disc.redeem, blocks: 0 }, promoCode: code, balance });
    if (!r.ok) return setDiscError(t.pointsErrors[r.error] ?? t.orderError);
    setDisc({ redeem: { ...disc.redeem, blocks: 0 }, promo: code.trim() });
  };

  return (
    <section className="panel-card" aria-labelledby="h-disc">
      <h2 id="h-disc"><span className="step-n num">4</span>{t.discounts}</h2>

      <div className="field">
        <label htmlFor="co-promo">{t.promoCode}</label>
        {hasPromo ? (
          <div className="applied">
            <span className="status-open"><Icon name="check" />{t.promoApplied(priced.promoCode!, money(priced.promoDiscount, lang))}</span>
            <Button variant="ghost" arrow={false} onClick={() => { setCode(''); setDisc({ ...disc, promo: '' }); }}>{t.removeCode}</Button>
          </div>
        ) : (
          <div className="promo-row">
            <input id="co-promo" className="input ltr" autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder={t.promoPh}
              value={code} onChange={(e) => { setCode(e.target.value); setDiscError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }}
              aria-invalid={!!discError} aria-describedby={discError ? 'co-disc-e' : undefined} />
            <Button variant="secondary" onClick={apply}>{t.applyCode}</Button>
          </div>
        )}
      </div>

      {me && (
        <div className="stack" style={{ gap: 8 }} data-testid="use-points">
          <label className="check switch">
            <input type="checkbox" role="switch" checked={using} disabled={!using && (blocks === 0 || hasPromo)}
              onChange={(e) => setDisc({ ...disc, redeem: { blocks: e.target.checked ? blocks : 0, freeDelivery: false } })} />
            <span>
              {blocks > 0 || using ? t.pointsUse((using ? disc.redeem.blocks : blocks) * off.points, money((using ? disc.redeem.blocks : blocks) * off.aed, lang)) : t.usePoints}
              <br /><small className="muted num">{t.balanceIs(t.pointsN(balance))}</small>
            </span>
          </label>
          {balance < off.points && <p className="hint">{t.pointsNeedMore(off.points)}</p>}
          {balance >= off.points && <p className="hint">{t.promoOrPoints}</p>}
        </div>
      )}
      {discError && <p className="error" id="co-disc-e" role="alert">{discError}</p>}
    </section>
  );
}

/* Stripe hooks throw outside <Elements>; when Stripe isn't configured we render without it. */
function useStripeSafe() { try { return PK ? useStripe() : null; } catch { return null; } }
function useElementsSafe() { try { return PK ? useElements() : null; } catch { return null; } }
