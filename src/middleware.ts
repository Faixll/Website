import { NextResponse, type NextRequest } from 'next/server';

/**
 * Addresses without a language (e.g. /product/x or a mistyped /abc) go to the Arabic site, so visitors
 * get the right page or the shop's own 404 page instead of a generic English one. Runs only for those paths.
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = `/ar${url.pathname}`;
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Everything except: the root, /ar…, /en…, /api, /admin, Next's own files and anything with a file extension.
  matcher: ['/((?!ar|en|api|admin|_next|.*\\..*).+)'],
};
