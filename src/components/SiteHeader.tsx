'use client';

import { motion, useScroll } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { site } from '@/config/site';
import { CartButton, LangToggle } from './Chrome';
import { useScrollDirection } from './hooks';
import { Icon } from './Icon';
import { RewardsChip } from './Rewards';
import { useStore } from './StoreProvider';

/**
 * One header, made responsive with CSS (rendered once):
 * - phone (<768px): a single 56px row — mark + name, rewards chip (when enabled), language. Cart lives in the tab bar.
 * - tablet/desktop: horizontal logo, account, language, cart.
 * A 3px red scroll-progress bar runs along its top; after 40px of scroll the logo shrinks and the background blurs.
 * P1: the height never changes (the logo only scales), and on phones the whole bar slides away while the user
 * scrolls down and comes back on the way up (transform only).
 */
export function SiteHeader() {
  const { t, lang } = useStore();
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
            <span className="mark" aria-hidden style={{ backgroundImage: `url(${site.brand.mark})` }} />
            <span className="name">{site.shortName[lang]}</span>
            <span className="wordmark" aria-hidden style={{ backgroundImage: `url(${site.brand.logo})` }} />
          </Link>
          <div style={{ flex: 1 }} />
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
    </>
  );
}
