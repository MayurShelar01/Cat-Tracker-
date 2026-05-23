"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Mail, Key } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [usePassword, setUsePassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg("")
    
    const supabase = createClient()
    
    if (usePassword) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setErrorMsg(error.message)
        setLoading(false)
        return
      }
      
      router.push('/today')
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (error) {
        setErrorMsg(error.message)
        setLoading(false)
        return
      }
      
      setLoading(false)
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">CAT Engine</h1>
          <p className="text-sm text-text-secondary">Your personal revision engine for CAT 2026</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            {sent ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto w-16 h-16 bg-white/5 border border-white/10 text-status-done rounded-full flex items-center justify-center animate-pulse">
                  <Mail className="w-8 h-8" />
                </div>
                <h3 className="font-medium text-lg text-text-primary">Check your email</h3>
                <p className="text-text-secondary text-sm">
                  We've sent a magic link to {email}.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 rounded-xl border border-white/10 bg-bg-secondary px-4 text-center text-lg placeholder:text-text-muted focus:outline-none focus:border-section-quant focus:ring-1 focus:ring-section-quant transition-colors"
                />
                
                {usePassword && (
                  <input
                    id="password"
                    type="password"
                    placeholder="Password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 rounded-xl border border-white/10 bg-bg-secondary px-4 text-center text-lg placeholder:text-text-muted focus:outline-none focus:border-section-quant focus:ring-1 focus:ring-section-quant transition-colors animate-in fade-in slide-in-from-top-2"
                  />
                )}
                
                {errorMsg && <p className="text-status-shaky text-sm text-center">{errorMsg}</p>}
              </div>
            )}
          </div>
          {!sent && (
            <div className="space-y-3">
              <Button type="submit" size="lg" className="w-full h-12" disabled={loading || !email || (usePassword && !password)}>
                {loading ? "Signing in..." : (usePassword ? "Sign In" : "Send Magic Link")}
              </Button>
              
              <button 
                type="button" 
                onClick={() => setUsePassword(!usePassword)}
                className="w-full text-sm text-text-muted hover:text-text-primary transition-colors flex items-center justify-center gap-2"
              >
                {usePassword ? <Mail className="w-4 h-4" /> : <Key className="w-4 h-4" />}
                {usePassword ? "Use Magic Link instead" : "Use Password instead"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
