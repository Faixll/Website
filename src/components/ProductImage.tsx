'use client';

import Image from 'next/image';
import { useState } from 'react';
import { site, type Lang } from '@/config/site';
import type { Product } from '@/data/catalog';
import manifest from '@/data/product-images.json';

const available = new Set<string>(manifest.images);
const illustrative = new Set<string>(manifest.illustrative);

/** Which image file to use: a per-option photo (e.g. hawar-local-boneless) if it exists, else the product photo. */
export function imageKey(p: Product, sizeId?: string) {
  if (sizeId && available.has(`${p.id}-${sizeId}`)) return `${p.id}-${sizeId}`;
  return available.has(p.id) ? p.id : null;
}
export const isIllustrative = (p: Product, sizeId?: string) => {
  const k = imageKey(p, sizeId);
  return !!k && illustrative.has(k);
};

/**
 * The one place product images are rendered: always a 1:1 slot from public/images/products/{id}.webp.
 * Until a real photo exists: a neutral placeholder (beige deep, the logo mark at 20%, the product name).
 * Real photos show a beige shimmer until loaded; the slot size never changes (no layout shift).
 */
export function ProductImage({
  p, lang, sizes, priority, large, small, sizeId,
}: { p: Product; lang: Lang; sizes: string; priority?: boolean; large?: boolean; small?: boolean; sizeId?: string }) {
  const [loaded, setLoaded] = useState(false);
  const key = imageKey(p, sizeId);
  const alt = p.image?.alt[lang] ?? p.name[lang];
  if (key) {
    return (
      <div className={`img-load${loaded ? ' loaded' : ''}`}>
        <Image src={`/images/products/${key}.webp`} alt={alt} fill sizes={sizes} priority={priority}
          loading={priority ? undefined : 'lazy'} style={{ objectFit: 'cover' }} onLoad={() => setLoaded(true)} />
      </div>
    );
  }
  return (
    <div className={`ph${large ? ' lg' : ''}${small ? ' sm' : ''}`} role="img" aria-label={alt}>
      <span className="ph-mark" aria-hidden style={{ backgroundImage: `url(${site.brand.mark})` }} />
      {!small && <span aria-hidden>{p.name[lang]}</span>}
    </div>
  );
}
