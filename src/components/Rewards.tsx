'use client';
/**
 * Rewards UI. Everything here renders NOTHING while rewards are switched off (REWARDS_ENABLED=false),
 * so no "coming soon" text ever shows.
 */
import Link from 'next/link';
import { useState } from 'react';
import { site } from '@/config/site';
import { money } from '@/lib/format';
import { nextReward } from '@/lib/points';
import { useAccount } from './AccountProvider';
import { Button } from './Button';
import { useFeatures } from './Features';
import { Icon } from './Icon';
import { useStore } from './StoreProvider';

/** Header chip: points balance when signed in, otherwise "Rewards" (opens sign-in). */
export function RewardsChip() {
  const { rewards } = useFeatures();
  const { me, loading, openSignIn } = useAccount();
  const { t, lang } = useStore();
  if (!rewards || loading) return null;
  if (me) {
    return (
      <Link href={`/${lang}/profile#rewards`} className="points-chip" data-testid="points-chip" aria-label={`${t.myRewards}: ${t.pointsN(me.points)}`}>
        <Icon name="gift" size={18} /><span className="num">{me.points.toLocaleString('en-US')}</span>
      </Link>
    );
  }
  return (
    <button type="button" className="points-chip" onClick={() => openSignIn()} data-testid="rewards-chip">
      <Icon name="gift" size={18} /><span>{t.rewards}</span>
    </button>
  );
}

/** Black rewards band on the home page (only reached when rewards are on). */
export function RewardsBandInner() {
  const { t, lang } = useStore();
  const { me, openSignIn } = useAccount();
  const aed = money(site.points.moneyOff.aed, lang);
  return (
    <section className="band-ink section rewards-band" aria-labelledby="rewards-title" data-testid="rewards-band">
      <div className="container stack" style={{ gap: 'var(--s4)', justifyItems: 'start' }}>
        <h2 id="rewards-title" className="section-title" style={{ color: 'var(--on-ink)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="gold" style={{ display: 'inline-grid' }}><Icon name="gift" size={28} /></span>
          {me ? t.hello(me.firstName) : t.rewardsTitle}
        </h2>
        {me ? (
          <p style={{ fontSize: 18 }}>{t.yourPoints}: <b className="gold num">{t.pointsN(me.points)}</b> · {t.worth(money(nextReward(me.points).aedNow, lang))}</p>
        ) : (
          <p style={{ fontSize: 18, maxWidth: 560 }}>{t.rewardsSub(site.points.perAed, aed)}</p>
        )}
        {me
          ? <Link className="btn btn-primary btn-md" href={`/${lang}/profile#rewards`}><span className="btn-label">{t.myRewards}</span></Link>
          : <Button size="lg" glow onClick={() => openSignIn()} data-testid="join-rewards">{t.joinRewards}</Button>}
      </div>
    </section>
  );
}

/** Profile: points card, how points work, recent orders, sign out, your data and "Delete my account". */
export function RewardsProfile() {
  const { rewards } = useFeatures();
  const { t, lang, showToast } = useStore();
  const { me, loading, orders, openSignIn, signOut } = useAccount();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!rewards || loading) return null;
  const off = site.points.moneyOff;

  if (!me) {
    return (
      <section className="panel-card" id="rewards" aria-labelledby="pf-rewards">
        <h2 id="pf-rewards"><Icon name="gift" size={22} />{t.rewardsTitle}</h2>
        <p className="muted">{t.rewardsSub(site.points.perAed, money(off.aed, lang))}</p>
        <div><Button onClick={() => openSignIn()} data-testid="profile-signin">{t.signIn}</Button></div>
      </section>
    );
  }

  const nr = nextReward(me.points);
  return (
    <>
      <section className="points-card" id="rewards" aria-labelledby="pf-points" data-testid="points-card">
        <span id="pf-points" style={{ opacity: 0.85 }}>{t.hello(me.firstName)} · {t.yourPoints}</span>
        <span className="pc-balance num">{t.pointsN(me.points)}</span>
        <span>{t.worth(money(nr.aedNow, lang))}</span>
        <span className="pc-bar" aria-hidden><i style={{ transform: `scaleX(${nr.pct / 100})` }} /></span>
        <small style={{ opacity: 0.85 }}>{t.toNextReward(nr.toNext, money(off.aed, lang))}</small>
      </section>

      <section className="panel-card" aria-labelledby="pf-how">
        <h2 id="pf-how">{t.howPoints}</h2>
        <ul style={{ margin: 0, paddingInlineStart: 20, display: 'grid', gap: 6 }}>
          {t.howPointsList(site.points.perAed, off.points, money(off.aed, lang)).map((x) => <li key={x}>{x}</li>)}
        </ul>
      </section>

      <section className="panel-card" aria-labelledby="pf-orders">
        <h2 id="pf-orders">{t.yourOrders}</h2>
        {orders.length === 0 ? <p className="muted">{t.noOrders}</p> : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {orders.map((o) => (
              <li key={o.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span><b className="num ltr">{o.id}</b><br /><small className="muted">{t.statuses[o.status] ?? o.status}</small></span>
                <span className="num">{money(o.total, lang)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel-card" aria-labelledby="pf-data">
        <h2 id="pf-data">{t.privacyData}</h2>
        <p className="muted">{t.privacyDataText}</p>
        <div className="options-row">
          <Button variant="secondary" icon="signOut" onClick={signOut} data-testid="signout">{t.signOut}</Button>
          {!confirming && <Button variant="ghost" arrow={false} icon="trash" onClick={() => setConfirming(true)} data-testid="delete-account">{t.deleteAccount}</Button>}
        </div>
        {confirming && (
          <div className="alert error-box stack" role="alertdialog" aria-label={t.deleteAccount} style={{ gap: 8 }}>
            <p>{t.deleteConfirm}</p>
            <div className="options-row">
              <Button loading={busy} data-testid="delete-confirm" onClick={async () => {
                setBusy(true);
                const r = await fetch('/api/account/delete', { method: 'POST' }).catch(() => null);
                setBusy(false);
                setConfirming(false);
                if (r?.ok) { await signOut(); showToast(t.accountDeleted); }
              }}>{t.deleteYes}</Button>
              <Button variant="secondary" onClick={() => setConfirming(false)}>{t.cancel}</Button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
