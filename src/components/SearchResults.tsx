'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { site } from '@/config/site';
import { categories } from '@/data/catalog';
import { waLink } from '@/lib/format';
import { applyFilters, type Filters } from '@/lib/search';
import { ButtonLink } from './Button';
import { CategoryChips } from './Chips';
import { Icon } from './Icon';
import { Reveal } from './Motion';
import { ProductCard } from './ProductCard';
import { useStore } from './StoreProvider';

/**
 * Search + category page. Typing filters every product live (Arabic search ignores diacritics and treats
 * أ/إ/آ/ا, ى/ي and ة/ه as the same; English ignores case). No filter sidebar — only category chips and sort.
 */
export function SearchResults({ initial, autoFocus }: { initial: Filters; autoFocus?: boolean }) {
  const { t, lang } = useStore();
  const pathname = usePathname();
  const [f, setF] = useState<Filters>(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  const initialKey = JSON.stringify(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setF(initial), [initialKey]);
  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);

  const results = useMemo(() => applyFilters(f, lang), [f, lang]);

  const update = (patch: Partial<Filters>) => {
    const next = { ...f, ...patch };
    setF(next);
    const sp = new URLSearchParams();
    if (next.q) sp.set('q', next.q);
    if (next.cat) sp.set('cat', next.cat);
    if (next.sort !== 'relevance') sp.set('sort', next.sort);
    const qs = sp.toString();
    // Shallow URL update (no server round-trip), so fast typing is never overwritten.
    window.history.replaceState(null, '', `${pathname}${qs ? `?${qs}` : ''}`);
  };

  const title = f.cat ? categories.find((c) => c.id === f.cat)!.name[lang] : f.q ? t.resultsFor(f.q) : t.allProducts;

  return (
    <div className="search-page">
      <div className="search">
        <form role="search" onSubmit={(e) => { e.preventDefault(); inputRef.current?.blur(); }}>
          <label htmlFor="search-page-input" className="sr-only">{t.searchLabel}</label>
          <Icon name="search" size={20} className="s-icon" />
          <input id="search-page-input" ref={inputRef} className="input" type="search" enterKeyHint="search" autoComplete="off"
            placeholder={t.searchPlaceholder} value={f.q} onChange={(e) => update({ q: e.target.value.slice(0, 80) })} data-testid="search-input" />
        </form>
      </div>

      <div style={{ marginTop: 'var(--s4)' }}>
        <CategoryChips mode="filter" withAll active={f.cat} onSelect={(c) => update({ cat: c && c === f.cat ? '' : c })} />
      </div>

      <div className="results-bar">
        <div>
          <h1 style={{ fontSize: 26 }}>{title}</h1>
          <p className="muted" aria-live="polite" data-testid="result-count">{t.nResults(results.length)}</p>
        </div>
        <div>
          <label htmlFor="sort" className="sr-only">{t.sort}</label>
          <select id="sort" className="select" value={f.sort} onChange={(e) => update({ sort: e.target.value as Filters['sort'] })}>
            <option value="relevance">{t.sortRelevance}</option>
            <option value="price-asc">{t.sortPriceAsc}</option>
            <option value="price-desc">{t.sortPriceDesc}</option>
            <option value="name">{t.sortName}</option>
          </select>
        </div>
      </div>

      {results.length ? (
        <div className="grid" data-testid="results">{results.map((p, i) => <Reveal key={p.id} index={i}><ProductCard p={p} priority={i < 2} /></Reveal>)}</div>
      ) : (
        <div className="empty" data-testid="no-results">
          <Icon name="search" size={32} />
          <p>{t.noResults}</p>
          <ButtonLink variant="secondary" href={waLink(site.whatsapp, f.q)} external icon="whatsapp">{t.noResultsWa}</ButtonLink>
        </div>
      )}
    </div>
  );
}
