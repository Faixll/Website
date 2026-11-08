/**
 * What the shop shows. The client decided (2026-11-09): a product without a photo is hidden until its photo is
 * added (no placeholders on the site). The catalogue itself (names, prices, options) is unchanged in catalog.ts;
 * adding images-raw/{id}.jpg and running `node scripts/process-images.mjs` brings the product back automatically.
 */
import { productById, products, type Product } from './catalog';
import manifest from './product-images.json';

const photos = new Set<string>(manifest.images);

/** Products on sale on the site (in catalogue order). */
export const shopProducts: Product[] = products.filter((p) => photos.has(p.id));

/** Hidden products (no photo yet) — listed in the report so the client knows what to send. */
export const hiddenProducts: Product[] = products.filter((p) => !photos.has(p.id));

export const isListed = (id: string) => photos.has(id) && !!productById(id);

/** A listed product by id, or undefined (hidden or unknown). */
export const listedProduct = (id: string) => (isListed(id) ? productById(id) : undefined);
