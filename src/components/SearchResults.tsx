'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { categories } from '@/data/catalog';
import { applyFilters, type Filters } from '@/lib/search';
import { Icon } from './Icon';
import { ProductCard } from './ProductCard';
import { useStore } from './StoreProvider';

export function SearchResults({ initial }: { initial: Filters }) {
  const { t, lang } = useStore();
  const pathname = usePathname();
  const [f, setF] = useState<Filters>(initial);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Header search / category tabs navigate with new params: follow them.
  const initialKey = JSON.stringify(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setF(initial), [initialKey]);

  const results = useMemo(() => applyFilters(f, lang), [f, lang]);

  const update = (patch: Partial<Filters>) => {
    const next = { ...f, ...patch };
    setF(next);
    const sp = new URLSearchParams();
    if (next.q) sp.set('q', next.q);
    if (next.cat) sp.set('cat', next.cat);
    if (next.storage) sp.set('storage', next.storage);
    if (next.min != null) sp.set('min', String(next.min));
    if (next.max != null) sp.set('max', String(next.max));
    if (next.inStock) sp.set('stock', '1');
    if (next.sort !== 'relevance') sp.set('sort', next.sort);
    const qs = sp.toString();
    // Shallow URL update (no server round-trip), so fast typing in the price fields is never overwritten.
    window.history.replaceState(null, '', `${pathname}${qs ? `?${qs}` : ''}`);
  };

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('button, input')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  const num = (v: string) => (v === '' ? null : Math.max(0, Number(v)));
  const activeCount = [f.cat, f.storage, f.min != null, f.max != null, f.inStock].filter(Boolean).length;

  return (
    <div className="search-layout">
      <div
        className={`filters${open ? ' open' : ''}`}
        ref={panelRef}
        role={open ? 'dialog' : undefined}
        aria-modal={open || undefined}
        aria-label={t.filters}
      >
        <div className="f-head">
          <h2 style={{ fontSize: 18 }}>{t.filters}</h2>
          <button type="button" className="icon-btn f-head-close" onClick={() => setOpen(false)} aria-label={t.close}><Icon name="close" /></button>
        </div>

        <fieldset>
          <legend>{t.category}</legend>
          <label className="check"><input type="radio" name="cat" checked={!f.cat} onChange={() => update({ cat: '' })} />{t.all}</label>
          {categories.map((c) => (
            <label key={c.id} className="check">
              <input type="radio" name="cat" checked={f.cat === c.id} onChange={() => update({ cat: c.id })} />
              {c.name[lang]}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>{t.storage}</legend>
          {(['', 'fresh', 'frozen'] as const).map((s) => (
            <label key={s || 'all'} className="check">
              <input type="radio" name="storage" checked={f.storage === s} onChange={() => update({ storage: s })} />
              {s === '' ? t.all : s === 'fresh' ? t.fresh : t.frozen}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>{t.price} <span className="muted" style={{ fontWeight: 400 }}>(AED)</span></legend>
          <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field">
              <label htmlFor="pmin" style={{ fontWeight: 400 }}>{t.minPrice}</label>
              <input id="pmin" className="input num" type="number" inputMode="decimal" min={0} value={f.min ?? ''} onChange={(e) => update({ min: num(e.target.value) })} />
            </div>
            <div className="field">
              <label htmlFor="pmax" style={{ fontWeight: 400 }}>{t.maxPrice}</label>
              <input id="pmax" className="input num" type="number" inputMode="decimal" min={0} value={f.max ?? ''} onChange={(e) => update({ max: num(e.target.value) })} />
            </div>
          </div>
        </fieldset>

        <label className="check">
          <input type="checkbox" checked={f.inStock} onChange={(e) => update({ inStock: e.target.checked })} />
          {t.inStockOnly}
        </label>

        <div className="f-actions">
          <button type="button" className="btn btn-ghost" onClick={() => update({ cat: '', storage: '', min: null, max: null, inStock: false })}>{t.clearFilters}</button>
          <button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>{t.showResults(results.length)}</button>
        </div>
      </div>

      <div>
        <div className="results-bar">
          <div>
            <h1 style={{ fontSize: 22 }}>{f.q ? t.resultsFor(f.q) : f.cat ? categories.find((c) => c.id === f.cat)!.name[lang] : t.allProducts}</h1>
            <p className="muted" aria-live="polite">{t.nResults(results.length)}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-ghost filter-toggle" onClick={() => setOpen(true)} aria-expanded={open}>
              <Icon name="filter" />{t.filters}{activeCount > 0 && <span className="badge badge-fresh num">{activeCount}</span>}
            </button>
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
          <div className="grid">{results.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 2} />)}</div>
        ) : (
          <div className="empty">
            <Icon name="search" />
            <p>{t.noResults}</p>
            {activeCount > 0 && (
              <button type="button" className="btn btn-outline" onClick={() => update({ cat: '', storage: '', min: null, max: null, inStock: false })}>{t.clearFilters}</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
