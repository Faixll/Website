'use client';

import { createContext, useContext } from 'react';

/**
 * Feature switches decided on the server (env vars) and handed to the browser.
 * - rewards: REWARDS_ENABLED=true AND a database AND a way to send sign-in codes are configured.
 * - reviewsWrite: customers can write reviews (needs the same sign-in).
 */
export type Features = { rewards: boolean; reviewsWrite: boolean };

const Ctx = createContext<Features>({ rewards: false, reviewsWrite: false });

export function FeaturesProvider({ value, children }: { value: Features; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useFeatures = () => useContext(Ctx);
