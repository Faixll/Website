'use client';
/**
 * Bottom sheet on phones (spring in, drag down to close), side panel on desktop. Focus is trapped inside,
 * Escape closes, the page behind doesn't scroll. Under reduced motion it only fades (100 ms).
 */
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useRef } from 'react';
import { useMedia } from './hooks';
import { Icon } from './Icon';
import { useStore } from './StoreProvider';

export function Sheet({ open, onClose, title, children, footer, testId }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; testId?: string;
}) {
  const { t, lang } = useStore();
  const reduce = useReducedMotion();
  const desktop = useMedia('(min-width: 768px)');
  const panelRef = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    const first = panelRef.current?.querySelector<HTMLElement>('input, button:not([aria-label])') ?? panelRef.current?.querySelector<HTMLElement>('button');
    setTimeout(() => first?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), textarea');
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  const side = lang === 'ar' ? -1 : 1;
  const hidden = desktop ? { x: `${100 * side}%` } : { y: '100%' };
  const motionProps = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.1 } }
    : { initial: hidden, animate: { x: 0, y: 0 }, exit: hidden, transition: { type: 'spring' as const, stiffness: 420, damping: 40 } };

  return (
    <AnimatePresence>
      {open && (
        <div className="drawer" role="dialog" aria-modal="true" aria-labelledby={id} data-testid={testId}>
          <motion.button className="scrim" aria-label={t.close} tabIndex={-1} onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
          <motion.div className="panel" ref={panelRef} {...motionProps}
            drag={!desktop && !reduce ? 'y' : false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onClose(); }}>
            <div className="grab" aria-hidden />
            <header>
              <h2 id={id} style={{ fontSize: 20 }}>{title}</h2>
              <button className="icon-btn" onClick={onClose} aria-label={t.close}><Icon name="close" size={20} /></button>
            </header>
            <div className="body-scroll" onPointerDownCapture={(e) => e.stopPropagation()}>{children}</div>
            {footer && <footer>{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
