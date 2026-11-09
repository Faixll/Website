'use client';

import { motion, useScroll } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { site } from '@/config/site';
import { HeaderCart, LangToggle } from './Chrome';
import { useScrollDirection } from './hooks';
import { RewardsChip } from './Rewards';
import { useStore } from './StoreProvider';

/**
 * One header, made responsive with CSS (rendered once):
 * - phone (<768px): a single 56px row — round logo, rewards chip (when enabled), language. Cart lives in the tab bar.
 * - tablet/desktop: round logo, language. Home / cart / profile live in the side rail (the same tab bar, on the side).
 * A 3px red scroll-progress bar runs along its top; after 40px of scroll the logo shrinks and the background blurs.
 * P1: the height never changes (the logo only scales), and on phones the whole bar slides away while the user
 * scrolls down and comes back on the way up (transform only).
 */
export function SiteHeader() {
  const { lang, t } = useStore();
  const [compact, setCompact] = useState(false);
  const dir = useScrollDirection(240);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const on = () => setCompact(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <>
      <header className={`site-header${compact ? ' compact' : ''}${dir === 'down' ? ' hide' : ''}`} data-testid="site-header">
        <motion.div className="scroll-progress" style={{ scaleX: scrollYProgress }} aria-hidden />
        <div className="container bar">
          <Link href={`/${lang}`} className="logo" aria-label={site.name[lang]}>
            {/* One logo only: the client's master round logo (their README: header at 44–56 px), phone and desktop. */}
            <span className="mark" aria-hidden style={{ backgroundImage: `url(${site.brand.round})` }} />
          </Link>
          {/* Wider than 700px: page links. Phones keep the bottom tab bar instead. */}
          <nav className="header-nav" aria-label={t.mainNav}>
            <a href={`/${lang}#top`}>{t.tabHome}</a>
            <a href={`/${lang}#products`}>{t.ourProducts}</a>
            <a href={`/${lang}#branch`}>{t.ourBranches}</a>
            <a href="#contact">{t.contactUs}</a>
          </nav>
          <div className="header-actions">
            <RewardsChip />
            <LangToggle />
            <HeaderCart />
          </div>
        </div>
      </header>
    </>
  );
}
