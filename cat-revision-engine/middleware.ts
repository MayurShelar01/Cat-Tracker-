import { NextResponse, type NextRequest } from 'next/server'

/**
 * Lightweight middleware that checks for a Supabase auth cookie
 * WITHOUT importing @supabase/ssr (which uses Node.js APIs like
 * __dirname that crash Vercel's Edge runtime).
 *
 * The actual session validation still happens server-side in the
 * route handlers / server components via createServerClient.
 * This middleware only does a fast cookie-presence redirect.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public paths that never require auth
  const isPublicPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/')

  if (isPublicPath) {
    return NextResponse.next()
  }

  // Check for any Supabase auth cookie (they are prefixed sb-)
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))

  if (!hasAuthCookie) {
    // No auth cookie → redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Auth cookie exists — let the page/server-component validate the session
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static  (static assets)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - files with an extension (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
