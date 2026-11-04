'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { site } from '@/config/site';
import { categories, type CategoryId } from '@/data/catalog';
import { CartButton, LangToggle } from './Chrome';
import { SearchBox } from './SearchBox';
import { useStore } from './StoreProvider';

/**
 * Header: logo, search, language, cart. On phones it shrinks (smaller logo, search moves to the Search tab)
 * after scrolling 40px. On tablet/desktop a category strip with thin dividers sits under it, sticky.
 */
export function SiteHeader({ q, activeCat, hideSearch }: { q?: string; activeCat?: CategoryId | 'all'; hideSearch?: boolean }) {
  const { t, lang } = useStore();
  const [compact, setCompact] = useState(false);
  const ref = useRef<HTMLElement>(null);
  // Publish the header height so other sticky bars (home category chips) sit right under it.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty("--header-real", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const on = () => setCompact(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header ref={ref} className={`site-header${compact ? ' compact' : ''}`} data-testid="site-header">
      <div className="container bar">
        <Link href={`/${lang}`} className="logo" aria-label={site.name[lang]}>
          <img src={site.logo} alt="" width={40} height={40} />
          <b>{site.shortName[lang]}</b>
        </Link>
        {!hideSearch && <SearchBox initial={q} />}
        <LangToggle />
        <CartButton />
      </div>
      <div className="cat-strip">
        <nav className="container" aria-label={t.categories} data-testid="category-nav">
          {categories.map((c) => (
            <Link key={c.id} href={`/${lang}/search?cat=${c.id}`} aria-current={activeCat === c.id ? 'page' : undefined}>
              {c.name[lang]}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
