import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that never require auth
const PUBLIC_ROUTES = [
  '/login',
  '/auth/callback',
  '/unsubscribe',
]

// Routes that start with these prefixes are also public
const PUBLIC_PREFIXES = [
  '/_next',
  '/api/auth',
  '/favicon',
  '/icons',
  '/images',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next()
  }

  // Always allow public prefixes
  if (PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // Check for Supabase auth cookie (presence check only — no Supabase SDK)
  // Supabase sets cookies matching: sb-<project-ref>-auth-token
  const cookies = request.cookies.getAll()
  const hasAuthCookie = cookies.some(
    cookie =>
      cookie.name.startsWith('sb-') &&
      cookie.name.endsWith('-auth-token') &&
      cookie.value.length > 0
  )

  // Also check for the newer Supabase cookie format
  const hasSessionCookie = cookies.some(
    cookie =>
      (cookie.name.includes('auth-token') || cookie.name.includes('session')) &&
      cookie.value.length > 0
  )

  const isAuthenticated = hasAuthCookie || hasSessionCookie

  // If not authenticated and trying to access protected route, redirect to login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files (svg, png, jpg, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
