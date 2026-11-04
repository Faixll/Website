'use client';

import { motion, useScroll } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { site } from '@/config/site';
import type { CategoryId } from '@/data/catalog';
import { CategoryChips } from './Chips';
import { CartButton, LangToggle } from './Chrome';
import { Icon } from './Icon';
import { RewardsChip } from './Rewards';
import { SearchBox } from './SearchBox';
import { useStore } from './StoreProvider';

/**
 * One header, made responsive with CSS (rendered once):
 * - phone (<768px): a single 56px row — mark + name, rewards chip (when enabled), language. Search and cart live in the tab bar.
 * - tablet/desktop: horizontal logo, search, account, language, cart. Category chips sit below it (`chips`).
 * A 3px red scroll-progress bar runs along its top; after 40px of scroll the logo shrinks and the background blurs.
 */
export function SiteHeader({ q, activeCat, chips = false }: { q?: string; activeCat?: CategoryId; chips?: boolean }) {
  const { t, lang } = useStore();
  const [compact, setCompact] = useState(false);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const on = () => setCompact(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <>
      <header className={`site-header${compact ? ' compact' : ''}`} data-testid="site-header">
        <motion.div className="scroll-progress" style={{ scaleX: scrollYProgress }} aria-hidden />
        <div className="container bar">
          <Link href={`/${lang}`} className="logo" aria-label={site.name[lang]}>
            <img className="mark" src={site.brand.mark} alt="" width={36} height={36} />
            <span className="name">{site.shortName[lang]}</span>
            <img className="wordmark" src={site.brand.logo} alt="" width={107} height={44} />
          </Link>
          <div className="desk-only search-slot" style={{ flex: 1 }}><SearchBox initial={q} /></div>
          <div className="header-actions">
            <RewardsChip />
            <Link href={`/${lang}/profile`} className="icon-btn desk-only" aria-label={t.tabProfile} data-testid="header-account">
              <Icon name="user" size={22} />
            </Link>
            <LangToggle />
            <span className="desk-only"><CartButton /></span>
          </div>
        </div>
      </header>
      {chips && (
        <div className="desk-chips">
          <div className="container"><CategoryChips mode="link" active={activeCat} /></div>
        </div>
      )}
    </>
  );
}
