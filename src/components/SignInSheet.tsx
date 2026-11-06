'use client';
/**
 * Sign-in sheet (rewards): first name + UAE mobile + consent → 6-digit code by SMS/WhatsApp → signed in.
 * Code: 5-minute expiry, 5 attempts, resend after 30 s (all enforced on the server).
 */
import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { phoneDisplay } from '@/lib/format';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { useStore } from './StoreProvider';

export function SignInSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { t, lang } = useStore();
  const id = useId();
  const [step, setStep] = useState<'details' | 'code'>('details');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [e164, setE164] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const post = async (url: string, body: unknown) => {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: r.ok, data: await r.json().catch(() => ({})) };
  };

  const send = async () => {
    setErr('');
    if (!firstName.trim()) return setErr(t.authErrors.name_required);
    if (!consent) return setErr(t.authErrors.consent_required);
    setBusy(true);
    const { ok, data } = await post('/api/auth/start', { phone, firstName: firstName.trim(), consent, lang }).finally(() => setBusy(false));
    if (!ok) {
      if (data.retryAfter) setWait(data.retryAfter);
      return setErr(t.authErrors[data.error] ?? t.smsFailed);
    }
    setE164(data.phone);
    setStep('code');
    setCode('');
    setWait(data.resendIn ?? 30);
  };

  const verify = async (value = code) => {
    if (value.length !== 6) return;
    setErr('');
    setBusy(true);
    const { ok, data } = await post('/api/auth/verify', { phone: e164, code: value, firstName: firstName.trim(), consent }).finally(() => setBusy(false));
    if (!ok) {
      setCode('');
      return setErr(data.error === 'wrong_code' ? `${t.authErrors.wrong_code}. ${t.attemptsLeft(data.attemptsLeft)}` : (t.authErrors[data.error] ?? t.codeInvalid));
    }
    onDone();
  };

  return (
    <Sheet open onClose={onClose} title={t.signInTitle} testId="signin-sheet">
      {step === 'details' ? (
        <form className="stack" style={{ gap: 'var(--s4)' }} noValidate onSubmit={(e) => { e.preventDefault(); send(); }}>
          <p className="muted">{t.signInSub}</p>
          <div className="field">
            <label htmlFor={`${id}-name`}>{t.firstName}</label>
            <input id={`${id}-name`} className="input" autoComplete="given-name" maxLength={40} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={`${id}-phone`}>{t.mobile}</label>
            <div className="phone-wrap">
              <span className="prefix">+971</span>
              <input id={`${id}-phone`} className="input" type="tel" inputMode="tel" autoComplete="tel-national" placeholder={t.phoneHint}
                value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="signin-phone" />
            </div>
          </div>
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} data-testid="signin-consent" />
            <span>
              {t.consentText} (<Link href={`/${lang}/terms`} target="_blank">{t.terms}</Link> · <Link href={`/${lang}/privacy`} target="_blank">{t.privacy}</Link>)
            </span>
          </label>
          {err && <p className="error" role="alert">{err}</p>}
          <Button type="submit" size="lg" block loading={busy} disabled={wait > 0} data-testid="signin-send">
            {wait > 0 ? t.resendIn(wait) : t.sendCode}
          </Button>
        </form>
      ) : (
        <form className="stack" style={{ gap: 'var(--s4)' }} noValidate onSubmit={(e) => { e.preventDefault(); verify(); }}>
          <p>{t.codeSentTo(phoneDisplay(e164))}</p>
          <div className="field">
            <label htmlFor={`${id}-code`}>{t.code}</label>
            <input id={`${id}-code`} className="input num ltr otp-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6}
              value={code} data-testid="signin-code"
              onChange={(e) => {
                const v = e.target.value.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)).replace(/\D/g, '').slice(0, 6);
                setCode(v);
                if (v.length === 6) verify(v);
              }} />
          </div>
          {err && <p className="error" role="alert">{err}</p>}
          <Button type="submit" size="lg" block loading={busy} disabled={code.length !== 6} data-testid="signin-verify">{t.verify}</Button>
          <div className="options-row" style={{ justifyContent: 'space-between' }}>
            <Button variant="ghost" arrow={false} onClick={() => { setStep('details'); setErr(''); }}>{t.changeNumber}</Button>
            <Button variant="ghost" arrow={false} disabled={wait > 0 || busy} onClick={send}>{wait > 0 ? t.resendIn(wait) : t.resend}</Button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
