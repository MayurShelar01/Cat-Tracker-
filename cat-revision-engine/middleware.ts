import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  console.log('MIDDLEWARE:', pathname)

  // ALWAYS let these through - no exceptions
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/debug') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    console.log('MIDDLEWARE: allowing through:', pathname)
    return NextResponse.next()
  }

  // Cookie check
  const cookies = request.cookies.getAll()
  console.log('MIDDLEWARE: cookies found:', cookies.map(c => c.name).join(', '))
  
  const isLoggedIn = cookies.some(
    c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )
  
  console.log('MIDDLEWARE: isLoggedIn:', isLoggedIn)

  if (!isLoggedIn) {
    console.log('MIDDLEWARE: redirecting to login from:', pathname)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
