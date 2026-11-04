'use client';
/* Site chrome: language toggle, cart button, cart drawer, sticky cart bar, bottom nav, toast. */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { site } from '@/config/site';
import { cuts, productById, productImage } from '@/data/catalog';
import { money } from '@/lib/format';
import { linePrice } from '@/lib/pricing';
import { Icon } from './Icon';
import { Stepper } from './Stepper';
import { useAccount } from './AccountProvider';
import { useStore } from './StoreProvider';

export function LangToggle({ className }: { className?: string }) {
  const { t, lang } = useStore();
  const pathname = usePathname() ?? `/${lang}`;
  const target = pathname.replace(/^\/(ar|en)(?=\/|$)/, `/${t.otherLangCode}`);
  return (
    <a
      href={target}
      hrefLang={t.otherLangCode}
      lang={t.otherLangCode}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        window.location.href = target + window.location.search;
      }}
    >
      <Icon name="globe" className="icon" />
      {t.otherLang}
    </a>
  );
}

/** Header account link: "Sign in", or the points balance once signed in. */
export function AccountButton() {
  const { t, lang } = useStore();
  const { enabled, user, profile } = useAccount();
  if (!enabled) return null;
  const label = user ? t.pointsN(profile?.points_balance ?? 0) : t.signIn;
  return (
    <Link href={`/${lang}/account`} className="account-btn" aria-label={user ? `${t.account}: ${label}` : label}>
      <Icon name={user ? 'star' : 'user'} />
      <span className="label num">{label}</span>
    </Link>
  );
}

export function CartButton() {
  const { t, lang, totals, setCartOpen, ready } = useStore();
  return (
    <button type="button" className="cart-btn" onClick={() => setCartOpen(true)} aria-label={`${t.cartTotal}: ${money(totals.subtotal, lang)}, ${t.itemsN(totals.count)}`}>
      <Icon name="cart" />
      <span className="label num">{money(ready ? totals.subtotal : 0, lang)}</span>
      {ready && totals.count > 0 && <span className="count num" aria-hidden>{totals.count}</span>}
    </button>
  );
}

function FreeDeliveryProgress() {
  const { t, lang, totals } = useStore();
  const pct = Math.min(100, (totals.subtotal / site.delivery.freeAbove) * 100);
  const done = totals.remainingForFree === 0;
  return (
    <div className={`progress${done ? ' done' : ''}`}>
      <span>{done ? t.freeDeliveryUnlocked : t.freeDeliveryLeft(money(totals.remainingForFree, lang))}</span>
      <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={site.delivery.freeAbove} aria-valuenow={totals.subtotal} aria-label={t.freeDeliveryLeft('')}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Pages where the sticky cart bar is replaced (checkout) or competes with a buy bar (product page on mobile). */
const hideCartBar = (path: string) => /\/(checkout|order)(\/|$)/.test(path);

export function CartBar() {
  const { t, lang, totals, ready, setCartOpen } = useStore();
  const pathname = usePathname() ?? '';
  const isProduct = /\/product\//.test(pathname);
  const show = ready && totals.count > 0 && !hideCartBar(pathname);

  useEffect(() => {
    document.body.classList.toggle('has-cartbar', show);
    return () => document.body.classList.remove('has-cartbar');
  }, [show]);

  if (!show) return null;
  return (
    <div className={`cartbar${isProduct ? ' on-product' : ''}`}>
      <div className="cartbar-inner">
        <div className="row">
          <button type="button" className="sum" onClick={() => setCartOpen(true)}>
            <b className="num">{money(totals.subtotal, lang)}</b>
            <span>{t.itemsN(totals.count)} · {t.viewCart}</span>
          </button>
          <Link href={`/${lang}/checkout`} className="btn btn-primary">
            {t.checkout}
            <Icon name="chevron" className="icon flip" />
          </Link>
        </div>
        <FreeDeliveryProgress />
      </div>
    </div>
  );
}

export function CartDrawer() {
  const { t, lang, lines, setQty, remove, totals, cartOpen, setCartOpen } = useStore();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!cartOpen) return;
    opener.current = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCartOpen(false);
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea');
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [cartOpen, setCartOpen]);

  if (!cartOpen) return null;
  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <button className="scrim" aria-label={t.close} tabIndex={-1} onClick={() => setCartOpen(false)} />
      <div className="panel" ref={panelRef}>
        <header>
          <h2 id="cart-title">{t.yourCart}</h2>
          <button ref={closeRef} className="icon-btn" onClick={() => setCartOpen(false)} aria-label={t.close}>
            <Icon name="close" />
          </button>
        </header>
        {lines.length === 0 ? (
          <div className="empty">
            <Icon name="cart" className="icon" />
            <p>{t.cartEmpty}</p>
            <Link href={`/${lang}/search`} className="btn btn-primary" onClick={() => setCartOpen(false)}>{t.shopNow}</Link>
          </div>
        ) : (
          <>
            <div className="lines">
              {lines.map((l) => {
                const p = productById(l.productId)!;
                const size = p.sizes.find((s) => s.id === l.sizeId)!;
                return (
                  <div className="line" key={l.key}>
                    <img src={productImage(p)} alt="" width={64} height={64} loading="lazy" />
                    <div className="l-main">
                      <Link className="l-name" href={`/${lang}/product/${p.id}`} onClick={() => setCartOpen(false)}>{p.name[lang]}</Link>
                      <span className="l-opts">{size.name[lang]} · {cuts[l.cutId].name[lang]}{l.notes ? ` · ${l.notes}` : ''}</span>
                      {p.stock === 'out' && <span className="badge badge-out">{t.out}</span>}
                      <div className="l-row">
                        <Stepper qty={l.qty} onChange={(q) => setQty(l.key, q)} light label={p.name[lang]} />
                        <b className="num">{money(linePrice(l), lang)}</b>
                      </div>
                      <button className="link-btn" style={{ justifySelf: 'start' }} onClick={() => remove(l.key)}>{t.remove}</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <footer>
              <FreeDeliveryProgressLight />
              <div className="totals" style={{ borderTop: 0, paddingTop: 0 }}>
                <div className="grand" style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}>
                  <span>{t.subtotal}</span>
                  <b className="num">{money(totals.subtotal, lang)}</b>
                </div>
                <span className="vat">{t.vatIncl}</span>
              </div>
              <Link href={`/${lang}/checkout`} className="btn btn-primary btn-lg btn-block" onClick={() => setCartOpen(false)}>
                {t.checkout}
              </Link>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function FreeDeliveryProgressLight() {
  const { t, lang, totals } = useStore();
  const pct = Math.min(100, (totals.subtotal / site.delivery.freeAbove) * 100);
  const done = totals.remainingForFree === 0;
  return (
    <div className="progress" style={{ color: done ? 'var(--fresh)' : 'var(--muted)', fontWeight: done ? 600 : 400 }}>
      <span>{done ? t.freeDeliveryUnlocked : t.freeDeliveryLeft(money(totals.remainingForFree, lang))}</span>
      <div className="bar" style={{ background: '#E9E4DD' }} aria-hidden>
        <i style={{ width: `${pct}%`, background: 'var(--fresh)' }} />
      </div>
    </div>
  );
}

export function BottomNav() {
  const { t, lang, totals, ready, setCartOpen } = useStore();
  const { enabled: accountsOn } = useAccount();
  const pathname = usePathname() ?? '';
  if (/\/checkout/.test(pathname)) return null;
  const cur = (re: RegExp) => (re.test(pathname) ? 'page' : undefined);
  return (
    <nav className={`bottomnav${accountsOn ? ' five' : ''}`} aria-label={t.menu}>
      <Link href={`/${lang}`} aria-current={cur(new RegExp(`^/${lang}/?$`))}>
        <Icon name="home" />
        {t.home}
      </Link>
      <Link href={`/${lang}/search`} aria-current={cur(/\/search/)}>
        <Icon name="grid" />
        {t.categories}
      </Link>
      <button type="button" onClick={() => setCartOpen(true)}>
        <Icon name="cart" />
        {t.cart}
        {ready && totals.count > 0 && <span className="n-badge num">{totals.count}</span>}
      </button>
      <Link href={`/${lang}/stores`} aria-current={cur(/\/stores/)}>
        <Icon name="store" />
        {t.branchesLink}
      </Link>
      {accountsOn && (
        <Link href={`/${lang}/account`} aria-current={cur(/\/account/)}>
          <Icon name="user" />
          {t.account}
        </Link>
      )}
    </nav>
  );
}

export function Toast() {
  const { toast } = useStore();
  return (
    <div aria-live="polite" role="status">
      {toast && (
        <div className="toast">
          <Icon name="check" />
          {toast}
        </div>
      )}
    </div>
  );
}
