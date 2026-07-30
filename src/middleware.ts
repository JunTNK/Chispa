import { NextResponse, type NextRequest } from 'next/server';

/**
 * Lightweight middleware for auth checks.
 * Uses raw cookie parsing instead of @supabase/ssr to keep the bundle small.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only run on API routes and auth pages (the matcher already narrows it)
  const isProtected = pathname.startsWith('/api/decision') || pathname.startsWith('/api/workout');
  const isAuthPage = pathname === '/login' || pathname === '/register';

  // Skip auth checks when Supabase isn't configured (local-first dev)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.next();
  }

  if (!isProtected && !isAuthPage) return;

  // Lightweight session check: parse cookies directly
  const cookies = request.cookies.getAll();
  const hasSession = cookies.some(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  );

  // Redirect unauthenticated users trying to access protected routes
  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login/register pages
  if (isAuthPage && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/login',
    '/register',
  ],
};
