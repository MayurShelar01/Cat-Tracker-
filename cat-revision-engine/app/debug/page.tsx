import { createClient } from '@/lib/supabase/server'

export default async function DebugPage() {
  const supabase = createClient()
  
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  let dbUser = null
  let dbError = null
  
  if (user) {
    const result = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    dbUser = result.data
    dbError = result.error
  }

  return (
    <div style={{ 
      fontFamily: 'monospace', 
      padding: '20px', 
      background: '#0a0a0f', 
      color: '#f0f0f5',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#3b82f6' }}>Auth Debug Page</h1>
      
      <h2>Session Status</h2>
      <pre style={{ background: '#12121a', padding: '12px', borderRadius: '8px' }}>
        {JSON.stringify({
          hasSession: !!session,
          sessionError: sessionError?.message,
          expiresAt: session?.expires_at,
        }, null, 2)}
      </pre>

      <h2>User Status</h2>
      <pre style={{ background: '#12121a', padding: '12px', borderRadius: '8px' }}>
        {JSON.stringify({
          hasUser: !!user,
          email: user?.email,
          id: user?.id,
          userError: userError?.message,
        }, null, 2)}
      </pre>

      <h2>Database User Record</h2>
      <pre style={{ background: '#12121a', padding: '12px', borderRadius: '8px' }}>
        {JSON.stringify({
          dbUser,
          dbError: dbError?.message,
          dbErrorCode: dbError?.code,
        }, null, 2)}
      </pre>

      <h2>Environment</h2>
      <pre style={{ background: '#12121a', padding: '12px', borderRadius: '8px' }}>
        {JSON.stringify({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          nodeEnv: process.env.NODE_ENV,
        }, null, 2)}
      </pre>

      <h2>Middleware Cookie Check</h2>
      <pre style={{ background: '#12121a', padding: '12px', borderRadius: '8px' }}>
        Check browser devtools → Application → Cookies
        Look for cookies starting with: sb-
      </pre>
      
      <div style={{ marginTop: '20px' }}>
        <a href="/login" style={{ color: '#3b82f6', marginRight: '16px' }}>
          → Go to Login
        </a>
        <a href="/today" style={{ color: '#22c55e' }}>
          → Go to Today
        </a>
      </div>
    </div>
  )
}
