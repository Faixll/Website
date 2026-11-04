'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';
import { discountPct, qtyRule, wasPrice, type Product } from '@/data/catalog';
import { money } from '@/lib/format';
import { fromSize } from '@/lib/search';
import { Button } from './Button';
import { flyToCart } from './Chrome';
import { Icon } from './Icon';
import { EASE } from './Motion';
import { ProductImage } from './ProductImage';
import { defaultLine, useStore } from './StoreProvider';

export function StockBadges({ p, withDiscount = true }: { p: Product; withDiscount?: boolean }) {
  const { t } = useStore();
  const pct = discountPct(fromSize(p));
  return (
    <>
      {p.stock === 'out' && <span className="badge badge-out">{t.out}</span>}
      {p.stock !== 'out' && withDiscount && pct > 0 && <span className="badge badge-discount num" data-testid="discount-badge">{t.discountBadge(pct)}</span>}
      {p.stock !== 'out' && p.storage === 'fresh' && <span className="badge badge-fresh">{t.fresh}</span>}
      {p.stock !== 'out' && p.storage === 'frozen' && <span className="badge badge-frozen">{t.frozen}</span>}
      {p.stock === 'low' && <span className="badge badge-limited">{t.low}</span>}
    </>
  );
}

/** Unit under the price: "per kg", the pack name, or "per meal". */
export function unitText(p: Product, t: ReturnType<typeof useStore>['t'], lang: 'ar' | 'en') {
  if (p.unit === 'kg') return t.perKg;
  if (p.unit === 'meal') return t.perMeal;
  return fromSize(p).name[lang];
}

/** Round red quick-add (Button "quick"): adds the default option, Plus → Check with a short bounce, image flies to the cart. */
export function QuickAdd({ p, className, size = 22 }: { p: Product; className?: string; size?: number }) {
  const { t, lang, add, showToast } = useStore();
  const [done, setDone] = useState(false);
  const reduce = useReducedMotion();
  if (p.stock === 'out') return null;
  return (
    <Button
      variant="quick"
      className={`${className ?? ''}${done ? ' is-done' : ''}`}
      aria-label={`${t.add}: ${p.name[lang]}`}
      data-testid="quick-add"
      onClick={(e) => {
        e.preventDefault();
        add(defaultLine(p.id)!, qtyRule(p).def);
        flyToCart(e.currentTarget.closest('.card')?.querySelector<HTMLElement>('.media') ?? e.currentTarget);
        showToast(t.addedToCart);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={done ? 'check' : 'plus'}
          style={{ display: 'grid' }}
          initial={{ scale: reduce ? 1 : 0.6, opacity: 0 }}
          animate={{ scale: reduce ? 1 : [0.6, 1.15, 1], opacity: 1 }}
          exit={{ scale: reduce ? 1 : 0.6, opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          <Icon name={done ? 'check' : 'plus'} size={size} weight="bold" />
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}

export function ProductCard({ p, priority }: { p: Product; priority?: boolean }) {
  const { t, lang } = useStore();
  const s = fromSize(p);
  const multi = p.sizes.length > 1;
  return (
    <article className="card" data-testid="product-card" data-product={p.id}>
      <div className="media">
        <ProductImage p={p} lang={lang} sizes="(min-width: 1100px) 25vw, (min-width: 768px) 33vw, 50vw" priority={priority} />
        <div className="badges"><StockBadges p={p} /></div>
        <QuickAdd p={p} className="quick" />
      </div>
      <div className="body">
        <h3><Link href={`/${lang}/product/${p.id}`}>{p.name[lang]}</Link></h3>
        <div className="price-row">
          <span className="price num" data-testid="card-price">
            {multi && <>{t.from} </>}{money(s.price, lang)}
          </span>
          {wasPrice(s) != null && (
            <span className="was num"><span className="sr-only">{t.wasLabel} </span><s>{money(wasPrice(s)!, lang)}</s></span>
          )}
        </div>
        <span className="unit">{unitText(p, t, lang)}</span>
      </div>
    </article>
  );
}
