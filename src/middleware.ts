import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/db/supabase-middleware';

/**
 * Protected routes that require authentication.
 * Add paths here to require a logged-in session.
 */
const PROTECTED_ROUTES = [
  '/api/decision',
  '/api/workout',
  // '/dashboard',  ← uncomment when dashboard routes are added
  // '/profile',
  // '/progress',
];

/**
 * Public routes that should redirect to home if already authenticated.
 */
const AUTH_ROUTES = [
  '/login',
  '/register',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets and PWA files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js'
  ) {
    return;
  }

  // Skip auth checks when Supabase isn't configured (local-first dev)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return;
  }

  const { supabase, supabaseResponse } = createMiddlewareSupabaseClient(request);

  // Refresh the session — this also sets the cookie
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthPage = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Redirect unauthenticated users trying to access protected routes
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login/register pages
  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Apply to all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
