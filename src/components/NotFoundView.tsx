'use client';

import { site } from '@/config/site';
import { waLink } from '@/lib/format';
import { ButtonLink } from './Button';
import { useStore } from './StoreProvider';

export function NotFoundView() {
  const { t, lang } = useStore();
  return (
    <div className="empty not-found" data-testid="not-found">
      <span className="nf-mark" aria-hidden style={{ backgroundImage: `url(${site.brand.mark})` }} />
      <p className="nf-code num" aria-hidden>404</p>
      <h1>{t.notFoundTitle}</h1>
      <p className="muted">{t.notFoundText}</p>
      <div className="options-row" style={{ justifyContent: 'center' }}>
        <ButtonLink href={`/${lang}#products`} size="lg" icon="cart">{t.shopNow}</ButtonLink>
        <ButtonLink href={`/${lang}`} variant="secondary" size="lg" icon="home">{t.home}</ButtonLink>
        <ButtonLink href={waLink(site.whatsapp)} variant="ghost" external>{t.whatsapp}</ButtonLink>
      </div>
    </div>
  );
}
