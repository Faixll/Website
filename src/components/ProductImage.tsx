import Image from 'next/image';
import type { Lang } from '@/config/site';
import type { Product } from '@/data/catalog';

/**
 * The one place product images are rendered. Real photos come from `product.image` (in /public/products);
 * until they exist a clean neutral placeholder with the product name is shown on beige.
 * Always fills a square (or whatever the parent box is) so the layout never jumps.
 */
export function ProductImage({ p, lang, sizes, priority, large }: { p: Product; lang: Lang; sizes: string; priority?: boolean; large?: boolean }) {
  if (p.image) {
    return <Image src={p.image.src} alt={p.image.alt[lang]} fill sizes={sizes} priority={priority} style={{ objectFit: 'cover' }} />;
  }
  return (
    <div className={`ph${large ? ' lg' : ''}`} role="img" aria-label={p.name[lang]}>
      <span aria-hidden>{p.name[lang]}</span>
    </div>
  );
}
