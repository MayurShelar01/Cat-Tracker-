"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getAllTopics, bulkCreateUserTopics } from "@/lib/db"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type TriageStatus = 'never_touched' | 'vaguely_remember' | 'studied_before' | null

export default function TriagePage() {
  const router = useRouter()
  const [topics, setTopics] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [selections, setSelections] = useState<Record<string, TriageStatus>>({})
  const [confidences, setConfidences] = useState<Record<string, 'shaky'|'okay'|'solid'>>({})
  
  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const allT = await getAllTopics()
        setTopics(allT)
      } else {
        router.push('/login')
      }
      setLoading(false)
    }
    init()
  }, [router])
  
  const triagedCount = Object.keys(selections).length
  const totalCount = topics.length
  
  const handleSelect = (topicId: string, status: TriageStatus) => {
    setSelections(prev => ({ ...prev, [topicId]: status }))
    if (status === 'studied_before' && !confidences[topicId]) {
      setConfidences(prev => ({ ...prev, [topicId]: 'okay' }))
    }
  }

  const handleConfidenceSelect = (topicId: string, conf: 'shaky'|'okay'|'solid') => {
    setConfidences(prev => ({ ...prev, [topicId]: conf }))
  }

  const handleBulkNeverTouched = () => {
    const newSelections = { ...selections }
    topics.forEach(t => {
      if (!newSelections[t.id]) {
        newSelections[t.id] = 'never_touched'
      }
    })
    setSelections(newSelections)
  }

  const handleDevSkip = async () => {
    const newSelections = { ...selections }
    topics.forEach(t => {
      if (!newSelections[t.id]) {
        newSelections[t.id] = 'never_touched'
      }
    })
    setSelections(newSelections)
    await submitSelections(newSelections)
  }

  const handleSubmit = async () => {
    if (triagedCount < totalCount) return
    await submitSelections(selections)
  }

  const submitSelections = async (finalSelections: Record<string, TriageStatus>) => {
    if (!userId) return
    setSubmitting(true)
    try {
      const now = new Date()
      const userTopicsData = Object.entries(finalSelections).map(([topicId, status]) => {
        if (!status) return null
        
        if (status === 'studied_before') {
          const conf = confidences[topicId] || 'okay'
          const due = new Date(now)
          due.setDate(due.getDate() + (conf === 'shaky' ? 14 : 21)) // +14 days for shaky, +21 for okay/solid
          
          return {
            user_id: userId,
            topic_id: topicId,
            r1_status: 'done' as const,
            r1_completed_at: now.toISOString(),
            r1_confidence: conf,
            catchup_tag: 'studied_before' as const,
            r2_due_at: due.toISOString().split('T')[0] // use date string
          }
        } else {
          return {
            user_id: userId,
            topic_id: topicId,
            r1_status: 'not_started' as const,
            catchup_tag: status as 'never_touched' | 'vaguely_remember'
          }
        }
      }).filter(Boolean) as any[]

      await bulkCreateUserTopics(userTopicsData)
      router.push("/onboarding/confirmation")
    } catch (err) {
      console.error(err)
      setSubmitting(false)
    }
  }

  const getSectionBadgeVariant = (section: string) => {
    if (section === 'QUANT') return 'blue'
    if (section === 'LRDI') return 'orange'
    if (section === 'VARC') return 'green'
    return 'default'
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-text-muted">Loading topics...</div>
  }

  return (
    <div className="min-h-screen bg-bg-primary pb-28">
      {/* Fixed Header */}
      <div className="sticky top-0 z-20 bg-bg-primary/90 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold text-text-primary">You're {totalCount} days behind</h1>
            <span className="text-xs font-medium text-text-secondary">{triagedCount}/{totalCount} triaged</span>
          </div>
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-green-500 transition-all duration-300 ease-out"
              style={{ width: `${(triagedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-3 mt-2">
        {topics.map(topic => {
          const currentSelection = selections[topic.id]
          const isSelected = !!currentSelection
          const currentConf = confidences[topic.id] || 'okay'
          
          let borderColor = "border-transparent"
          if (topic.section === 'QUANT') borderColor = "border-l-section-quant"
          if (topic.section === 'LRDI') borderColor = "border-l-section-lrdi"
          if (topic.section === 'VARC') borderColor = "border-l-section-varc"

          return (
            <Card key={topic.id} className={`transition-all duration-200 border-l-[3px] border-y-white/5 border-r-white/5 ${borderColor} ${isSelected ? 'scale-[0.98] bg-bg-tertiary' : 'bg-bg-secondary'}`}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-text-muted mb-1">Day {topic.day_number}</span>
                    <h3 className="font-medium text-text-primary">{topic.topic_name} {isSelected && "✅"}</h3>
                  </div>
                  <Badge variant={getSectionBadgeVariant(topic.section) as any}>
                    {topic.section}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button 
                    variant="outline"
                    size="sm"
                    className={`text-xs ${currentSelection === 'never_touched' ? 'bg-status-shaky text-white border-transparent' : 'bg-status-shaky/10 border-status-shaky/30 text-status-shaky'} ${currentSelection && currentSelection !== 'never_touched' ? 'opacity-30' : ''}`}
                    onClick={() => handleSelect(topic.id, 'never_touched')}
                    disabled={submitting}
                  >
                    🔴 Never Touched
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    className={`text-xs ${currentSelection === 'vaguely_remember' ? 'bg-status-okay text-white border-transparent' : 'bg-status-okay/10 border-status-okay/30 text-status-okay'} ${currentSelection && currentSelection !== 'vaguely_remember' ? 'opacity-30' : ''}`}
                    onClick={() => handleSelect(topic.id, 'vaguely_remember')}
                    disabled={submitting}
                  >
                    🟡 Vaguely Remember
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    className={`text-xs ${currentSelection === 'studied_before' ? 'bg-status-done text-white border-transparent' : 'bg-status-done/10 border-status-done/30 text-status-done'} ${currentSelection && currentSelection !== 'studied_before' ? 'opacity-30' : ''}`}
                    onClick={() => handleSelect(topic.id, 'studied_before')}
                    disabled={submitting}
                  >
                    🟢 Studied Before
                  </Button>
                </div>

                {currentSelection === 'studied_before' && (
                  <div className="mt-4 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="text-xs text-text-muted mb-2 text-center">How confident are you right now?</div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button 
                        variant="outline" size="sm"
                        className={`text-xs ${currentConf === 'shaky' ? 'bg-status-shaky text-white border-transparent' : 'border-status-shaky/30 text-status-shaky'}`}
                        onClick={() => handleConfidenceSelect(topic.id, 'shaky')}
                        disabled={submitting}
                      >
                        🔴 Shaky
                      </Button>
                      <Button 
                        variant="outline" size="sm"
                        className={`text-xs ${currentConf === 'okay' ? 'bg-status-okay text-white border-transparent' : 'border-status-okay/30 text-status-okay'}`}
                        onClick={() => handleConfidenceSelect(topic.id, 'okay')}
                        disabled={submitting}
                      >
                        🟡 Okay
                      </Button>
                      <Button 
                        variant="outline" size="sm"
                        className={`text-xs ${currentConf === 'solid' ? 'bg-status-done text-white border-transparent' : 'border-status-done/30 text-status-done'}`}
                        onClick={() => handleConfidenceSelect(topic.id, 'solid')}
                        disabled={submitting}
                      >
                        🟢 Solid
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

        {triagedCount < totalCount && (
          <div className="pt-4 pb-8 flex flex-col items-center gap-4">
            {triagedCount >= 5 && (
              <Button 
                variant="ghost" 
                className="text-text-muted hover:text-text-primary hover:underline hover:bg-transparent"
                onClick={handleBulkNeverTouched}
                disabled={submitting}
              >
                Mark all remaining as Never Touched
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="border-status-shaky/30 text-status-shaky hover:bg-status-shaky/10 hover:text-status-shaky w-full max-w-xs"
              onClick={handleDevSkip}
              disabled={submitting}
            >
              🚀 DEV SKIP (Mark all & Continue)
            </Button>
          </div>
        )}
      </div>

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-bg-primary/90 backdrop-blur-xl border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <Button 
            className="w-full h-12 rounded-xl" 
            size="lg" 
            onClick={handleSubmit}
            disabled={triagedCount < totalCount || submitting}
          >
            {submitting ? "Saving..." : `Continue → (${triagedCount}/${totalCount})`}
          </Button>
        </div>
      </div>
    </div>
  )
}
