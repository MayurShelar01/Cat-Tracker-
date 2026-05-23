import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  console.log('Auth callback hit. Code present:', !!code)
  console.log('Origin:', origin)

  if (!code) {
    console.log('No code found, redirecting to login')
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  try {
    const supabase = createClient()
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('Exchange result - error:', error?.message)
    console.log('Exchange result - user:', data?.user?.email)

    if (error) {
      console.error('Session exchange error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
    }

    if (!data.user) {
      return NextResponse.redirect(`${origin}/login?error=no_user`)
    }

    // Check if user exists in our users table
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, onboarding_done')
      .eq('id', data.user.id)
      .single()

    console.log('Existing user:', existingUser)
    console.log('User error:', userError?.message)

    if (!existingUser) {
      // Create new user record
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

      if (insertError) {
        console.error('User insert error:', insertError.message)
        // Still redirect to onboarding even if insert fails
        // The onboarding page will handle user creation
      }

      return NextResponse.redirect(`${origin}/onboarding/diagnostic`)
    }

    if (!existingUser.onboarding_done) {
      return NextResponse.redirect(`${origin}/onboarding/diagnostic`)
    }

    return NextResponse.redirect(`${origin}/today`)

  } catch (err) {
    console.error('Callback error:', err)
    return NextResponse.redirect(`${origin}/login?error=callback_failed`)
  }
}
