'use client';
/**
 * Motion helpers (motion/react). Only transform and opacity are animated, 150–450 ms.
 * P5: content is fully visible on first paint and without JavaScript. Reveal effects are applied only after
 * hydration and only to elements that start BELOW the fold — and they move (transform) rather than fade.
 */
import { motion, MotionConfig, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

export const EASE = [0.22, 1, 0.36, 1] as const;

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={{ duration: 0.3, ease: EASE }}>{children}</MotionConfig>;
}

/** 'static' (as rendered by the server) → 'hidden' (only if below the fold after hydration) → 'shown' when it enters. */
function useBelowFoldReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const reduce = useReducedMotion();
  const [state, setState] = useState<'static' | 'hidden' | 'shown'>('static');
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' });
  useEffect(() => {
    if (reduce || !ref.current) return;
    if (ref.current.getBoundingClientRect().top > window.innerHeight) setState('hidden');
  }, [reduce]);
  useEffect(() => { if (state === 'hidden' && inView) setState('shown'); }, [state, inView]);
  return { ref, state };
}

/** Cards: move up 16px into place (50 ms stagger by `index`), once. */
export function Reveal({ children, index = 0, className }: { children: React.ReactNode; index?: number; className?: string }) {
  const { ref, state } = useBelowFoldReveal<HTMLDivElement>();
  return (
    <motion.div ref={ref} className={className} initial={false}
      animate={state === 'hidden' ? { y: 16 } : { y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: state === 'shown' ? Math.min(index, 8) * 0.05 : 0 }}>
      {children}
    </motion.div>
  );
}

/** Section titles slide up out of a mask (below the fold only). */
export function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  const { ref, state } = useBelowFoldReveal<HTMLHeadingElement>();
  return (
    <h2 ref={ref} id={id} className="section-title">
      <span className="mask">
        <motion.span style={{ display: 'inline-block' }} initial={false} animate={state === 'hidden' ? { y: '105%' } : { y: 0 }} transition={{ duration: 0.45, ease: EASE }}>
          {children}
        </motion.span>
      </span>
    </h2>
  );
}

/**
 * A number/price that changes cleanly: the old value is replaced at once (never two numbers on top of each
 * other) and the new one rises 6px into place in 180 ms (transform only; reduced motion: no movement).
 */
export function AnimatedValue({ value, className }: { value: string; className?: string }) {
  return (
    <span className={`anim-num ${className ?? ''}`}>
      <span key={value} className="anim-num-in">{value}</span>
    </span>
  );
}
