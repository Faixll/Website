'use client';
/* Site chrome: language link, cart button (desktop), tab bar (phone only), mini cart, cart sheet, toast, WhatsApp, fly-to-cart. */

import type { IconWeight } from '@phosphor-icons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { site } from '@/config/site';
import { productById, qtyRule } from '@/data/catalog';
import { money, waLink } from '@/lib/format';
import { amountLabel, lineLabel } from '@/lib/lines';
import { linePrice } from '@/lib/pricing';
import { Button, ButtonLink } from './Button';
import { prefersReducedMotion, useMedia, useScrollDirection, useTyping } from './hooks';
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
      <Icon name="globe" size={18} />
      {t.otherLang}
    </a>
  );
}

/* ---------------------------------------------------------------- cart icon with count bubble */
function CartGlyph({ size = 24, weight = 'regular' }: { size?: number; weight?: IconWeight }) {
  const { ready, totals, addedTick } = useStore();
  const reduce = useReducedMotion();
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
      {shown > 0 && (
        <motion.span key={`count-${addedTick}`} className="count num" data-testid="cart-count"
          initial={addedTick && !reduce ? { scale: 0.6 } : false} animate={{ scale: 1 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 600, damping: 18 }}>
          {shown}
        </motion.span>
      )}
    </motion.span>
  );
}

/** Desktop header cart (phones use the Cart tab). */
export function CartButton() {
  const { t, lang, totals, setCartOpen } = useStore();
  return (
    <button type="button" className="icon-btn cart-btn" data-testid="open-cart" data-cart-target
      onClick={() => setCartOpen(true)} aria-label={`${t.cartTotal}: ${money(totals.subtotal, lang)}, ${t.itemsN(totals.lines.length)}`}>
      <CartGlyph size={22} />
    </button>
  );
}

/* ---------------------------------------------------------------- add-to-cart flight (transform/opacity only) */
export function flyToCart(from: HTMLElement | null) {
  if (!from || prefersReducedMotion()) return;
  const target = Array.from(document.querySelectorAll<HTMLElement>('[data-cart-target]')).find((el) => el.getClientRects().length && el.offsetParent !== null);
  if (!target) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const fly = document.createElement('div');
  fly.className = 'fly';
  fly.appendChild(from.cloneNode(true));
  const size = 56;
  Object.assign(fly.style, { left: `${a.left + a.width / 2 - size / 2}px`, top: `${a.top + a.height / 2 - size / 2}px` });
  document.body.appendChild(fly);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  fly.animate(
    [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(.3)`, opacity: 0.6 }],
    { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' },
  ).onfinish = () => fly.remove();
}

/* ---------------------------------------------------------------- tab bar (phone only) */
type TabId = 'home' | 'search' | 'cart' | 'profile';
const TABS: { id: TabId; icon: IconName; label: 'tabHome' | 'tabSearch' | 'tabCart' | 'tabProfile' }[] = [
  { id: 'home', icon: 'home', label: 'tabHome' },
  { id: 'search', icon: 'search', label: 'tabSearch' },
  { id: 'cart', icon: 'cart', label: 'tabCart' },
  { id: 'profile', icon: 'user', label: 'tabProfile' },
];

/** Product pages and checkout use their own sticky bars instead of the tab bar. */
const noTabBar = (path: string) => /\/(product|checkout)(\/|$)/.test(path);

export function TabBar() {
  const { t, lang, cartOpen, setCartOpen } = useStore();
  const path = usePathname() ?? '';
  const typing = useTyping();
  const phone = useMedia('(max-width: 767px)');
  const hidden = noTabBar(path) || (typing && phone);

  useEffect(() => {
    document.body.classList.toggle('hide-tabbar', hidden);
    return () => document.body.classList.remove('hide-tabbar');
  }, [hidden]);

  const active: TabId | null = cartOpen ? 'cart'
    : new RegExp(`^/${lang}/?$`).test(path) ? 'home'
    : /\/search/.test(path) ? 'search'
    : /\/profile/.test(path) ? 'profile' : null;

  return (
    <nav className="tabbar" aria-label={t.menu} data-testid="tabbar">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        const inner = (
          <>
            {isActive && <motion.span layoutId="tab-indicator" className="indicator" transition={{ duration: 0.3, ease: EASE }} />}
            {tab.id === 'cart' ? (
              <span data-cart-target><CartGlyph weight={isActive ? 'fill' : 'regular'} /></span>
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
    </nav>
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
      <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={site.delivery.freeAbove} aria-valuenow={totals.subtotal}
        aria-label={t.freeDeliveryLeft(money(totals.remainingForFree, lang))}>
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
          <ButtonLink href={`/${lang}/checkout`}>{t.checkout}</ButtonLink>
        </div>
        <FreeDeliveryProgress />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- cart: bottom sheet (phone) / side drawer (desktop) */
export function CartDrawer() {
  const { t, lang, lines, setQty, remove, totals, cartOpen, setCartOpen } = useStore();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const reduce = useReducedMotion();
  const desktop = useMedia('(min-width: 768px)');
  const side = lang === 'ar' ? -1 : 1;

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
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // lock the page; the sheet body still scrolls (overscroll contained)
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [cartOpen, setCartOpen]);

  const hidden = desktop ? { x: `${100 * side}%` } : { y: '100%' };
  const motionProps = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.1 } }
    : { initial: hidden, animate: { x: 0, y: 0 }, exit: hidden, transition: { type: 'spring' as const, stiffness: 420, damping: 40 } };

  return (
    <AnimatePresence>
      {cartOpen && (
        <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
          <motion.button className="scrim" aria-label={t.close} tabIndex={-1} onClick={() => setCartOpen(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
          <motion.div className="panel" ref={panelRef} {...motionProps}
            drag={!desktop && !reduce ? 'y' : false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) setCartOpen(false); }}>
            <div className="grab" aria-hidden />
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
                <ButtonLink href={`/${lang}/search`} onClick={() => setCartOpen(false)}>{t.shopNow}</ButtonLink>
              </div>
            ) : (
              <>
                <div className="body-scroll" onPointerDownCapture={(e) => e.stopPropagation()}>
                  {lines.map((l) => {
                    const p = productById(l.productId)!;
                    const r = qtyRule(p);
                    return (
                      <div className="line" key={l.key} data-testid="cart-line">
                        <div className="thumb"><ProductImage p={p} lang={lang} sizes="64px" sizeId={l.sizeId} small /></div>
                        <div className="l-main">
                          <Link className="l-name" href={`/${lang}/product/${p.id}`} onClick={() => setCartOpen(false)}>{p.name[lang]}</Link>
                          <span className="l-opts" data-testid="cart-line-label">{lineLabel(l, lang, t, { withName: false }) || ' '}{l.notes ? ` · ${l.notes}` : ''}</span>
                          <div className="l-row">
                            <Stepper value={l.qty} onChange={(q) => setQty(l.key, q)} min={r.min} max={r.max} step={r.step} small removable
                              format={(v) => amountLabel(p.id, v, t)} label={p.name[lang]} />
                            <b className="num" data-testid="cart-line-total">{money(linePrice(l), lang)}</b>
                          </div>
                          <Button variant="ghost" arrow={false} icon="trash" style={{ justifySelf: 'start' }} onClick={() => remove(l.key)}>{t.remove}</Button>
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
                  <ButtonLink href={`/${lang}/checkout`} size="xl" block glow onClick={() => setCartOpen(false)}>{t.checkout}</ButtonLink>
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
            transition={{ duration: reduce ? 0.1 : 0.25, ease: EASE }}>
            <Icon name="check" size={20} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const COVERS = 'button, a, input, select, textarea, label, .card, .picker, .branch, .panel-card, .review-card, .reviews-empty, .minicart-inner, .trust li';

/**
 * Floating WhatsApp (P6): 44px at the inline-end above the tab bar. Hidden while scrolling down, while a field
 * has focus, and whenever it would sit on top of a button or a card (checked when scrolling stops).
 */
export function WhatsAppFab() {
  const { t } = useStore();
  const dir = useScrollDirection(120);
  const typing = useTyping();
  const ref = useRef<HTMLAnchorElement>(null);
  const [covering, setCovering] = useState(true);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      const fab = ref.current;
      if (!fab) return;
      const r = fab.getBoundingClientRect();
      const prev = fab.style.visibility;
      fab.style.visibility = 'hidden';
      const pts: [number, number][] = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 2, r.top + 2], [r.right - 2, r.top + 2], [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2]];
      const hit = pts.some(([x, y]) => (document.elementsFromPoint(x, y) as HTMLElement[]).some((el) => el.closest(COVERS) && !el.closest('.wa-fab')));
      fab.style.visibility = prev;
      setCovering(hit);
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(check, 160); };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => { clearTimeout(timer); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, []);

  const away = dir === 'down' || typing || covering;
  return (
    <a ref={ref} className={`wa-fab${away ? ' away' : ''}`} href={waLink(site.whatsapp)} target="_blank" rel="noopener"
      aria-label={t.whatsapp} data-testid="whatsapp-fab" aria-hidden={away || undefined} tabIndex={away ? -1 : undefined}>
      <Icon name="whatsapp" size={24} />
    </a>
  );
}
