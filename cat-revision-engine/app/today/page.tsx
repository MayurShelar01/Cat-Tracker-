"use client"

import React, { useEffect, useState } from "react";
import { TopicCard } from "@/components/features/TopicCard";
import { TestCard } from "@/components/features/TestCard";
import { generateDailyQueue, handleSkip, scheduleR2, scheduleR3 } from "@/lib/utils/revisionEngine";
import { getUserTopics, updateUserTopic } from "@/lib/db";
import { mockTopics } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { createClient } from "@/lib/supabase/client";

export default function TodayPage() {
  const [queue, setQueue] = useState<any>(null);
  const [dbTopics, setDbTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [showConfetti, setShowConfetti] = useState(false);

  const loadQueue = async (uid: string) => {
    setLoading(true);
    try {
      const res = await generateDailyQueue(uid);
      setQueue(res);
      const userTops = await getUserTopics(uid);
      setDbTopics(userTops);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      setUserId(user.id);
      
      const userTops = await getUserTopics(user.id);
      if (userTops.length === 0) {
        // basic protection
        window.location.href = '/onboarding/diagnostic';
        return;
      }
      
      await loadQueue(user.id);
    };
    init();
  }, []);

  useEffect(() => {
    if (queue && queue.queueItems.length === 0 && !showConfetti) {
      setShowConfetti(true);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22C55E', '#3B82F6', '#A855F7']
      });
    }
  }, [queue, showConfetti]);

  if (loading || !queue || !mockTopics?.length || !dbTopics?.length) {
    return <div className="min-h-screen bg-bg-primary p-8 flex items-center justify-center text-text-muted">Loading...</div>;
  }

  const queueItemsSafe = queue?.queueItems || [];
  const r1Items = queueItemsSafe.filter((i: any) => i.type === 'r1');
  const r2r3Items = queueItemsSafe.filter((i: any) => i.type === 'r2' || i.type === 'r3');
  const testItems = queueItemsSafe.filter((i: any) => i.type === 'test');

  const getTopicDetails = (topicId: string) => {
    const t = (mockTopics || []).find((t: any) => t.id === topicId);
    const ut = (dbTopics || []).find((ut: any) => ut.topic_id === topicId);
    return { ...t, ut };
  };

  const handleR1Complete = async (topicId: string, confidence: any) => {
    if (!userId) return;
    const now = new Date();
    await updateUserTopic(userId, topicId, {
      r1_status: 'done',
      r1_completed_at: now.toISOString(),
      r1_confidence: confidence,
      r2_due_at: scheduleR2(now, confidence).toISOString(),
    });
    await loadQueue(userId);
  };

  const handleR2R3Complete = async (topicId: string, round: number, confidence: any) => {
    if (!userId) return;
    const now = new Date();
    
    // Clear mock flag if successful
    const details = getTopicDetails(topicId);
    const mockFlaggedUpdates = (details.ut?.mock_flagged && (confidence === 'okay' || confidence === 'solid')) 
      ? { mock_flagged: false } 
      : {};

    if (round === 2) {
      await updateUserTopic(userId, topicId, {
        r2_completed_at: now.toISOString(),
        r2_confidence: confidence,
        r3_due_at: scheduleR3(now).toISOString(),
        ...mockFlaggedUpdates
      });
    } else if (round === 3) {
      await updateUserTopic(userId, topicId, {
        r3_completed_at: now.toISOString(),
        r3_confidence: confidence,
        ...mockFlaggedUpdates
      });
    }
    await loadQueue(userId);
  };

  const handleLogTest = async (topicId: string, round: number, correct: number, total: number, timeTakenMin: number) => {
    if (!userId) return;
    const accuracy = Math.round((correct / total) * 100);
    const timeTakenSec = timeTakenMin * 60;

    const supabase = createClient();
    await supabase.from('test_attempts').insert({
      user_id: userId,
      topic_id: topicId,
      round,
      total_questions: total,
      correct,
      accuracy_pct: accuracy,
      time_taken_sec: timeTakenSec,
      attempted_at: new Date().toISOString()
    });

    if (accuracy < 50) {
      const details = getTopicDetails(topicId);
      let currentConf = round === 3 ? details.ut?.r3_confidence : details.ut?.r2_confidence;
      if (!currentConf) currentConf = details.ut?.r1_confidence;

      let newConf = currentConf;
      if (currentConf === 'solid') newConf = 'okay';
      else if (currentConf === 'okay') newConf = 'shaky';

      if (newConf !== currentConf) {
        alert(`Accuracy is ${accuracy}%. Confidence downgraded to ${newConf}. Please review this topic again.`);
        const updates: any = {};
        if (details.ut?.r3_completed_at) updates.r3_confidence = newConf;
        else if (details.ut?.r2_completed_at) updates.r2_confidence = newConf;
        else updates.r1_confidence = newConf;

        await updateUserTopic(userId, topicId, updates);
      }
    } else {
      alert(`Test logged successfully! Accuracy: ${accuracy}%`);
    }

    await loadQueue(userId);
  };

  const handleSkipTopic = async (topicId: string, round: number) => {
    if (!userId) return;
    await handleSkip(userId, topicId, round, new Date(queue.todayStr));
    await loadQueue(userId);
    // Simulate toast
    alert("Topic deferred. Rebalancing queue...");
  };

  const loadScoreColor = queue.loadScore > 9 ? 'text-status-shaky' : queue.loadScore > 7 ? 'text-status-okay' : 'text-status-done';

  return (
    <div className="min-h-screen bg-bg-primary pb-28">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-bg-primary/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 shadow-sm flex justify-between items-center">
        <div className="text-lg font-bold text-text-primary">Day 1</div>
        <div>
          <Badge variant="outline" className="bg-status-okay/15 text-status-okay border-transparent">41 Behind</Badge>
        </div>
        <div className={`font-bold flex items-center gap-2 ${loadScoreColor}`}>
          <span>{queue.loadScore.toFixed(1)} / 10</span>
          <Button variant="ghost" size="icon" onClick={() => loadQueue(userId!)} className="h-8 w-8 text-text-muted hover:text-text-primary hover:bg-white/5" title="Regenerate">🔄</Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-8">
        
        {/* SECTION 1: NEW STUDY (R1) */}
        <section>
          <details open className="group">
            <summary className="text-sm font-semibold text-section-quant uppercase tracking-wider mb-3 flex items-center gap-2 cursor-pointer list-none select-none">
              📘 New Study ({(r1Items || []).length})
              <span className="ml-auto transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="space-y-3 mt-3 animate-in slide-in-from-top-2 duration-200">
              {(!r1Items || r1Items.length === 0) ? (
                <div className="p-6 border border-dashed border-white/10 rounded-xl text-center text-text-muted text-sm bg-bg-secondary flex flex-col items-center justify-center">
                  <span className="text-2xl mb-2">🎉</span>
                  No new topics scheduled for today.
                </div>
              ) : (
            (r1Items || []).map((item: any) => {
              const details = getTopicDetails(item.topic_id);
              if (!details.topic_name) return null;
              
              const tag = details.ut?.catchup_tag === 'vaguely_remember' ? 'Fast Review' : 
                          details.ut?.catchup_tag === 'never_touched' ? 'Full Study' : undefined;

              return (
                <TopicCard
                  key={item.topic_id}
                  topicId={item.topic_id}
                  topicName={details.topic_name}
                  section={details.section || 'VARC'}
                  dayNumber={details.day_number || 0}
                  round={1}
                  tag={tag}
                  onComplete={(conf) => handleR1Complete(item.topic_id, conf)}
                />
              )
            })
          )}
            </div>
          </details>
        </section>

        {/* SECTION 2: REVISE (R2 & R3) */}
        <section>
          <details open className="group">
            <summary className="text-sm font-semibold text-section-lrdi uppercase tracking-wider mb-3 flex items-center gap-2 cursor-pointer list-none select-none">
              🔁 Revise ({(r2r3Items || []).length})
              <span className="ml-auto transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="space-y-3 mt-3 animate-in slide-in-from-top-2 duration-200">
              {(!r2r3Items || r2r3Items.length === 0) ? (
                <div className="p-6 border border-dashed border-white/10 rounded-xl text-center text-text-muted text-sm bg-bg-secondary flex flex-col items-center justify-center">
                  <span className="text-2xl mb-2">📚</span>
                  Revisions will appear here as you study.
                </div>
              ) : (
            (r2r3Items || []).map((item: any) => {
              const details = getTopicDetails(item.topic_id);
              if (!details.topic_name) return null;

              return (
                <TopicCard
                  key={`${item.topic_id}-${item.round}`}
                  topicId={item.topic_id}
                  topicName={details.topic_name}
                  section={details.section || 'VARC'}
                  dayNumber={details.day_number || 0}
                  round={item.round}
                  isOverdue={item.isOverdue}
                  isMockFlagged={item.mock_flagged}
                  onComplete={(conf) => handleR2R3Complete(item.topic_id, item.round, conf)}
                  onSkip={() => handleSkipTopic(item.topic_id, item.round)}
                />
              )
            })
          )}
            </div>
          </details>
        </section>

        {/* SECTION 3: TESTS */}
        <section>
          <details open className="group">
            <summary className="text-sm font-semibold text-round-r3 uppercase tracking-wider mb-3 flex items-center gap-2 cursor-pointer list-none select-none">
              🎯 Tests Recommended ({(testItems || []).length})
              <span className="ml-auto transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="space-y-3 mt-3 animate-in slide-in-from-top-2 duration-200">
              {(!testItems || testItems.length === 0) ? (
                <div className="p-6 border border-dashed border-white/10 rounded-xl text-center text-text-muted text-sm bg-bg-secondary flex flex-col items-center justify-center">
                  <span className="text-2xl mb-2">📝</span>
                  No tests scheduled for today.
                </div>
              ) : (
                (() => {
                  let accumulatedQs = 0;
                  return testItems.map((item: any) => {
                    const details = getTopicDetails(item.topic_id);
                    if (!details.topic_name) return null;
                    
                    const baseQs = item.round === 2 ? 10 : 15;
                    const mult = item.mock_flagged ? 1.5 : 1;
                    const totalQs = Math.floor(baseQs * mult);
                    
                    const isDeferred = accumulatedQs + totalQs > 15;
                    if (!isDeferred) accumulatedQs += totalQs;

                    return (
                      <TestCard
                        key={`test-${item.topic_id}-${item.round}`}
                        topicId={item.topic_id}
                        topicName={details.topic_name}
                        section={details.section || 'VARC'}
                        round={item.round}
                        totalQuestions={totalQs}
                        isDeferred={isDeferred}
                        onLogTest={(correct, total, timeTaken) => handleLogTest(item.topic_id, item.round, correct, total, timeTaken)}
                      />
                    );
                  });
                })()
              )}
            </div>
          </details>
        </section>

        {/* SECTION 4: ALERTS (Mock) */}
        <section className="opacity-60">
          <h2 className="text-sm font-semibold text-status-shaky uppercase tracking-wider mb-3">⚠️ Section Alerts</h2>
          <div className="p-4 border border-white/5 rounded-xl text-center text-text-muted text-sm bg-bg-secondary border-l-[3px] border-l-status-shaky">
            ⚠️ Section alerts coming in Pass 2
          </div>
        </section>

        {/* SECTION 5: SUMMARY (Mock) */}
        <section>
          <h2 className="text-sm font-semibold text-section-varc uppercase tracking-wider mb-3">📊 Daily Summary</h2>
          {(!queue?.queueItems || queue.queueItems.length === 0) ? (
            <div className="p-6 rounded-xl text-center text-status-done text-sm bg-status-done/10 border border-status-done/20">
              <span className="text-2xl block mb-2">💪</span>
              <span className="font-bold text-lg">Perfect day!</span>
              <p className="mt-1 opacity-80">All tasks completed.</p>
            </div>
          ) : (
            <div className="p-4 border border-white/5 rounded-xl bg-bg-secondary">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-text-secondary">Progress today</span>
                <span className="text-sm font-bold text-text-primary">Pending: {(queue?.queueItems || []).length}</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 w-1/4" />
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
