import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { accountsEnabled, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/env';

/** Keeps the Supabase login session fresh (rotates the cookie before it expires). */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!accountsEnabled) return response;
  // Only touch requests that carry a Supabase session cookie.
  if (!request.cookies.getAll().some((c) => c.name.startsWith('sb-'))) return response;

  const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await sb.auth.getUser();
  return response;
}

export const config = {
  runtime: 'nodejs', // Supabase uses Node APIs not available in the Edge runtime
  matcher: ['/((?!_next/static|_next/image|images/|logo.svg|favicon.ico|api/stripe/webhook).*)'],
};
