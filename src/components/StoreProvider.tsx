'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Lang } from '@/config/site';
import { allowedCuts, productById, qtyRule, validQty, type CutId } from '@/data/catalog';
import { isListed } from '@/data/shop';
import { track } from '@/lib/analytics';
import { unitPrice } from '@/lib/pricing';
import { getDict, type Dict } from '@/lib/i18n';
import { lineKey, totals, type CartLine, type Fulfilment } from '@/lib/pricing';

export type Slot = { date: string; slotId: string } | null;

type Store = {
  lang: Lang;
  t: Dict;
  ready: boolean;
  lines: CartLine[];
  add: (l: Omit<CartLine, 'key' | 'qty'>, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  totals: ReturnType<typeof totals>;
  fulfilment: Fulfilment | null;
  setFulfilment: (f: Fulfilment | null) => void;
  slot: Slot;
  setSlot: (s: Slot) => void;
  lastOrder: CartLine[] | null;
  saveLastOrder: (l: CartLine[]) => void;
  cartOpen: boolean;
  setCartOpen: (o: boolean) => void;
  toast: string | null;
  showToast: (m: string) => void;
  /** Increments on every add-to-cart (drives the cart icon bounce and count pop). */
  addedTick: number;
};

const Ctx = createContext<Store | null>(null);
const maxFor = (productId: string) => { const p = productById(productId); return p ? qtyRule(p).max : 1; };
const KEY = 'hab-store-v1';

/** Drop lines whose product, size or cut no longer exists in the catalogue. */
/** Option ids were renamed to match data/products.json; carts saved before that keep working. */
const OLD_OPTION_IDS: Record<string, string> = { bone: 'bone-in', '5pc': '5', box6: '6', box12: '12' };

function sanitise(lines: unknown): CartLine[] {
  if (!Array.isArray(lines)) return [];
  return lines.flatMap((raw: CartLine) => {
    const l = raw && OLD_OPTION_IDS[raw.sizeId] ? { ...raw, sizeId: OLD_OPTION_IDS[raw.sizeId] } : raw;
    const p = productById(l?.productId);
    if (!p || !isListed(p.id) || !p.sizes.some((s) => s.id === l.sizeId) || !allowedCuts(p).includes(l.cutId)) return [];
    const qty = Number(l.qty);
    if (!validQty(p, qty)) return [];
    const notes = String(l.notes ?? '').slice(0, 200);
    return [{ ...l, notes, qty, key: lineKey(l.productId, l.sizeId, l.cutId, notes) }];
  });
}

export function StoreProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [fulfilment, setFulfilment] = useState<Fulfilment | null>(null);
  const [slot, setSlot] = useState<Slot>(null);
  const [lastOrder, setLastOrder] = useState<CartLine[] | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [addedTick, setAddedTick] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}');
      setLines(sanitise(raw.lines));
      setLastOrder(raw.lastOrder ? sanitise(raw.lastOrder) : null);
      if (raw.fulfilment) setFulfilment(raw.fulfilment);
      if (raw.slot) setSlot(raw.slot);
    } catch {
      /* storage unavailable: start empty */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ lines, lastOrder, fulfilment, slot }));
    } catch {
      /* ignore */
    }
  }, [ready, lines, lastOrder, fulfilment, slot]);

  const add = useCallback<Store['add']>((l, qty = 1) => {
    const key = lineKey(l.productId, l.sizeId, l.cutId, l.notes);
    setLines((prev) => {
      const found = prev.find((x) => x.key === key);
      const max = maxFor(l.productId);
      const sum = (a: number) => Math.round(Math.min(max, a) * 1000) / 1000; // 1.3 + 0.5 kg stays 1.8, not 1.7999…
      if (found) return prev.map((x) => (x.key === key ? { ...x, qty: sum(x.qty + qty) } : x));
      return [...prev, { ...l, notes: l.notes.trim(), key, qty: sum(qty) }];
    });
    setAddedTick((n) => n + 1);
    const p = productById(l.productId);
    if (p) {
      const price = unitPrice(p, l.sizeId, l.cutId);
      track({ name: 'add_to_cart', value: Math.round(price * qty * 100) / 100, items: [{ id: p.id, name: p.name.en, price, quantity: qty }] });
    }
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      qty <= 0 ? prev.filter((x) => x.key !== key) : prev.map((x) => (x.key === key ? { ...x, qty: Math.min(maxFor(x.productId), qty) } : x)),
    );
  }, []);

  const showToast = useCallback((m: string) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const value = useMemo<Store>(
    () => ({
      lang,
      t: getDict(lang),
      ready,
      lines,
      add,
      setQty,
      remove: (key) => setQty(key, 0),
      clear: () => setLines([]),
      totals: totals(lines, fulfilment),
      fulfilment,
      setFulfilment,
      slot,
      setSlot,
      lastOrder,
      saveLastOrder: (l) => setLastOrder(l),
      cartOpen,
      setCartOpen,
      toast,
      showToast,
      addedTick,
    }),
    [lang, ready, lines, add, setQty, fulfilment, slot, lastOrder, cartOpen, toast, showToast, addedTick],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}

/** Default line for a product card (first size, first cut, no notes). */
export function defaultLine(productId: string): { productId: string; sizeId: string; cutId: CutId; notes: string } | null {
  const p = productById(productId);
  if (!p) return null;
  return { productId, sizeId: p.sizes[0].id, cutId: allowedCuts(p)[0], notes: '' };
}
