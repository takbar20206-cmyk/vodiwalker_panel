import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/settings', '/admin', '/messages'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();

  // Default language cookie
  if (!req.cookies.get('gid_lang')) {
    res.cookies.set('gid_lang', 'fa', { path: '/', maxAge: 60 * 60 * 24 * 365 });
  }

  const token = req.cookies.get('gid_session')?.value;

  if (!token && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads|games|robots.txt).*)'],
};
