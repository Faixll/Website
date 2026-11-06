'use client';

import { useActionState } from 'react';
import { login } from './actions';

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="stack" style={{ gap: 12 }}>
      <div className="field">
        <label htmlFor="admin-pw">Password</label>
        <input id="admin-pw" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <button type="submit" className={`btn btn-primary btn-md${pending ? ' is-loading' : ''}`} disabled={pending}>
        <span className="btn-label">Sign in</span>{pending && <span className="btn-spinner" aria-hidden />}
      </button>
    </form>
  );
}
