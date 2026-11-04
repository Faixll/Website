'use client';

import type { User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { accountsEnabled } from '@/lib/supabase/env';

export type Profile = { id: string; phone: string | null; name: string | null; role: 'customer' | 'staff'; points_balance: number };

type Account = {
  enabled: boolean;
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Account | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(accountsEnabled);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (u: User | null) => {
    const sb = await supabaseBrowser();
    if (!sb || !u) return setProfile(null);
    const { data } = await sb.from('profiles').select('id, phone, name, role, points_balance').eq('id', u.id).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    if (!accountsEnabled) return;
    let alive = true;
    let unsub = () => {};
    // Only load Supabase when this browser has (or may have) a session; guests never download it.
    const hasSession = document.cookie.includes('sb-') || /\/(account|staff)/.test(location.pathname);
    if (!hasSession) { setLoading(false); return; }
    supabaseBrowser().then(async (sb) => {
      if (!sb || !alive) return;
      const { data } = await sb.auth.getUser();
      if (!alive) return;
      setUser(data.user);
      await loadProfile(data.user);
      setLoading(false);
      const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
        setUser(session?.user ?? null);
        // Defer: calling Supabase inside this callback can deadlock the auth lock.
        setTimeout(() => loadProfile(session?.user ?? null), 0);
      });
      unsub = () => sub.subscription.unsubscribe();
    });
    return () => { alive = false; unsub(); };
  }, [loadProfile]);

  const value = useMemo<Account>(() => ({
    enabled: accountsEnabled,
    loading,
    user,
    profile,
    // Re-reads the session too, so signing in on the account page updates the whole site.
    refresh: async () => {
      const sb = await supabaseBrowser();
      if (!sb) return;
      const { data } = await sb.auth.getUser();
      setUser(data.user);
      await loadProfile(data.user);
    },
    signOut: async () => { await (await supabaseBrowser())?.auth.signOut(); setUser(null); setProfile(null); },
  }), [loading, user, profile, loadProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount() {
  const a = useContext(Ctx);
  if (!a) throw new Error('useAccount outside AccountProvider');
  return a;
}
