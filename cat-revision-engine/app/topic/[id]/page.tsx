"use client"

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  getTopicById,
  getUserTopic,
  updateUserTopic, 
  getTestAttemptsByTopic, 
  getMockTopicPerf 
} from '@/lib/db';
import { toDateString, addDays } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { generateDailyQueue } from '@/lib/utils/revisionEngine';
import { createClient } from '@/lib/supabase/client';

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = params.id as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [topic, setTopic] = useState<any>(null);
  const [userTopic, setUserTopic] = useState<any>(null);
  const [testAttempts, setTestAttempts] = useState<any[]>([]);
  const [mockPerf, setMockPerf] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!topicId || typeof window === 'undefined') return;
      
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
      
      try {
        const t = await getTopicById(topicId);
        setTopic(t);
        
        const ut = await getUserTopic(user.id, topicId);
        if (ut) {
          setUserTopic(ut);
        }
        
        const tests = await getTestAttemptsByTopic(topicId);
        setTestAttempts(tests);
        
        const mPerf = await getMockTopicPerf(topicId);
        setMockPerf(mPerf);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [topicId, router]);

  if (loading || !topic) {
    return <div className="min-h-screen bg-bg-primary p-8 text-center text-text-muted">Loading topic...</div>;
  }

  // Helpers
  const getSectionBadgeVariant = (sec: string) => {
    if (sec === 'QUANT') return 'blue';
    if (sec === 'LRDI') return 'orange';
    if (sec === 'VARC') return 'green';
    return 'default';
  };

  const getConfLabel = (conf: string | null) => {
    if (conf === 'shaky') return '🔴 Shaky';
    if (conf === 'okay') return '🟡 Okay';
    if (conf === 'solid') return '🟢 Solid';
    return '—';
  };

  const getAccuracyColor = (acc: number) => {
    if (acc >= 80) return 'text-status-done';
    if (acc >= 50) return 'text-status-okay';
    return 'text-status-shaky';
  };

  const handleExtraRevision = async () => {
    if (!userTopic || !userId) return;
    const extraDate = toDateString(new Date());
    await updateUserTopic(userId, topicId, { extra_r2_inserted: true, r2_due_at: extraDate, r2_completed_at: null });
    // Simulate re-queue
    await generateDailyQueue(userId, new Date(extraDate));
    alert(`Extra revision scheduled for today! Check your dashboard.`);
    window.location.reload();
  };

  const handleMarkMastered = async () => {
    if (!userId) return;
    if (confirm("Skip remaining revisions?\n\nThis will mark this topic as mastered and cancel any pending R2/R3 revisions. You can't undo this easily.")) {
      await updateUserTopic(userId, topicId, {
        r1_status: 'done',
        r1_confidence: userTopic?.r1_confidence || 'solid',
        r2_completed_at: toDateString(new Date()),
        r2_confidence: 'solid',
        r3_completed_at: toDateString(new Date()),
        r3_confidence: 'solid'
      });
      alert("Marked as mastered ✅");
      window.location.reload();
    }
  };

  // Timeline State Determination
  const r1State = userTopic?.r1_status === 'done' ? 'done' : userTopic?.r1_status === 'skimmed' ? 'skimmed' : 'not_started';
  
  const today = toDateString(new Date());
  
  let r2State = 'locked';
  if (userTopic?.r2_completed_at) r2State = 'done';
  else if (userTopic?.r2_due_at) {
    if (userTopic.r2_due_at <= today) r2State = 'overdue';
    else r2State = 'upcoming';
  }

  let r3State = 'locked';
  if (userTopic?.r3_completed_at) r3State = 'done';
  else if (userTopic?.r3_due_at) {
    if (userTopic.r3_due_at <= today) r3State = 'overdue';
    else r3State = 'upcoming';
  }
  if (!userTopic?.r2_completed_at) r3State = 'locked';

  // Component rendering helpers for Timeline
  const TimelineCircle = ({ state, label, date, conf, roundColor }: any) => {
    let circleClass = "w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 shrink-0 bg-bg-primary ";
    let icon = "";
    let dateColor = "text-text-muted";

    if (state === 'done') {
      circleClass += "bg-status-done/20 border-status-done text-status-done";
      icon = "✓";
    } else if (state === 'overdue') {
      circleClass += "bg-status-shaky/20 border-status-shaky text-status-shaky";
      icon = "!";
      dateColor = "text-status-shaky";
    } else if (state === 'upcoming') {
      circleClass += `border-dashed border-white/20 text-white/50`;
      icon = "📅";
    } else if (state === 'locked' || state === 'not_started') {
      circleClass += "bg-bg-tertiary border-transparent text-text-muted/50";
      icon = "🔒";
    } else if (state === 'skimmed') {
      circleClass += "bg-status-okay/20 border-status-okay text-status-okay";
      icon = "⏭";
    }

    return (
      <div className="flex flex-row sm:flex-col items-center gap-4 sm:gap-2 relative w-full sm:w-1/3">
        <div className={circleClass}>
          {icon}
        </div>
        <div className="flex flex-col sm:items-center text-left sm:text-center flex-grow">
          <span className="font-semibold text-text-primary text-sm">{label}</span>
          <span className={`text-xs ${dateColor}`}>{date || "—"}</span>
          {conf && <span className="text-xs mt-1 bg-white/5 px-2 py-0.5 rounded-full text-text-muted">{getConfLabel(conf)}</span>}
        </div>
      </div>
    );
  };

  const TimelineLine = ({ state }: { state: string }) => {
    const isDone = state === 'done';
    return (
      <div className={`hidden sm:block absolute top-5 h-[2px] -z-0 transition-colors duration-300 w-[calc(33%-2rem)] ${isDone ? 'bg-status-done' : 'bg-white/10 border-dashed'}`} style={{ left: 'calc(16.66% + 1rem)' }} />
    );
  };

  const TimelineLine2 = ({ state }: { state: string }) => {
    const isDone = state === 'done';
    return (
      <div className={`hidden sm:block absolute top-5 h-[2px] -z-0 transition-colors duration-300 w-[calc(33%-2rem)] ${isDone ? 'bg-status-done' : 'bg-white/10 border-dashed'}`} style={{ left: 'calc(50% + 1rem)' }} />
    );
  };

  return (
    <div className="min-h-screen bg-bg-primary pb-28">
      {/* Header Area */}
      <div className="sticky top-0 z-20 bg-bg-primary/90 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" className="mb-2 -ml-3 text-text-muted hover:text-text-primary" onClick={() => router.back()}>
            ← Back
          </Button>
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge variant={getSectionBadgeVariant(topic.section) as any}>{topic.section}</Badge>
              <span className="text-sm font-medium text-text-muted">Day {topic.day_number}</span>
              {(userTopic as any)?.skip_count > 0 && (
                <Badge variant="orange" className="bg-status-okay/20 text-status-okay">Skipped {(userTopic as any).skip_count} times</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-text-primary">{topic.topic_name}</h1>
            {userTopic?.mock_flagged && (
              <div className="inline-flex mt-1">
                <Badge variant="destructive" className="bg-status-shaky/20 text-status-shaky border-status-shaky/50">⚠️ Flagged from mock</Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        
        {/* SECTION 1: TIMELINE */}
        <Card className="bg-bg-secondary border-white/5">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-6">Revision Timeline</h2>
            
            <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 sm:gap-0">
              <TimelineCircle 
                state={r1State} 
                label={r1State === 'done' ? 'R1 Done' : r1State === 'skimmed' ? 'R1 Skimmed' : 'R1 Pending'} 
                date={userTopic?.r1_completed_at} 
                conf={userTopic?.r1_confidence} 
              />
              <TimelineLine state={r1State} />
              
              <TimelineCircle 
                state={r2State} 
                label={r2State === 'locked' ? 'R2 Locked' : r2State === 'done' ? 'R2 Done' : r2State === 'overdue' ? 'R2 Overdue' : 'R2 Scheduled'} 
                date={userTopic?.r2_completed_at || userTopic?.r2_due_at} 
                conf={userTopic?.r2_confidence} 
              />
              <TimelineLine2 state={r2State} />

              <TimelineCircle 
                state={r3State} 
                label={r3State === 'locked' ? 'R3 Locked' : r3State === 'done' ? 'R3 Done' : r3State === 'overdue' ? 'R3 Overdue' : 'R3 Scheduled'} 
                date={userTopic?.r3_completed_at || userTopic?.r3_due_at} 
                conf={userTopic?.r3_confidence} 
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: CONFIDENCE HISTORY */}
        <Card className="bg-bg-secondary border-white/5">
          <CardContent className="p-0 divide-y divide-white/5">
            {userTopic?.mock_flagged && (
              <div className="p-4 bg-status-shaky/10 text-status-shaky border-b border-status-shaky/20 flex flex-col gap-1">
                <div className="text-sm font-bold flex items-center gap-2">
                  <span>⚠️</span> Downgraded by Mock Feedback
                </div>
                <div className="text-xs opacity-80">
                  Confidence was reduced to trigger an extra review cycle.
                </div>
              </div>
            )}
            <div className="p-4 flex justify-between items-center">
              <span className="font-semibold text-round-r1">R1 Confidence</span>
              {userTopic?.r1_confidence ? (
                <div className="text-right">
                  <span className="text-sm block">{getConfLabel(userTopic.r1_confidence)}</span>
                  <span className="text-xs text-text-muted">{userTopic.r1_completed_at}</span>
                </div>
              ) : (
                <span className="text-sm text-text-muted italic">pending</span>
              )}
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="font-semibold text-round-r2">R2 Confidence</span>
              {userTopic?.r2_confidence ? (
                <div className="text-right">
                  <span className="text-sm block">{getConfLabel(userTopic.r2_confidence)}</span>
                  <span className="text-xs text-text-muted">{userTopic.r2_completed_at}</span>
                </div>
              ) : (
                <span className="text-sm text-text-muted italic">{userTopic?.r2_due_at ? 'scheduled' : 'locked'}</span>
              )}
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="font-semibold text-round-r3">R3 Confidence</span>
              {userTopic?.r3_confidence ? (
                <div className="text-right">
                  <span className="text-sm block">{getConfLabel(userTopic.r3_confidence)}</span>
                  <span className="text-xs text-text-muted">{userTopic.r3_completed_at}</span>
                </div>
              ) : (
                <span className="text-sm text-text-muted italic">{userTopic?.r3_due_at ? 'scheduled' : 'locked'}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: TEST PERFORMANCE */}
        <Card className="bg-bg-secondary border-white/5">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Test Performance</h2>
            
            {testAttempts.length === 0 ? (
              <div className="text-center p-6 border border-dashed border-white/10 rounded-xl bg-bg-tertiary">
                <span className="text-text-muted text-sm">No tests attempted yet</span>
                {r1State === 'done' && (
                  <div className="mt-2 text-xs text-section-varc">Recommended: 5 questions</div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-bg-tertiary p-3 rounded-lg border border-white/5">
                  <div className="text-center">
                    <span className="text-xs text-text-muted block">Total</span>
                    <span className="font-bold text-lg text-text-primary">{testAttempts.length}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-text-muted block">Avg Accuracy</span>
                    <span className="font-bold text-lg text-text-primary">
                      {Math.round(testAttempts.reduce((acc, curr) => acc + curr.accuracy_pct, 0) / testAttempts.length)}%
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {testAttempts.map((test, idx) => (
                    <div key={test.id} className="flex justify-between items-center p-3 border border-white/5 rounded-lg bg-bg-primary">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] py-0">R{test.round}</Badge>
                          <span className="text-xs text-text-muted">{test.attempted_at}</span>
                        </div>
                        <div className="text-sm font-medium text-text-primary">Score: {test.correct}/{test.total_questions}</div>
                        {test.time_taken && <div className="text-xs text-text-muted mt-0.5">{test.time_taken} min</div>}
                      </div>
                      <div className={`text-xl font-bold ${getAccuracyColor(test.accuracy_pct)}`}>
                        {test.accuracy_pct}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 4: MOCK APPEARANCES */}
        {mockPerf.length > 0 && (
          <Card className="bg-bg-secondary border-white/5">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Mock Appearances</h2>
              <div className="space-y-3">
                {mockPerf.map(mock => {
                  const isTrigger = mock.accuracy_pct < 60;
                  return (
                    <div key={mock.id} className={`flex justify-between items-center p-3 border rounded-lg ${isTrigger ? 'border-status-shaky/30 bg-status-shaky/5' : 'border-white/5 bg-bg-primary'}`}>
                      <div>
                        <span className="text-sm font-medium text-text-primary block">
                          {mock.mock_name}
                          {isTrigger && <Badge variant="destructive" className="ml-2 bg-status-shaky text-white border-none text-[9px] py-0">Triggered Flag</Badge>}
                        </span>
                        <span className="text-xs text-text-muted">{mock.taken_at}</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${getAccuracyColor(mock.accuracy_pct)}`}>
                          {mock.accuracy_pct}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* SECTION 5: MANUAL OVERRIDES */}
        <div className="pt-6 pb-20">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-[1px] bg-white/10 flex-grow"></div>
            <span className="text-xs text-text-muted uppercase tracking-widest">Actions</span>
            <div className="h-[1px] bg-white/10 flex-grow"></div>
          </div>
          
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full h-12 bg-transparent border-white/20 text-text-primary hover:bg-white/5"
              onClick={handleExtraRevision}
              disabled={userTopic?.extra_r2_inserted && !userTopic?.r2_completed_at}
            >
              {userTopic?.extra_r2_inserted && !userTopic?.r2_completed_at 
                ? "✅ Review scheduled for today" 
                : "Force Review Today"
              }
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full h-12 text-text-muted hover:text-status-shaky hover:bg-status-shaky/10"
              onClick={handleMarkMastered}
            >
              Mark as Mastered
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
