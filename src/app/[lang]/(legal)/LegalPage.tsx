import type { Lang } from '@/config/site';
import { SiteHeader } from '@/components/SiteHeader';
import { getDict } from '@/lib/i18n';

/**
 * Placeholder legal page. TODO (business): write the real Terms / Privacy / Refund text.
 * Claude did not write legal text on purpose.
 */
export function LegalPage({ lang, title }: { lang: Lang; title: string }) {
  const t = getDict(lang);
  return (
    <>
      <SiteHeader chips />
      <main id="main" className="container section" style={{ paddingTop: 'var(--s5)' }}>
        <article className="prose">
          <h1>{title}</h1>
          <p className="muted">{t.legalTodo}</p>
        </article>
      </main>
    </>
  );
}
