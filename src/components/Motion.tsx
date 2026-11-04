'use client';
/**
 * Motion helpers (motion/react). Only transform and opacity are animated, 150–400 ms.
 * Under prefers-reduced-motion, MotionConfig strips transforms and keeps short opacity fades.
 */
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react';

export const EASE = [0.22, 1, 0.36, 1] as const;

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={{ duration: 0.3, ease: EASE }}>{children}</MotionConfig>;
}

/** Fade up 12px once when scrolled into view; `index` staggers siblings by 40 ms. */
export function Reveal({ children, index = 0, as = 'div', className, ...rest }: { children: React.ReactNode; index?: number; as?: 'div' | 'section' | 'li'; className?: string } & Record<string, unknown>) {
  const reduce = useReducedMotion();
  const C = motion[as];
  return (
    <C
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.35, ease: EASE, delay: reduce ? 0 : Math.min(index, 8) * 0.04 }}
      {...rest}
    >
      {children}
    </C>
  );
}

/** A number/price that slides and fades when it changes (200 ms). */
export function AnimatedValue({ value, className }: { value: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={`anim-num ${className ?? ''}`} style={{ position: 'relative', display: 'inline-grid' }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ opacity: 0, y: reduce ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduce ? 0 : -6 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
