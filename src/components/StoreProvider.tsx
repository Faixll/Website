'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Lang } from '@/config/site';
import { productById, type CutId } from '@/data/catalog';
import { getDict, type Dict } from '@/lib/i18n';
import { lineKey, MAX_QTY, totals, type CartLine, type Fulfilment } from '@/lib/pricing';

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
};

const Ctx = createContext<Store | null>(null);
const KEY = 'hab-store-v1';

/** Drop lines whose product, size or cut no longer exists in the catalogue. */
function sanitise(lines: unknown): CartLine[] {
  if (!Array.isArray(lines)) return [];
  return lines.flatMap((l: CartLine) => {
    const p = productById(l?.productId);
    if (!p || !p.sizes.some((s) => s.id === l.sizeId) || !p.cuts.includes(l.cutId)) return [];
    const qty = Math.min(MAX_QTY, Math.max(1, Math.floor(Number(l.qty) || 1)));
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
      if (found) return prev.map((x) => (x.key === key ? { ...x, qty: Math.min(MAX_QTY, x.qty + qty) } : x));
      return [...prev, { ...l, notes: l.notes.trim(), key, qty: Math.min(MAX_QTY, qty) }];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      qty <= 0 ? prev.filter((x) => x.key !== key) : prev.map((x) => (x.key === key ? { ...x, qty: Math.min(MAX_QTY, qty) } : x)),
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
    }),
    [lang, ready, lines, add, setQty, fulfilment, slot, lastOrder, cartOpen, toast, showToast],
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
  return { productId, sizeId: p.sizes[0].id, cutId: p.cuts[0], notes: '' };
}
