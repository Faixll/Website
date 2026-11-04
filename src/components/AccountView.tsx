'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { site } from '@/config/site';
import { productById, type CutId } from '@/data/catalog';
import { money, normaliseUaeMobile, phoneDisplay } from '@/lib/format';
import { nextReward } from '@/lib/points';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useAccount } from './AccountProvider';
import { Icon } from './Icon';
import { useStore } from './StoreProvider';

/** Where to go after signing in, from ?next=… (only our own pages). */
const nextPath = (lang: string) => {
  const n = new URLSearchParams(window.location.search).get('next');
  return n === 'checkout' ? `/${lang}/checkout` : null;
};

export function SignIn() {
  const { t, lang } = useStore();
  const { refresh } = useAccount();
  const router = useRouter();
  const id = useId();
  const [phone, setPhone] = useState('');
  const [e164, setE164] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const tm = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(tm);
  }, [wait]);

  const send = async (number: string) => {
    const sb = await supabaseBrowser();
    if (!sb) return;
    setBusy(true); setErr('');
    const { error } = await sb.auth.signInWithOtp({ phone: number });
    setBusy(false);
    if (error) return setErr(t.smsFailed);
    setE164(number); setWait(60);
  };

  const onPhone = (e: React.FormEvent) => {
    e.preventDefault();
    const n = normaliseUaeMobile(phone);
    if (!n) return setErr(t.phoneInvalid);
    send(n);
  };

  const onCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = await supabaseBrowser();
    if (!sb || !e164) return;
    const token = code.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)).replace(/\D/g, '');
    if (token.length !== 6) return setErr(t.codeInvalid);
    setBusy(true); setErr('');
    const { error } = await sb.auth.verifyOtp({ phone: e164, token, type: 'sms' });
    setBusy(false);
    if (error) return setErr(t.codeInvalid);
    await refresh();
    const next = nextPath(lang);
    if (next) router.push(next);
  };

  return (
    <div className="panel-card" style={{ maxWidth: 460, marginInline: 'auto' }}>
      <h1 style={{ fontSize: 24 }}>{t.signInTitle}</h1>
      <p className="muted">{t.signInSub}</p>
      {!e164 ? (
        <form className="stack" onSubmit={onPhone} noValidate>
          <div className="field">
            <label htmlFor={`${id}-p`}>{t.phone}</label>
            <div className="phone-wrap">
              <span className="prefix" aria-hidden>+971</span>
              <input id={`${id}-p`} className="input" type="tel" inputMode="tel" autoComplete="tel-national" placeholder={t.phoneHint}
                value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!err} aria-describedby={err ? `${id}-e` : undefined} />
            </div>
          </div>
          {err && <p className="error" id={`${id}-e`} role="alert">{err}</p>}
          <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>{busy ? t.processing : t.sendCode}</button>
        </form>
      ) : (
        <form className="stack" onSubmit={onCode} noValidate>
          <p>{t.codeSentTo('')}<b className="ltr">{phoneDisplay(e164)}</b></p>
          <div className="field">
            <label htmlFor={`${id}-c`}>{t.code}</label>
            <input id={`${id}-c`} className="input num ltr" style={{ letterSpacing: '.4em', fontSize: 22, textAlign: 'center' }}
              inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
              value={code} onChange={(e) => setCode(e.target.value)} aria-invalid={!!err} aria-describedby={err ? `${id}-e2` : undefined} />
          </div>
          {err && <p className="error" id={`${id}-e2`} role="alert">{err}</p>}
          <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>{busy ? t.processing : t.verify}</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="link-btn" onClick={() => { setE164(null); setCode(''); setErr(''); }}>{t.changeNumber}</button>
            <button type="button" className="link-btn" disabled={wait > 0 || busy} onClick={() => send(e164)}>
              {wait > 0 ? t.resendIn(wait) : t.resend}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

type OrderRow = {
  id: string; status: string; total: number; created_at: string; points_earnable: number; points_redeemed: number;
  details: { lines: { productId: string; sizeId: string; cutId: string; qty: number; notes: string }[] };
};
type LedgerRow = { id: number; delta: number; reason: string; order_id: string | null; note: string | null; created_at: string };

export function PointsCard({ balance }: { balance: number }) {
  const { t, lang } = useStore();
  const n = nextReward(balance);
  return (
    <div className="points-card">
      <p className="pc-label">{t.yourPoints}</p>
      <p className="pc-balance num">{t.pointsN(balance)}</p>
      <p className="pc-worth">{t.worth(money(n.aedNow, lang))}</p>
      <div className="pc-bar" role="progressbar" aria-valuemin={0} aria-valuemax={site.points.moneyOff.points} aria-valuenow={balance % site.points.moneyOff.points} aria-label={t.toNextReward(n.toNext, money(site.points.moneyOff.aed, lang))}>
        <i style={{ width: `${n.pct}%` }} />
      </div>
      <p className="pc-next num">{t.toNextReward(n.toNext, money(site.points.moneyOff.aed, lang))}</p>
    </div>
  );
}

export function AccountDashboard() {
  const { t, lang, add, showToast } = useStore();
  const { profile, user, refresh, signOut } = useAccount();
  const [name, setName] = useState(profile?.name ?? '');
  const [saved, setSaved] = useState(false);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[] | null>(null);
  const router = useRouter();

  useEffect(() => setName(profile?.name ?? ''), [profile?.name]);
  useEffect(() => {
    if (!user) return;
    supabaseBrowser().then((sb) => {
      if (!sb) return;
      sb.from('orders').select('id, status, total, created_at, points_earnable, points_redeemed, details').order('created_at', { ascending: false }).limit(20)
        .then(({ data }) => setOrders((data as OrderRow[]) ?? []));
      sb.from('points_ledger').select('id, delta, reason, order_id, note, created_at').order('created_at', { ascending: false }).limit(30)
        .then(({ data }) => setLedger((data as LedgerRow[]) ?? []));
    });
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = await supabaseBrowser();
    if (!sb || !user) return;
    await sb.from('profiles').update({ name: name.trim().slice(0, 100) }).eq('id', user.id);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    refresh();
  };

  const orderAgain = (o: OrderRow) => {
    let added = 0;
    for (const l of o.details.lines ?? []) {
      const p = productById(l.productId);
      if (!p || p.stock === 'out' || !p.sizes.some((s) => s.id === l.sizeId) || !p.cuts.includes(l.cutId as CutId)) continue;
      add({ productId: l.productId, sizeId: l.sizeId, cutId: l.cutId as CutId, notes: l.notes ?? '' }, l.qty);
      added++;
    }
    if (added) { showToast(t.addedToCart); router.push(`/${lang}/checkout`); }
  };

  const date = (iso: string) => new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-AE-u-nu-latn' : 'en-AE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' });
  const off = site.points.moneyOff;

  return (
    <div className="account-grid">
      <div className="stack" style={{ gap: 16 }}>
        <PointsCard balance={profile?.points_balance ?? 0} />
        <section className="panel-card" aria-labelledby="h-how">
          <h2 id="h-how">{t.howPoints}</h2>
          <ul className="checks-list">
            {t.howPointsList(off.points, money(off.aed, lang), site.points.freeDelivery.points).map((x) => <li key={x}><Icon name="check" />{x}</li>)}
          </ul>
        </section>
        <form className="panel-card" onSubmit={saveName}>
          <div className="field">
            <label htmlFor="acc-name">{t.yourName}</label>
            <input id="acc-name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </div>
          <p className="muted">{t.phone}: <span className="ltr">{profile?.phone ? phoneDisplay(profile.phone) : '—'}</span></p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary" type="submit">{saved ? t.saved : t.save}</button>
            <button className="btn btn-ghost" type="button" onClick={async () => { await signOut(); router.push(`/${lang}`); }}>{t.signOut}</button>
            {profile?.role === 'staff' && <Link className="btn btn-outline" href={`/${lang}/staff`}>{t.staffTitle}</Link>}
          </div>
        </form>
      </div>

      <div className="stack" style={{ gap: 16 }}>
        <section className="panel-card" aria-labelledby="h-orders">
          <h2 id="h-orders">{t.yourOrders}</h2>
          {orders === null ? <p className="muted" aria-busy="true">…</p> : orders.length === 0 ? <p className="muted">{t.noOrders}</p> : (
            <ul className="rows">
              {orders.map((o) => (
                <li key={o.id}>
                  <div className="r-main">
                    <b className="ltr num">{o.id}</b>
                    <span className="muted">{date(o.created_at)} · {o.details.lines?.map((l) => productById(l.productId)?.name[lang]).filter(Boolean).join(lang === 'ar' ? '، ' : ', ')}</span>
                  </div>
                  <div className="r-side">
                    <span className="num">{money(Number(o.total), lang)}</span>
                    <span className={`badge ${o.status === 'delivered' || o.status === 'paid' ? 'badge-fresh' : o.status === 'cancelled' || o.status === 'payment_failed' ? 'badge-out' : 'badge-low'}`}>{t.statuses[o.status] ?? o.status}</span>
                    <button type="button" className="link-btn" onClick={() => orderAgain(o)}>{t.orderAgain}</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel-card" aria-labelledby="h-ledger">
          <h2 id="h-ledger">{t.pointsHistory}</h2>
          {ledger === null ? <p className="muted" aria-busy="true">…</p> : ledger.length === 0 ? <p className="muted">{t.noPoints}</p> : (
            <ul className="rows">
              {ledger.map((l) => (
                <li key={l.id}>
                  <div className="r-main">
                    <span>{t.reasons[l.reason] ?? l.reason}{l.order_id && <> · <span className="ltr num">{l.order_id}</span></>}</span>
                    <span className="muted">{date(l.created_at)}{l.note ? ` · ${l.note}` : ''}</span>
                  </div>
                  <b className={`num ${l.delta > 0 ? 'status-open' : ''}`}><span className="ltr">{l.delta > 0 ? '+' : '−'}{Math.abs(l.delta)}</span></b>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export function AccountPage() {
  const { t } = useStore();
  const { enabled, loading, user } = useAccount();
  if (!enabled) return <p className="alert" style={{ maxWidth: 520, marginInline: 'auto' }}>{t.accountsOff}</p>;
  if (loading) return <div style={{ minHeight: '40vh' }} aria-busy="true" />;
  return user ? <AccountDashboard /> : <SignIn />;
}

