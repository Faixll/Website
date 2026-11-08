import { notFound } from 'next/navigation';

/** Any unknown address under /ar or /en shows the shop's own 404 page (not-found.tsx), in that language. */
export const dynamicParams = true;

export default function CatchAll() {
  notFound();
}
