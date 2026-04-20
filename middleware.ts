// middleware.ts — Route protection
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password'];
const ADMIN_PATHS = ['/admin'];
const HOMEOWNER_PATHS = ['/dashboard'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for refresh token in localStorage via cookie-like header
  // Since we store refreshToken in localStorage (not httpOnly cookie),
  // we gate on a lightweight "auth" cookie set on login.
  const isAuthenticated = request.cookies.has('auth_session');
  const userRole = request.cookies.get('user_role')?.value;

  // Public paths — redirect authenticated users to their dashboard
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (isAuthenticated) {
      const dest = userRole === 'ADMIN' ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  // Protected paths — redirect unauthenticated users to login
  const isProtected =
    ADMIN_PATHS.some((p) => pathname.startsWith(p)) ||
    HOMEOWNER_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access
  if (isAuthenticated && userRole) {
    if (
      pathname.startsWith('/admin') &&
      userRole !== 'ADMIN'
    ) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (
      pathname.startsWith('/dashboard') &&
      userRole !== 'HOMEOWNER'
    ) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
