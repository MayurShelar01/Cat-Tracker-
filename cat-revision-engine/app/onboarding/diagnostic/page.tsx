"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { updateUser } from "@/lib/db"
import { createClient } from "@/lib/supabase/client"

export default function DiagnosticPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [scores, setScores] = useState({
    varc: "",
    quant: "",
    lrdi: ""
  })

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      } else {
        router.push('/login')
      }
      setLoadingUser(false)
    }
    init()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setSubmitting(true)
    
    try {
      await updateUser(userId, {
        varc_percentile: Number(scores.varc) || 0,
        quant_percentile: Number(scores.quant) || 0,
        lrdi_percentile: Number(scores.lrdi) || 0,
        catchup_mode: true // Start all new users in catchup mode by default in prototype
      })
      router.push("/onboarding/triage")
    } catch (err) {
      console.error("Failed to save diagnostic data", err)
      setSubmitting(false)
    }
  }

  const handleChange = (section: keyof typeof scores) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setScores(prev => ({ ...prev, [section]: e.target.value }))
  }

  if (loadingUser) {
    return <div className="min-h-screen flex items-center justify-center text-text-muted">Loading...</div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-bg-secondary border-white/5">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-xl font-bold text-text-primary">What were your last CAT percentiles?</CardTitle>
          <p className="text-xs text-text-muted mt-2">Enter 0 if first attempt</p>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            
            <div className="space-y-3 text-center">
              <Badge variant="green">VARC</Badge>
              <input
                type="number"
                min="0"
                max="100"
                value={scores.varc}
                onChange={handleChange('varc')}
                placeholder="0"
                className="flex h-12 w-full rounded-xl border border-white/10 bg-bg-tertiary px-3 py-2 text-2xl text-center text-text-primary placeholder:text-text-muted/30 focus:outline-none focus:border-section-varc transition-colors"
                disabled={submitting}
              />
            </div>
            
            <div className="space-y-3 text-center">
              <Badge variant="blue">QUANTS</Badge>
              <input
                type="number"
                min="0"
                max="100"
                value={scores.quant}
                onChange={handleChange('quant')}
                placeholder="0"
                className="flex h-12 w-full rounded-xl border border-white/10 bg-bg-tertiary px-3 py-2 text-2xl text-center text-text-primary placeholder:text-text-muted/30 focus:outline-none focus:border-section-quant transition-colors"
                disabled={submitting}
              />
            </div>
            
            <div className="space-y-3 text-center">
              <Badge variant="orange">LRDI</Badge>
              <input
                type="number"
                min="0"
                max="100"
                value={scores.lrdi}
                onChange={handleChange('lrdi')}
                placeholder="0"
                className="flex h-12 w-full rounded-xl border border-white/10 bg-bg-tertiary px-3 py-2 text-2xl text-center text-text-primary placeholder:text-text-muted/30 focus:outline-none focus:border-section-lrdi transition-colors"
                disabled={submitting}
              />
            </div>

          </CardContent>
          <CardFooter className="pt-4">
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Saving..." : "Next →"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
