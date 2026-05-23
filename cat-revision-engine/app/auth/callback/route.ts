import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/today'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Check if user has completed onboarding
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check if user exists in our users table
        const { data: userData } = await supabase
          .from('users')
          .select('onboarding_done, id')
          .eq('id', user.id)
          .single()
        
        if (!userData) {
          // New user — create their record and send to onboarding
          await supabase.from('users').insert({
            id: user.id,
            email: user.email!,
            onboarding_done: false,
          })
          return NextResponse.redirect(`${origin}/onboarding/diagnostic`)
        }
        
        if (!userData.onboarding_done) {
          return NextResponse.redirect(`${origin}/onboarding/diagnostic`)
        }
        
        // Existing user with onboarding done — go to today
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Something went wrong — back to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
