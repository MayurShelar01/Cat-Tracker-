import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if user exists in our users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, onboarding_done')
        .eq('id', data.user.id)
        .single()

      if (!existingUser) {
        // Create new user record
        await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email!,
          onboarding_done: false,
          varc_percentile: 0,
          quant_percentile: 0,
          lrdi_percentile: 0,
          current_day: 0,
          catchup_mode: true,
        })
        return NextResponse.redirect(`${origin}/onboarding/diagnostic`)
      }

      if (!existingUser.onboarding_done) {
        return NextResponse.redirect(`${origin}/onboarding/diagnostic`)
      }

      return NextResponse.redirect(`${origin}/today`)
    }
  }

  // If no code or error, redirect to login
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
