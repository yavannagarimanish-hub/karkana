import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from './lib/auth-token';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // 1. Subdomain routing for admin.karkana.com (or admin.localhost during dev)
  const isAdminSubdomain =
    host.startsWith('admin.karkana.com') ||
    host.startsWith('admin.localhost');

  if (isAdminSubdomain) {
    // If accessing root of admin subdomain, rewrite/redirect to /admin
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.rewrite(url);
    }
  }

  // 2. Protected admin routes check
  const isAdminRoute = pathname.startsWith('/admin');
  const isLoginPage = pathname === '/admin/login';

  const sessionCookie = request.cookies.get('karkana_admin_session');
  let isAuthenticated = false;

  if (sessionCookie?.value) {
    const session = await verifySessionToken(sessionCookie.value);
    if (session && session.role === 'admin') {
      isAuthenticated = true;
    }
  }

  // If trying to access admin pages (except /admin/login) without auth: redirect to /admin/login
  if (isAdminRoute && !isLoginPage) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If already authenticated and accessing login page: redirect to /admin
  if (isLoginPage && isAuthenticated) {
    const adminUrl = new URL('/admin', request.url);
    return NextResponse.redirect(adminUrl);
  }

  // 3. Protected admin API routes check
  const isProtectedAdminApi =
    pathname.startsWith('/api/validation') ||
    pathname.startsWith('/api/products/reorder') ||
    (pathname.startsWith('/api/sections') && request.method !== 'GET') ||
    (pathname.startsWith('/api/products') && request.method !== 'GET') ||
    (pathname.startsWith('/api/orders') && (request.method === 'PATCH' || (request.method === 'GET' && !request.nextUrl.searchParams.has('id'))));

  if (isProtectedAdminApi && !isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized. Administrative session required.' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - uploads/ (public product images)
     */
    '/((?!_next/static|_next/image|favicon.ico|uploads/).*)',
  ],
};

