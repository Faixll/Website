'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { wasPrice } from '@/data/catalog';
import { money } from '@/lib/format';
import { fromPrice, fromSize, searchCategories, searchProducts } from '@/lib/search';
import { categoryIcon, Icon } from './Icon';
import { ProductImage } from './ProductImage';
import { QuickAdd } from './ProductCard';
import { useStore } from './StoreProvider';
import { WasPrice } from './WasPrice';

export function SearchBox({ initial = '' }: { initial?: string }) {
  const { t, lang } = useStore();
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrap = useRef<HTMLDivElement>(null);
  const listId = useId();

  const query = q.trim();
  const cats = useMemo(() => searchCategories(query, lang).slice(0, 3), [query, lang]);
  const prods = useMemo(() => (query ? searchProducts(query).slice(0, 6) : []), [query]);
  const options = [
    ...cats.map((c) => ({ id: `${listId}-c-${c.id}`, href: `/${lang}/search?cat=${c.id}` })),
    ...prods.map((p) => ({ id: `${listId}-p-${p.id}`, href: `/${lang}/product/${p.id}` })),
  ];

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  useEffect(() => setActive(-1), [query]);

  const go = (href: string) => { setOpen(false); router.push(href); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(options.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1); }
    else if (e.key === 'Enter' && active >= 0 && options[active]) { e.preventDefault(); go(options[active].href); }
  };

  const hl = (text: string) => {
    if (!query) return text;
    const i = text.toLowerCase().indexOf(query.toLowerCase());
    if (i < 0) return text;
    return <>{text.slice(0, i)}<mark>{text.slice(i, i + query.length)}</mark>{text.slice(i + query.length)}</>;
  };

  const showPanel = open && query.length > 0;

  return (
    <div className="search" ref={wrap}>
      <form
        role="search"
        action={`/${lang}/search`}
        onSubmit={(e) => { e.preventDefault(); go(`/${lang}/search${query ? `?q=${encodeURIComponent(query)}` : ''}`); }}
      >
        <label htmlFor={`${listId}-input`} className="sr-only">{t.searchLabel}</label>
        <Icon name="search" size={20} className="s-icon" />
        <input
          id={`${listId}-input`}
          className="input"
          type="search"
          name="q"
          value={q}
          placeholder={t.searchPlaceholder}
          autoComplete="off"
          enterKeyHint="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? options[active]?.id : undefined}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {q && (
          <button type="button" className="icon-btn s-clear" style={{ border: 0, background: 'none' }} aria-label={t.close} onClick={() => { setQ(''); setOpen(false); }}>
            <Icon name="close" size={20} />
          </button>
        )}
      </form>

      {showPanel && (
        <div className="suggest" id={listId} role="listbox" aria-label={t.searchLabel}>
          {cats.length > 0 && (
            <div className="s-group" role="group" aria-label={t.categories}>
              <div className="s-title" aria-hidden>{t.categories}</div>
              {cats.map((c, i) => (
                <Link key={c.id} id={options[i].id} role="option" aria-selected={active === i} className="s-cat" href={options[i].href} onClick={() => setOpen(false)}>
                  <Icon name={categoryIcon[c.id]} size={20} />
                  {hl(c.name)}
                </Link>
              ))}
            </div>
          )}
          {prods.length > 0 ? (
            <div className="s-group" role="group" aria-label={t.products}>
              <div className="s-title" aria-hidden>{t.products}</div>
              {prods.map((p, j) => {
                const i = cats.length + j;
                return (
                  <div key={p.id} id={options[i].id} role="option" aria-selected={active === i} className="s-item">
                    <span className="s-thumb" style={{ position: 'relative', overflow: 'hidden' }}><ProductImage p={p} lang={lang} sizes="44px" /></span>
                    <Link href={options[i].href} onClick={() => setOpen(false)} tabIndex={-1}>
                      <span className="s-name">{hl(p.name[lang])}</span>
                      <span className="s-price num">{p.stock === 'out' ? t.out : <>{`${p.sizes.length > 1 ? t.from + ' ' : ''}${money(fromPrice(p), lang)}`} <WasPrice amount={wasPrice(fromSize(p))} /></>}</span>
                    </Link>
                    <QuickAdd p={p} size={20} />
                  </div>
                );
              })}
            </div>
          ) : (
            cats.length === 0 && <p className="s-empty">{t.noResults}</p>
          )}
          <Link className="s-all" href={`/${lang}/search?q=${encodeURIComponent(query)}`} onClick={() => setOpen(false)}>
            {t.seeAll(query)}
          </Link>
        </div>
      )}
    </div>
  );
}
