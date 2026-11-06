'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { categories, type CategoryId } from '@/data/catalog';
import { scrollToId, useScrollDirection } from './hooks';
import { categoryIcon, Icon } from './Icon';
import { useStore } from './StoreProvider';

/** Height of the sticky chrome above the sections: header + chip bar (measured, with the CSS defaults as fallback). */
function chromeHeight() {
  const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 56;
  const bar = document.querySelector('.chip-bar')?.getBoundingClientRect().height ?? 64;
  return header + bar;
}

/** Holds the scroll-spy still until the page stops moving: `scrollend` where it exists, 800ms otherwise. */
function lockSpy(lock: { current: boolean }) {
  lock.current = true;
  let done = false;
  const release = () => {
    if (done) return;
    done = true;
    lock.current = false;
    window.removeEventListener('scrollend', release);
  };
  if ('onscrollend' in window) window.addEventListener('scrollend', release, { once: true });
  setTimeout(release, 800);
}

/**
 * The single category selector (compact pills, ≤64px high).
 * - mode "scroll" (home): highlights the section in view; tapping scrolls to it (smooth only for that tap).
 * - mode "filter" (search page): toggles the filter via onSelect.
 * - mode "link" (desktop header row on other pages): links to the category page.
 * `sticky`: sticks under the header. On phones it rides up to the top of the screen while the user scrolls
 * down (the header slides away at the same time) and drops back under the header on the way up — transform
 * only, so the page height never changes (P1).
 */
export function CategoryChips({
  mode, active, sticky, onSelect, withAll,
}: {
  mode: 'scroll' | 'filter' | 'link';
  active?: CategoryId | '';
  sticky?: boolean;
  onSelect?: (c: CategoryId | '') => void;
  withAll?: boolean;
}) {
  const { t, lang } = useStore();
  const [current, setCurrent] = useState<CategoryId | ''>(active ?? '');
  const rowRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef(false);
  const dir = useScrollDirection(240);

  useEffect(() => { if (mode !== 'scroll') setCurrent(active ?? ''); }, [mode, active]);

  // Scroll-spy (home): which category section is under the sticky bars.
  // The top margin is the real sticky chrome height, so the highlighted chip matches the section the user
  // sees under the bars. `lockRef` holds the spy still while a chip tap animates the page, otherwise the
  // highlight flickers through every section on the way (P1).
  useEffect(() => {
    if (mode !== 'scroll') return;
    const sections = categories.map((c) => document.getElementById(`cat-${c.id}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        if (lockRef.current) return;
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id.replace('cat-', '') as CategoryId);
      },
      { rootMargin: `-${Math.round(chromeHeight())}px 0px -55% 0px` },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [mode]);

  // Keep the highlighted chip visible INSIDE the strip only (scrollIntoView would also move the page — P1).
  useEffect(() => {
    const row = rowRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-cat="${current}"]`);
    if (!row || !chip) return;
    const r = row.getBoundingClientRect();
    const c = chip.getBoundingClientRect();
    if (c.left < r.left || c.right > r.right) row.scrollBy({ left: c.left - r.left - (r.width - c.width) / 2, behavior: 'auto' });
  }, [current]);

  const chip = (id: CategoryId | '', label: string) => {
    const isActive = current === id;
    const content = (
      <>
        <span className="bubble"><Icon name={id ? categoryIcon[id] : 'search'} weight={isActive ? 'fill' : 'regular'} size={20} /></span>
        <span className="caps">{label}</span>
      </>
    );
    if (mode === 'link' && id) {
      return <Link key={id} href={`/${lang}/search?cat=${id}`} className="chip" data-cat={id} aria-current={isActive ? 'page' : undefined}>{content}</Link>;
    }
    if (mode === 'scroll' && id) {
      return (
        <a key={id} href={`#cat-${id}`} className="chip" data-cat={id} aria-current={isActive ? 'true' : undefined}
          onClick={(e) => {
            e.preventDefault();
            setCurrent(id);
            lockSpy(lockRef);
            scrollToId(`cat-${id}`, chromeHeight() + 8);
          }}>{content}</a>
      );
    }
    return (
      <button key={id || 'all'} type="button" className="chip" data-cat={id || 'all'} aria-pressed={isActive}
        onClick={() => { setCurrent(id); onSelect?.(id); }}>{content}</button>
    );
  };

  const row = (
    <div className="chip-row" ref={rowRef}>
      {withAll && chip('', t.all)}
      {categories.map((c) => chip(c.id, c.name[lang]))}
    </div>
  );

  return (
    <nav aria-label={t.categories} data-testid="category-chips" className={sticky ? `chip-bar${dir === 'down' ? ' raised' : ''}` : undefined}>
      {sticky ? <div className="container">{row}</div> : row}
    </nav>
  );
}
