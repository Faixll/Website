'use client';
/* Site chrome: language link, cart button, tab bar (phone) / side rail (tablet+desktop), mini cart, cart drawer, toast, WhatsApp. */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { site } from '@/config/site';
import { productById, qtyRule } from '@/data/catalog';
import { money, waLink } from '@/lib/format';
import { amountLabel, lineLabel } from '@/lib/lines';
import { linePrice } from '@/lib/pricing';
import type { IconWeight } from '@phosphor-icons/react';
import { Icon, type IconName } from './Icon';
import { EASE } from './Motion';
import { ProductImage } from './ProductImage';
import { Stepper } from './Stepper';
import { useStore } from './StoreProvider';

/* ---------------------------------------------------------------- language */
export function LangToggle({ className = 'lang-link' }: { className?: string }) {
  const { t, lang } = useStore();
  const pathname = usePathname() ?? `/${lang}`;
  const target = pathname.replace(/^\/(ar|en)(?=\/|$)/, `/${t.otherLangCode}`);
  return (
    <a
      href={target}
      hrefLang={t.otherLangCode}
      lang={t.otherLangCode}
      className={className}
      data-testid="lang-switch"
      onClick={(e) => { e.preventDefault(); window.location.href = target + window.location.search; }}
    >
      <Icon name="globe" size={20} />
      {t.otherLang}
    </a>
  );
}

/* ---------------------------------------------------------------- cart icon with count bubble */
function CartGlyph({ size = 24, weight = 'regular' }: { size?: number; weight?: IconWeight }) {
  const { totals, ready, addedTick } = useStore();
  const reduce = useReducedMotion();
  // The bubble counts products in the cart (kg amounts are not whole numbers).
  const shown = ready ? totals.lines.length : 0;
  return (
    <motion.span
      className="tab-ico"
      key={`ico-${addedTick}`}
      initial={addedTick && !reduce ? { scale: 1 } : false}
      animate={addedTick && !reduce ? { scale: [1, 1.22, 0.95, 1] } : undefined}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <Icon name="cart" size={size} weight={weight} />
      {ready && totals.lines.length > 0 && (
        <motion.span
          key={`count-${addedTick}`}
          className="count num"
          data-testid="cart-count"
          initial={addedTick && !reduce ? { scale: 0.6 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 18 }}
        >
          {shown}
        </motion.span>
      )}
    </motion.span>
  );
}

export function CartButton() {
  const { t, lang, totals, setCartOpen } = useStore();
  return (
    <button
      type="button"
      className="icon-btn cart-btn"
      data-testid="open-cart"
      onClick={() => setCartOpen(true)}
      aria-label={`${t.cartTotal}: ${money(totals.subtotal, lang)}, ${t.itemsN(totals.lines.length)}`}
    >
      <CartGlyph size={22} />
    </button>
  );
}

/* ---------------------------------------------------------------- tab bar + rail */
type TabId = 'home' | 'search' | 'cart' | 'profile';
const TABS: { id: TabId; icon: IconName; label: 'tabHome' | 'tabSearch' | 'tabCart' | 'tabProfile' }[] = [
  { id: 'home', icon: 'home', label: 'tabHome' },
  { id: 'search', icon: 'search', label: 'tabSearch' },
  { id: 'cart', icon: 'cart', label: 'tabCart' },
  { id: 'profile', icon: 'user', label: 'tabProfile' },
];

/** Product pages and checkout use their own sticky bars instead of the tab bar (phone). */
const noTabBar = (path: string) => /\/(product|checkout)(\/|$)/.test(path);

function useActiveTab(): TabId | null {
  const { lang, cartOpen } = useStore();
  const path = usePathname() ?? '';
  if (cartOpen) return 'cart';
  if (new RegExp(`^/${lang}/?$`).test(path)) return 'home';
  if (/\/search/.test(path)) return 'search';
  if (/\/(profile|account)/.test(path)) return 'profile';
  return null;
}

function NavItems({ group }: { group: 'tabbar' | 'rail' }) {
  const { t, lang, setCartOpen } = useStore();
  const active = useActiveTab();
  return (
    <>
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        const inner = (
          <>
            {isActive && <motion.span layoutId={`${group}-indicator`} className="indicator" transition={{ duration: 0.3, ease: EASE }} />}
            {tab.id === 'cart' ? (
              <CartGlyph weight={isActive ? 'fill' : 'regular'} />
            ) : (
              <motion.span className="tab-ico" initial={false} animate={{ scale: isActive ? 1 : 0.9 }} transition={{ duration: 0.2, ease: EASE }}>
                <Icon name={tab.icon} weight={isActive ? 'fill' : 'regular'} />
              </motion.span>
            )}
            <span>{t[tab.label]}</span>
          </>
        );
        if (tab.id === 'cart') {
          return (
            <button key={tab.id} type="button" className="tab" data-tab={tab.id} aria-current={isActive ? 'page' : undefined} onClick={() => setCartOpen(true)}>
              {inner}
            </button>
          );
        }
        const href = tab.id === 'home' ? `/${lang}` : tab.id === 'search' ? `/${lang}/search?focus=1` : `/${lang}/profile`;
        return (
          <Link key={tab.id} href={href} className="tab" data-tab={tab.id} aria-current={isActive ? 'page' : undefined}>
            {inner}
          </Link>
        );
      })}
    </>
  );
}

export function NavBars() {
  const { t, lang } = useStore();
  const path = usePathname() ?? '';
  const [keyboard, setKeyboard] = useState(false);

  // Hide the phone tab bar while the on-screen keyboard is up (a text field has focus on a small screen).
  useEffect(() => {
    const isText = (el: EventTarget | null) => el instanceof HTMLElement && el.matches('input:not([type=radio]):not([type=checkbox]):not([type=button]):not([type=submit]), textarea, select');
    const on = (e: FocusEvent) => { if (isText(e.target) && matchMedia('(max-width: 767px)').matches) setKeyboard(true); };
    const off = () => setTimeout(() => { if (!isText(document.activeElement)) setKeyboard(false); }, 50);
    document.addEventListener('focusin', on);
    document.addEventListener('focusout', off);
    return () => { document.removeEventListener('focusin', on); document.removeEventListener('focusout', off); };
  }, []);

  const hidden = noTabBar(path) || keyboard;
  useEffect(() => {
    document.body.classList.toggle('hide-tabbar', hidden);
    return () => document.body.classList.remove('hide-tabbar');
  }, [hidden]);

  return (
    <>
      <nav className="tabbar" aria-label={t.menu} data-testid="tabbar">
        <NavItems group="tabbar" />
      </nav>
      <nav className="rail" aria-label={t.menu} data-testid="rail">
        <Link href={`/${lang}`} className="rail-logo" aria-label={site.name[lang]}>
          <img src={site.logo} alt="" width={44} height={44} />
        </Link>
        <NavItems group="rail" />
      </nav>
    </>
  );
}

/* ---------------------------------------------------------------- free-delivery progress / mini cart */
function FreeDeliveryProgress() {
  const { t, lang, totals } = useStore();
  const pct = Math.min(1, totals.subtotal / site.delivery.freeAbove);
  const done = totals.remainingForFree === 0;
  return (
    <div className={`progress${done ? ' done' : ''}`}>
      <span>{done ? t.freeDeliveryUnlocked : t.freeDeliveryLeft(money(totals.remainingForFree, lang))}</span>
      <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={site.delivery.freeAbove} aria-valuenow={totals.subtotal} aria-label={t.freeDeliveryLeft(money(totals.remainingForFree, lang))}>
        <i style={{ transform: `scaleX(${pct})` }} />
      </div>
    </div>
  );
}

export function MiniCart() {
  const { t, lang, totals, ready, setCartOpen } = useStore();
  const path = usePathname() ?? '';
  const show = ready && totals.lines.length > 0 && !noTabBar(path) && !/\/order\//.test(path);
  useEffect(() => {
    document.body.classList.toggle('has-minicart', show);
    return () => document.body.classList.remove('has-minicart');
  }, [show]);
  if (!show) return null;
  return (
    <div className="minicart" data-testid="minicart">
      <div className="minicart-inner">
        <div className="row1">
          <button type="button" className="sum" onClick={() => setCartOpen(true)}>
            <b className="num">{money(totals.subtotal, lang)}</b>
            <span>{t.itemsN(totals.lines.length)} · {t.viewCart}</span>
          </button>
          <Link href={`/${lang}/checkout`} className="btn btn-primary btn-pill">{t.checkout}</Link>
        </div>
        <FreeDeliveryProgress />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- cart drawer */
export function CartDrawer() {
  const { t, lang, lines, setQty, remove, totals, cartOpen, setCartOpen } = useStore();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const reduce = useReducedMotion();
  const dirSign = lang === 'ar' ? -1 : 1;

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

  return (
    <AnimatePresence>
      {cartOpen && (
        <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
          <motion.button className="scrim" aria-label={t.close} tabIndex={-1} onClick={() => setCartOpen(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
          <motion.div className="panel" ref={panelRef}
            initial={{ x: reduce ? 0 : `${100 * dirSign}%`, opacity: reduce ? 0 : 1 }} animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduce ? 0 : `${100 * dirSign}%`, opacity: reduce ? 0 : 1 }} transition={{ duration: 0.3, ease: EASE }}>
            <header>
              <h2 id="cart-title" style={{ fontSize: 20 }}>{t.yourCart}</h2>
              <button ref={closeRef} className="icon-btn" onClick={() => setCartOpen(false)} aria-label={t.close}>
                <Icon name="close" size={20} />
              </button>
            </header>
            {lines.length === 0 ? (
              <div className="empty">
                <Icon name="cart" size={32} />
                <p>{t.cartEmpty}</p>
                <Link href={`/${lang}/search`} className="btn btn-primary btn-pill" onClick={() => setCartOpen(false)}>{t.shopNow}</Link>
              </div>
            ) : (
              <>
                <div className="lines">
                  {lines.map((l) => {
                    const p = productById(l.productId)!;
                    const r = qtyRule(p);
                    return (
                      <div className="line" key={l.key} data-testid="cart-line">
                        <div className="thumb"><ProductImage p={p} lang={lang} sizes="64px" /></div>
                        <div className="l-main">
                          <Link className="l-name" href={`/${lang}/product/${p.id}`} onClick={() => setCartOpen(false)}>{p.name[lang]}</Link>
                          <span className="l-opts" data-testid="cart-line-label">{lineLabel(l, lang, t, { withName: false }) || ' '}{l.notes ? ` · ${l.notes}` : ''}</span>
                          <div className="l-row">
                            <Stepper value={l.qty} onChange={(q) => setQty(l.key, q)} min={r.min} max={r.max} step={r.step} small removable
                              format={(v) => amountLabel(p.id, v, t)} label={p.name[lang]} />
                            <b className="num" data-testid="cart-line-total">{money(linePrice(l), lang)}</b>
                          </div>
                          <button className="link-btn" style={{ justifySelf: 'start' }} onClick={() => remove(l.key)}>{t.remove}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <footer>
                  <FreeDeliveryProgress />
                  <div className="totals" style={{ borderTop: 0, paddingTop: 0 }}>
                    <div className="grand" style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}>
                      <span>{t.subtotal}</span>
                      <b className="num" data-testid="cart-subtotal">{money(totals.subtotal, lang)}</b>
                    </div>
                    <span className="vat">{t.vatIncl}</span>
                  </div>
                  <Link href={`/${lang}/checkout`} className="btn btn-primary btn-pill btn-lg btn-block" onClick={() => setCartOpen(false)}>
                    {t.checkout}
                  </Link>
                </footer>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------- toast + WhatsApp */
export function Toast() {
  const { toast } = useStore();
  const reduce = useReducedMotion();
  return (
    <div className="toast-wrap" aria-live="polite" role="status">
      <AnimatePresence>
        {toast && (
          <motion.div className="toast" key={toast}
            initial={{ opacity: 0, y: reduce ? 0 : -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : -16 }}
            transition={{ duration: 0.25, ease: EASE }}>
            <Icon name="check" size={20} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function WhatsAppFab() {
  const { t } = useStore();
  return (
    <a className="wa-fab" href={waLink(site.whatsapp)} target="_blank" rel="noopener" aria-label={t.whatsapp} data-testid="whatsapp-fab">
      <Icon name="whatsapp" size={26} />
    </a>
  );
}
