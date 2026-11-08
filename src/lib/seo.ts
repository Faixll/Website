import type { Lang } from '@/config/site';

/** Canonical URL + Arabic/English alternates for a page path (without the language), e.g. '/stores'. */
export function alternates(lang: Lang, path = '') {
  return {
    canonical: `/${lang}${path}`,
    languages: { ar: `/ar${path}`, en: `/en${path}`, 'x-default': `/ar${path}` },
  };
}
