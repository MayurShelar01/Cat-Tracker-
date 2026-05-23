import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  
  // LOG EVERYTHING
  console.log('=== AUTH CALLBACK CALLED ===')
  console.log('Full URL:', request.url)
  console.log('Code:', code ? 'PRESENT' : 'MISSING')
  console.log('Origin:', origin)
  console.log('All params:', Object.fromEntries(requestUrl.searchParams))

  if (!code) {
    console.log('ERROR: No code - redirecting to login')
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  try {
    const supabase = createClient()
    console.log('Supabase client created')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    console.log('Exchange error:', error?.message ?? 'none')
    console.log('Exchange user:', data?.user?.email ?? 'none')
    console.log('Exchange session:', data?.session ? 'PRESENT' : 'MISSING')

    if (error) {
      console.log('ERROR: Exchange failed:', error.message)
      return NextResponse.redirect(
        `${origin}/login?error=exchange_failed&msg=${encodeURIComponent(error.message)}`
      )
    }

    if (!data.user) {
      console.log('ERROR: No user after exchange')
      return NextResponse.redirect(`${origin}/login?error=no_user`)
    }

    console.log('User authenticated:', data.user.email)
    console.log('Checking users table...')

    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, onboarding_done')
      .eq('id', data.user.id)
      .single()

    console.log('DB user found:', existingUser ? 'YES' : 'NO')
    console.log('DB error:', userError?.message ?? 'none')
    console.log('DB error code:', userError?.code ?? 'none')

    if (!existingUser) {
      console.log('New user - creating record...')
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          onboarding_done: false,
          varc_percentile: 0,
          quant_percentile: 0,
          lrdi_percentile: 0,
          current_day: 0,
          catchup_mode: true,
        })
      
      console.log('Insert error:', insertError?.message ?? 'none')
      console.log('Redirecting to onboarding...')
      return NextResponse.redirect(`${origin}/onboarding/diagnostic`)
    }

    console.log('Existing user - onboarding_done:', existingUser.onboarding_done)
    
    if (!existingUser.onboarding_done) {
      console.log('Redirecting to onboarding...')
      return NextResponse.redirect(`${origin}/onboarding/diagnostic`)
    }

    console.log('Redirecting to /today...')
    return NextResponse.redirect(`${origin}/today`)

  } catch (err: any) {
    console.error('CALLBACK CRASH:', err.message)
    console.error('Stack:', err.stack)
    return NextResponse.redirect(
      `${origin}/login?error=callback_failed&msg=${encodeURIComponent(err.message)}`
    )
  }
}
