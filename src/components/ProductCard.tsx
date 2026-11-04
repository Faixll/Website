'use client';

import Link from 'next/link';
import { productImage, unitLabel, wasPrice, type Product } from '@/data/catalog';
import { money } from '@/lib/format';
import { lineKey } from '@/lib/pricing';
import { fromPrice, fromSize } from '@/lib/search';
import { Icon } from './Icon';
import { Stepper } from './Stepper';
import { WasPrice } from './WasPrice';
import { defaultLine, useStore } from './StoreProvider';

export function StockBadges({ p }: { p: Product }) {
  const { t } = useStore();
  return (
    <>
      {p.stock === 'out' ? (
        <span className="badge badge-out">{t.out}</span>
      ) : (
        <span className={`badge ${p.storage === 'fresh' ? 'badge-fresh' : 'badge-frozen'}`}>{p.storage === 'fresh' ? t.fresh : t.frozen}</span>
      )}
      {p.stock === 'low' && <span className="badge badge-low">{t.low}</span>}
    </>
  );
}

/**
 * "Add" button that becomes a quantity stepper once the product's default option is in the cart.
 * Products with several sizes still add their first size; the product page offers the full choice.
 */
export function AddControl({ product: p, compact }: { product: Product; compact?: boolean }) {
  const { t, lang, lines, add, setQty, ready, showToast } = useStore();
  const d = defaultLine(p.id)!;
  const key = lineKey(d.productId, d.sizeId, d.cutId, d.notes);
  const qty = ready ? lines.find((l) => l.key === key)?.qty ?? 0 : 0;

  if (p.stock === 'out') {
    return (
      <Link href={`/${lang}/product/${p.id}#notify`} className={`btn btn-ghost${compact ? '' : ''}`} style={{ paddingInline: 12, fontSize: 14 }}>
        <Icon name="bell" />
        {compact ? <span className="sr-only">{t.notifyMe}</span> : t.notifyMe}
      </Link>
    );
  }
  if (qty > 0) return <Stepper qty={qty} onChange={(q) => setQty(key, q)} label={p.name[lang]} />;
  return (
    <button
      type="button"
      className="btn btn-primary"
      style={{ paddingInline: compact ? 12 : 16 }}
      onClick={() => { add(d); showToast(t.addedToCart); }}
      aria-label={`${t.add}: ${p.name[lang]}`}
    >
      <Icon name="plus" />
      {t.add}
    </button>
  );
}

export function ProductCard({ p, priority }: { p: Product; priority?: boolean }) {
  const { t, lang } = useStore();
  const multi = p.sizes.length > 1;
  return (
    <article className={`card${p.stock === 'out' ? ' is-out' : ''}`}>
      <div className="media">
        <img src={productImage(p)} alt="" width={400} height={300} loading={priority ? 'eager' : 'lazy'} decoding="async" />
        <div className="badges"><StockBadges p={p} /></div>
      </div>
      <div className="body">
        <h3><Link href={`/${lang}/product/${p.id}`}>{p.name[lang]}</Link></h3>
        <p className="meta">{p.sizes[0].name[lang]}{multi ? ` · ${t.moreSizes(p.sizes.length - 1)}` : ` · ${p.origin[lang]}`}</p>
        <div className="foot">
          <p className="price num">
            {multi && <small>{t.from} </small>}
            {money(fromPrice(p), lang)}
            <span className="sr-only"> {t.per} {unitLabel[p.unit][lang]}</span>
            <WasPrice amount={wasPrice(fromSize(p))} />
          </p>
          <AddControl product={p} />
        </div>
      </div>
    </article>
  );
}
