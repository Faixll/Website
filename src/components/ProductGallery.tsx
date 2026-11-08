'use client';
/**
 * Product page photo. When a product has more than one photo (e.g. the beef burger kit: closed, open, ingredients),
 * small thumbnails under it switch the big photo. One photo → just the photo.
 */
import { useState } from 'react';
import type { Lang } from '@/config/site';
import type { Product } from '@/data/catalog';
import { galleryOf, ProductImage } from './ProductImage';
import { useStore } from './StoreProvider';

export function ProductGallery({ p, lang }: { p: Product; lang: Lang }) {
  const { t } = useStore();
  const photos = galleryOf(p);
  const [current, setCurrent] = useState(photos[0]);
  return (
    <div className="pdp-gallery">
      <div className="pdp-photo">
        <ProductImage p={p} lang={lang} sizes="(min-width: 900px) 50vw, 100vw" priority large imageId={current} />
      </div>
      {photos.length > 1 && (
        <div className="pdp-thumbs" role="group" aria-label={t.photos}>
          {photos.map((k, i) => (
            <button key={k} type="button" className="pdp-thumb" aria-pressed={k === current} aria-label={t.photoN(i + 1, photos.length)}
              onClick={() => setCurrent(k)} data-testid="gallery-thumb">
              <ProductImage p={p} lang={lang} sizes="96px" imageId={k} small />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
