'use client';

import { useId, useState } from 'react';
import { instagramUrl, site } from '@/config/site';
import { branches } from '@/data/places';
import { normaliseUaeMobile, phoneDisplay, waLink } from '@/lib/format';
import { BranchCard, directionsUrl } from './BranchCard';
import { Button, ButtonLink } from './Button';
import { prefersReducedMotion } from './hooks';
import { Icon } from './Icon';
import { useStore } from './StoreProvider';

/** OpenStreetMap embed: no API key, no script, lazy-loaded iframe. */
const osm = (lat: number, lng: number) => {
  const d = 0.012;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
};

export function BranchesWithMap() {
  const { t, lang } = useStore();
  const [sel, setSel] = useState(branches[0].id);
  const b = branches.find((x) => x.id === sel)!;
  return (
    <div className="branches with-map">
      <div className="stack" style={{ gap: 'var(--s4)' }}>
        {branches.map((x) => (
          <BranchCard key={x.id} b={x} selected={branches.length > 1 && x.id === sel} onSelect={branches.length > 1 ? () => {
            setSel(x.id);
            if (!matchMedia('(min-width: 900px)').matches) document.querySelector('.map-wrap')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' }); // user tapped "Map"
          } : undefined} />
        ))}
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <div className="map-wrap">
          <iframe key={b.id} title={`${t.map}: ${b.name[lang]}`} src={osm(b.lat, b.lng)} loading="lazy" referrerPolicy="no-referrer" />
        </div>
        <ButtonLink variant="ghost" href={directionsUrl(b)} external>{b.name[lang]} · {t.openInMaps}</ButtonLink>
      </div>
    </div>
  );
}

export function ContactTiles() {
  const { t } = useStore();
  const tiles = [
    { icon: 'phone' as const, label: t.call, sub: phoneDisplay(site.phone), href: `tel:${site.phone}`, ltr: true },
    { icon: 'whatsapp' as const, label: t.whatsapp, sub: phoneDisplay(site.whatsapp), href: waLink(site.whatsapp), ltr: true, ext: true },
    { icon: 'mail' as const, label: t.email, sub: site.email, href: `mailto:${site.email}`, ltr: true },
    { icon: 'instagram' as const, label: t.instagram, sub: '@' + site.instagramHandle, href: instagramUrl, ltr: true, ext: true },
  ];
  return (
    <div className="contact-grid">
      {tiles.map((x) => (
        <a key={x.label} className="contact-tile" href={x.href} {...(x.ext ? { target: '_blank', rel: 'noopener' } : {})}>
          <span className="c-ico"><Icon name={x.icon} size={22} /></span>
          <b>{x.label}</b>
          <small className={x.ltr ? 'ltr' : undefined}>{x.sub}</small>
        </a>
      ))}
    </div>
  );
}

export function ContactForm() {
  const { t } = useStore();
  const id = useId();
  const [v, setV] = useState({ name: '', phone: '', message: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!v.name.trim()) er.name = t.required;
    if (!normaliseUaeMobile(v.phone)) er.phone = t.phoneInvalid;
    if (!v.message.trim()) er.message = t.required;
    setErr(er);
    if (Object.keys(er).length) return;
    setState('busy');
    const res = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(v) }).catch(() => null);
    setState(res?.ok ? 'sent' : 'error');
  };

  if (state === 'sent') return <p className="alert" role="status" style={{ background: 'var(--fresh-50)', color: '#134430' }}>{t.sent}</p>;

  return (
    <form className="panel-card" onSubmit={submit} noValidate>
      <div className="grid-2">
        <div className="field">
          <label htmlFor={`${id}-n`}>{t.name}</label>
          <input id={`${id}-n`} className="input" autoComplete="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} aria-invalid={!!err.name} />
          {err.name && <p className="error">{err.name}</p>}
        </div>
        <div className="field">
          <label htmlFor={`${id}-p`}>{t.phone}</label>
          <div className="phone-wrap">
            <span className="prefix" aria-hidden>+971</span>
            <input id={`${id}-p`} className="input" type="tel" inputMode="tel" autoComplete="tel-national" placeholder={t.phoneHint} value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} aria-invalid={!!err.phone} />
          </div>
          {err.phone && <p className="error">{err.phone}</p>}
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${id}-m`}>{t.message}</label>
        <textarea id={`${id}-m`} className="textarea" rows={4} maxLength={2000} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} aria-invalid={!!err.message} />
        {err.message && <p className="error">{err.message}</p>}
      </div>
      {state === 'error' && <p className="alert error-box" role="alert">{t.orderError}</p>}
      <Button type="submit" size="lg" loading={state === 'busy'} style={{ justifySelf: 'start' }}>
        {t.send}
      </Button>
    </form>
  );
}
