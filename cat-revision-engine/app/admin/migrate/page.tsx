"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function MigratePage() {
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const log = (msg: string) => setLogs(prev => [...prev, msg])

  const handleMigrate = async () => {
    setLoading(true)
    setLogs([])
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error("You must be logged in to migrate data.")
      }

      log(`Logged in as ${user.email} (${user.id})`)

      const rawData = localStorage.getItem("cat_mock_db")
      if (!rawData) {
        log("No localStorage data found for 'cat_mock_db'. Nothing to migrate.")
        setLoading(false)
        return
      }

      const data = JSON.parse(rawData)
      log(`Found localStorage data. Users: ${data.users?.length || 0}`)

      // 1. Migrate user profile
      const localUser = data.users?.[0]
      if (localUser) {
        log("Migrating user profile...")
        const { error } = await supabase.from("users").upsert({
          id: user.id,
          email: user.email!,
          varc_percentile: localUser.varc_percentile,
          quant_percentile: localUser.quant_percentile,
          lrdi_percentile: localUser.lrdi_percentile,
          current_day: localUser.current_day,
          catchup_mode: localUser.catchup_mode
        })
        if (error) throw error
        log("✅ User profile migrated.")
      }

      // 2. Migrate user_topics
      if (data.userTopics?.length > 0) {
        log(`Migrating ${data.userTopics.length} user_topics...`)
        const userTopics = data.userTopics.map((ut: any) => {
          // Remove the mock generated id to let DB generate it, or map correctly
          const { id, user_id, ...rest } = ut;
          return {
            ...rest,
            user_id: user.id
          }
        })
        
        // Supabase bulk upsert or insert
        const { error } = await supabase.from("user_topics").upsert(userTopics, { onConflict: "user_id,topic_id" })
        if (error) throw error
        log(`✅ ${data.userTopics.length} user_topics migrated.`)
      }

      // 3. Migrate daily_queue
      if (data.dailyQueues?.length > 0) {
        log(`Migrating ${data.dailyQueues.length} daily_queue items...`)
        const queues = data.dailyQueues.map((q: any) => {
          const { id, user_id, ...rest } = q;
          return {
            ...rest,
            user_id: user.id
          }
        })
        const { error } = await supabase.from("daily_queue").upsert(queues, { onConflict: "user_id,date" })
        if (error) throw error
        log(`✅ ${data.dailyQueues.length} daily_queue items migrated.`)
      }

      // 4. Migrate mocks
      if (data.mocks?.length > 0) {
        log(`Migrating ${data.mocks.length} mocks...`)
        const mocks = data.mocks.map((m: any) => {
          const { user_id, ...rest } = m;
          return {
            ...rest,
            user_id: user.id
          }
        })
        const { error } = await supabase.from("mocks").upsert(mocks)
        if (error) throw error
        log(`✅ ${data.mocks.length} mocks migrated.`)
      }

      // 5. Migrate mock_topic_perf
      if (data.mockTopicPerf?.length > 0) {
        log(`Migrating ${data.mockTopicPerf.length} mock_topic_perf items...`)
        const { error } = await supabase.from("mock_topic_perf").upsert(data.mockTopicPerf)
        if (error) throw error
        log(`✅ ${data.mockTopicPerf.length} mock_topic_perf items migrated.`)
      }

      log("🎉 Migration complete! Clearing localStorage...")
      localStorage.removeItem("cat_mock_db")
      
      setDone(true)
      log("localStorage cleared. You can now reload the application.")
      
    } catch (err: any) {
      log(`❌ Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-2xl mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle>Migrate localStorage → Supabase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-text-secondary">
            This tool will read your local mock data (from mockDb.ts) and upload it to your new Supabase database, assigning it to your authenticated user account.
          </p>
          
          <Button onClick={handleMigrate} disabled={loading || done}>
            {loading ? "Migrating..." : done ? "Done" : "Start Migration"}
          </Button>

          <div className="bg-bg-secondary p-4 rounded-md space-y-2 h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 && <span className="text-text-muted">Waiting to start...</span>}
            {logs.map((msg, i) => (
              <div key={i}>{msg}</div>
            ))}
          </div>

          {done && (
            <Button variant="outline" onClick={() => window.location.href = "/today"}>
              Go to Today
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
