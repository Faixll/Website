'use client';
/**
 * P5: the first page load is never faded — content is fully visible on first paint. Only later client-side
 * navigations get a 150 ms entrance (the template re-mounts on every navigation).
 * The flag is set after the first commit (not during render), so React's double render can't flip it early.
 */
import { useEffect } from 'react';

let firstPageShown = false;

export default function Template({ children }: { children: React.ReactNode }) {
  const animate = firstPageShown;
  useEffect(() => { firstPageShown = true; }, []);
  return <div className={animate ? 'page-enter' : undefined}>{children}</div>;
}
