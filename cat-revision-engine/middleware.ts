import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Always start with a safe pass-through response
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase creds are missing or empty, skip auth and let the page handle it
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.trim() === '' ||
    supabaseAnonKey.trim() === ''
  ) {
    return response
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // First pass: update request cookies
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set({ name, value, ...options })
          )
          // Rebuild response with updated request headers
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          // Second pass: set cookies on response
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options })
          )
        },
      },
    })

    // Refresh session — this is the only Supabase call in middleware
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl
    const isPublicPath =
      pathname.startsWith('/login') ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/')

    // Redirect unauthenticated users to /login
    if (!user && !isPublicPath) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } catch (err) {
    // Never crash the Edge runtime — log and continue
    console.error('[Middleware] Unexpected error:', err)
  }

  return response
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
