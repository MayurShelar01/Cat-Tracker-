"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getTriageData } from "@/lib/mockData"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ConfirmationPage() {
  const router = useRouter()
  const [stats, setStats] = useState({ newStudy: 0, fastReview: 0, straightRevision: 0 })

  useEffect(() => {
    const data = getTriageData()
    if (data) {
      let newStudy = 0
      let fastReview = 0
      let straightRevision = 0
      
      Object.values(data).forEach((status) => {
        if (status === 'never_touched') newStudy++
        if (status === 'vaguely_remember') fastReview++
        if (status === 'studied_before') straightRevision++
      })
      
      setStats({ newStudy, fastReview, straightRevision })
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary/95 p-4">
      <Card className="w-full max-w-md bg-bg-tertiary border-white/5">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-status-done/15 text-status-done rounded-full flex items-center justify-center mb-4 text-3xl">
            🎉
          </div>
          <CardTitle className="text-2xl font-bold text-text-primary">Your catch-up plan is ready.</CardTitle>
          <CardDescription className="text-text-secondary">Based on your triage, here's what your next few weeks look like.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-bg-secondary rounded-lg border border-status-shaky/20">
              <span className="font-medium text-text-secondary">New study required</span>
              <span className="text-2xl font-bold text-status-shaky">{stats.newStudy}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-bg-secondary rounded-lg border border-status-okay/20">
              <span className="font-medium text-text-secondary">Fast-review mode</span>
              <span className="text-2xl font-bold text-status-okay">{stats.fastReview}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-bg-secondary rounded-lg border border-status-done/20">
              <span className="font-medium text-text-secondary">Straight to revision</span>
              <span className="text-2xl font-bold text-status-done">{stats.straightRevision}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button size="lg" className="w-full h-12 rounded-xl" onClick={() => router.push("/today")}>
            Start Day 1 →
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
