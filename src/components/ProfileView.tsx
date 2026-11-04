'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { site } from '@/config/site';
import { emirates } from '@/data/places';
import { phoneDisplay, waLink } from '@/lib/format';
import { LangToggle } from './Chrome';
import { Icon } from './Icon';
import { useStore } from './StoreProvider';

/** Same key the checkout reads, so saved details prefill it. Stored only in this browser. */
export const CONTACT_KEY = 'hab-contact';
type Details = { name: string; phone: string; emirate: string; area: string; street: string; building: string; apartment: string };
const EMPTY: Details = { name: '', phone: '', emirate: emirates.length === 1 ? emirates[0].id : '', area: '', street: '', building: '', apartment: '' };

export function ProfileView() {
  const { t, lang } = useStore();
  const [d, setD] = useState<Details>(EMPTY);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try { setD({ ...EMPTY, ...JSON.parse(localStorage.getItem(CONTACT_KEY) ?? '{}') }); } catch { /* storage unavailable */ }
  }, []);

  const set = <K extends keyof Details>(k: K, v: Details[K]) => { setSaved(false); setD((x) => ({ ...x, [k]: v })); };
  const emirate = emirates.find((e) => e.id === d.emirate);

  return (
    <div className="profile-grid">
      <form
        className="panel-card"
        data-testid="profile-form"
        onSubmit={(e) => {
          e.preventDefault();
          try { localStorage.setItem(CONTACT_KEY, JSON.stringify(d)); setSaved(true); } catch { /* ignore */ }
        }}
      >
        <h2>{t.deliveryDetails}</h2>
        <p className="saved-note"><Icon name="lock" size={18} />{t.savedHere}</p>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="pf-name">{t.name}</label>
            <input id="pf-name" className="input" autoComplete="name" value={d.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pf-phone">{t.phone}</label>
            <div className="phone-wrap">
              <span className="prefix" aria-hidden>+971</span>
              <input id="pf-phone" className="input" type="tel" inputMode="tel" autoComplete="tel-national" placeholder={t.phoneHint} value={d.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="pf-emirate">{t.emirate}</label>
            <select id="pf-emirate" className="select" value={d.emirate} onChange={(e) => { set('emirate', e.target.value); set('area', ''); }}>
              <option value="">{t.choose}</option>
              {emirates.map((em) => <option key={em.id} value={em.id}>{em.name[lang]}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pf-area">{t.area}</label>
            <select id="pf-area" className="select" value={d.area} disabled={!emirate} onChange={(e) => set('area', e.target.value)}>
              <option value="">{t.choose}</option>
              {emirate?.areas.map((a) => <option key={a.en} value={a.en}>{a[lang]}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="pf-street">{t.street}</label>
          <input id="pf-street" className="input" autoComplete="address-line1" value={d.street} onChange={(e) => set('street', e.target.value)} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="pf-building">{t.building}</label>
            <input id="pf-building" className="input" autoComplete="address-line2" value={d.building} onChange={(e) => set('building', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pf-apt">{t.apartment} <span className="opt">({t.apartmentOpt})</span></label>
            <input id="pf-apt" className="input" value={d.apartment} onChange={(e) => set('apartment', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary btn-pill">{saved ? <><Icon name="check" size={20} />{t.saved}</> : t.saveDetails}</button>
          <button type="button" className="btn btn-ghost btn-pill" onClick={() => { try { localStorage.removeItem(CONTACT_KEY); } catch { /* ignore */ } setD(EMPTY); setSaved(false); }}>{t.clearDetails}</button>
        </div>
        <p role="status" className="sr-only">{saved ? t.saved : ''}</p>
      </form>

      <div className="stack" style={{ gap: 'var(--s4)' }}>
        <section className="panel-card" aria-labelledby="pf-lang">
          <h2 id="pf-lang">{t.language}</h2>
          <LangToggle className="btn btn-ghost btn-pill" />
        </section>
        <section className="panel-card" aria-labelledby="pf-contact">
          <h2 id="pf-contact">{t.contactUs}</h2>
          <div className="pills">
            <a className="btn btn-ink btn-pill" href={waLink(site.whatsapp)} target="_blank" rel="noopener"><Icon name="whatsapp" size={20} />{t.whatsapp}</a>
            <a className="btn btn-ghost btn-pill" href={`tel:${site.phone}`}><Icon name="phone" size={20} /><span className="ltr num">{phoneDisplay(site.phone)}</span></a>
          </div>
        </section>
        <nav className="panel-card" aria-label={t.legal}>
          <ul className="list-links">
            <li><Link href={`/${lang}/stores`}>{t.branchesHours}<Icon name={lang === 'ar' ? 'caretEnd' : 'caretStart'} size={20} /></Link></li>
            <li><Link href={`/${lang}/terms`}>{t.terms}<Icon name={lang === 'ar' ? 'caretEnd' : 'caretStart'} size={20} /></Link></li>
            <li><Link href={`/${lang}/privacy`}>{t.privacy}<Icon name={lang === 'ar' ? 'caretEnd' : 'caretStart'} size={20} /></Link></li>
            <li><Link href={`/${lang}/refund`}>{t.refund}<Icon name={lang === 'ar' ? 'caretEnd' : 'caretStart'} size={20} /></Link></li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
