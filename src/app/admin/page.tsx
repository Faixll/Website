import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/server/session';
import { LoginForm } from './LoginForm';

export default async function AdminHome() {
  if (await isAdmin()) redirect('/admin/orders');
  const configured = !!process.env.DATABASE_URL && !!process.env.ADMIN_PASSWORD;
  return (
    <div className="panel-card" style={{ maxWidth: 420 }}>
      <h1 style={{ fontSize: 24 }}>Admin sign-in</h1>
      {configured ? <LoginForm /> : <p className="muted">Not configured yet: set DATABASE_URL, ADMIN_PASSWORD and SESSION_SECRET.</p>}
    </div>
  );
}
