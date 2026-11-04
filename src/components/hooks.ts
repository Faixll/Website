'use client';

import { useEffect, useState } from 'react';

/** 'down' while the user scrolls down (past `threshold`), 'up' when scrolling up or near the top. */
export function useScrollDirection(threshold = 80) {
  const [dir, setDir] = useState<'up' | 'down'>('up');
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const on = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < threshold) setDir('up');
        else if (Math.abs(y - last) > 6) setDir(y > last ? 'down' : 'up');
        last = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [threshold]);
  return dir;
}

/** True while a text field has focus (on-screen keyboard is likely up). */
export function useTyping() {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const isText = (el: EventTarget | null) =>
      el instanceof HTMLElement && el.matches('input:not([type=radio]):not([type=checkbox]):not([type=button]):not([type=submit]), textarea, select');
    const on = (e: FocusEvent) => { if (isText(e.target)) setTyping(true); };
    const off = () => setTimeout(() => { if (!isText(document.activeElement)) setTyping(false); }, 50);
    document.addEventListener('focusin', on);
    document.addEventListener('focusout', off);
    return () => { document.removeEventListener('focusin', on); document.removeEventListener('focusout', off); };
  }, []);
  return typing;
}

export function useMedia(query: string) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = matchMedia(query);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return m;
}

export const prefersReducedMotion = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Smooth scroll for one in-page jump only (never globally), instant under reduced motion. */
export function scrollToId(id: string, offset = 0) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}
