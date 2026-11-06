'use client';
/**
 * Signed-in customer (rewards). Does nothing while rewards are switched off — guests never fetch anything.
 * The session is an httpOnly cookie; the browser only learns name, phone and points from /api/me.
 */
import dynamic from 'next/dynamic';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useFeatures } from './Features';

export type Me = { id: string; firstName: string; phone: string; points: number };
export type MyOrder = { id: string; status: string; total: number; createdAt: string; pointsEarnable: number };

type Account = {
  enabled: boolean;
  loading: boolean;
  me: Me | null;
  orders: MyOrder[];
  reviewable: string[];
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Opens the sign-in sheet; `then` runs after a successful sign-in. */
  openSignIn: (then?: () => void) => void;
};

const Ctx = createContext<Account | null>(null);
const SignInSheet = dynamic(() => import('./SignInSheet').then((m) => m.SignInSheet), { ssr: false });

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { rewards } = useFeatures();
  const [loading, setLoading] = useState(rewards);
  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [reviewable, setReviewable] = useState<string[]>([]);
  const [sheet, setSheet] = useState<{ then?: () => void } | null>(null);

  const refresh = useCallback(async () => {
    if (!rewards) return;
    try {
      const r = await fetch('/api/me', { cache: 'no-store' });
      const d = r.ok ? await r.json() : { customer: null };
      setMe(d.customer ?? null);
      setOrders(d.orders ?? []);
      setReviewable(d.reviewable ?? []);
    } catch {
      /* offline: stay as we are */
    } finally {
      setLoading(false);
    }
  }, [rewards]);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo<Account>(() => ({
    enabled: rewards,
    loading,
    me,
    orders,
    reviewable,
    refresh,
    signOut: async () => {
      await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {});
      setMe(null); setOrders([]); setReviewable([]);
    },
    openSignIn: (then) => { if (rewards) setSheet({ then }); },
  }), [rewards, loading, me, orders, reviewable, refresh]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {sheet && (
        <SignInSheet
          onClose={() => setSheet(null)}
          onDone={async () => { const then = sheet.then; setSheet(null); await refresh(); then?.(); }}
        />
      )}
    </Ctx.Provider>
  );
}

export function useAccount() {
  const a = useContext(Ctx);
  if (!a) throw new Error('useAccount outside AccountProvider');
  return a;
}
