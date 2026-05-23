"use client"

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getDashboardData, DashboardData } from '@/lib/db/dashboard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, BarChart3, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = async (uid: string, force = false) => {
    setLoading(true);
    try {
      const result = await getDashboardData(uid, force);
      setData(result);
      setLastUpdated(new Date());
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
      await loadData(user.id);
    };
    init();
  }, []);

  const handleRefresh = () => {
    if (userId) loadData(userId, true);
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-bg-primary pb-28 max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Skeleton Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <div className="h-6 w-32 bg-white/5 rounded animate-pulse"></div>
            <div className="h-4 w-48 bg-white/5 rounded animate-pulse"></div>
          </div>
          <div className="h-8 w-8 bg-white/5 rounded-full animate-pulse"></div>
        </div>
        {/* Skeleton Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse"></div>)}
        </div>
        {/* More Skeletons */}
        <div className="h-48 bg-white/5 rounded-xl animate-pulse"></div>
        <div className="h-64 bg-white/5 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  // EMPTY STATE for fresh user
  if (!data?.topline.totalR1Done && !data?.topline.totalR2Done && !data?.topline.totalR3Done) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-8 text-center pb-28">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-3xl">
          <BarChart3 className="text-text-muted" />
        </div>
        <h1 className="text-xl font-bold text-text-primary mb-2">Your dashboard is empty</h1>
        <p className="text-sm text-text-secondary mb-6 max-w-xs">Complete a few days on /today and your stats will show up here</p>
        <Link href="/today" className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-bold">
          Go to Today →
        </Link>
      </div>
    );
  }

  const { topline, pipeline, confidence, retention, mocks, weakTopics } = data;

  // Helpers
  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // PIPELINE BAR
  const PipelineBar = ({ name, data, total }: { name: string, data: any, total: number }) => {
    const pMastered = (data.mastered / total) * 100;
    const pR3 = (data.r3 / total) * 100;
    const pR2 = (data.r2 / total) * 100;
    const pR1 = (data.r1 / total) * 100;
    
    return (
      <div className="mb-4 last:mb-0">
        <div className="flex justify-between items-center mb-1.5">
          <Badge variant={name === 'QUANT' ? 'blue' : name === 'LRDI' ? 'orange' : 'green'} className="text-[10px] py-0">{name}</Badge>
          <span className="text-xs text-text-muted">{total} topics</span>
        </div>
        <div className="w-full h-8 bg-bg-tertiary rounded-lg overflow-hidden flex border border-white/5">
          {pMastered > 0 && <div style={{ width: `${pMastered}%` }} className="h-full bg-status-done transition-all group relative" title={`Mastered: ${data.mastered}`} />}
          {pR3 > 0 && <div style={{ width: `${pR3}%` }} className="h-full bg-status-done/50 transition-all group relative border-l border-black/10" title={`R3: ${data.r3}`} />}
          {pR2 > 0 && <div style={{ width: `${pR2}%` }} className="h-full bg-status-okay transition-all group relative border-l border-black/10" title={`R2: ${data.r2}`} />}
          {pR1 > 0 && <div style={{ width: `${pR1}%` }} className="h-full bg-blue-500 transition-all group relative border-l border-black/10" title={`R1: ${data.r1}`} />}
        </div>
        <div className="flex gap-3 mt-1.5 text-[10px] text-text-muted px-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
          {data.notStarted > 0 && <span>Not Started: {data.notStarted}</span>}
          {data.r1 > 0 && <span>R1: {data.r1}</span>}
          {data.r2 > 0 && <span>R2: {data.r2}</span>}
          {data.r3 > 0 && <span>R3: {data.r3}</span>}
          {data.mastered > 0 && <span>Mastered: {data.mastered}</span>}
        </div>
      </div>
    );
  };

  // DONUT CHART
  const DonutChart = ({ data, total }: { data: { shaky: number, okay: number, solid: number }, total: number }) => {
    if (total === 0) {
      return (
        <div className="flex flex-col items-center">
          <svg width="80" height="80" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="15" />
          </svg>
          <span className="text-[10px] text-text-muted mt-2 italic">No data yet</span>
        </div>
      );
    }

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    
    const pSolid = data.solid / total;
    const pOkay = data.okay / total;
    const pShaky = data.shaky / total;
    
    const dashSolid = pSolid * circumference;
    const dashOkay = pOkay * circumference;
    const dashShaky = pShaky * circumference;
    
    let offset = 0;
    
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-[80px] h-[80px]">
          <svg width="80" height="80" viewBox="0 0 100 100" className="transform -rotate-90">
            {/* Background */}
            <circle cx="50" cy="50" r={radius} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="15" />
            
            {/* Solid (Green) */}
            {pSolid > 0 && (
              <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#22c55e" strokeWidth="15" 
                strokeDasharray={`${dashSolid} ${circumference}`} strokeDashoffset={offset} />
            )}
            
            {/* Okay (Yellow) */}
            {pOkay > 0 && (
              <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#eab308" strokeWidth="15" 
                strokeDasharray={`${dashOkay} ${circumference}`} strokeDashoffset={offset - dashSolid} />
            )}
            
            {/* Shaky (Red) */}
            {pShaky > 0 && (
              <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#ef4444" strokeWidth="15" 
                strokeDasharray={`${dashShaky} ${circumference}`} strokeDashoffset={offset - dashSolid - dashOkay} />
            )}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-bold text-sm text-text-primary">
            {total}
          </div>
        </div>
        <div className="mt-3 text-[10px] text-text-muted space-y-0.5 text-center">
          {data.solid > 0 && <div>🟢 Solid: {data.solid}</div>}
          {data.okay > 0 && <div>🟡 Okay: {data.okay}</div>}
          {data.shaky > 0 && <div>🔴 Shaky: {data.shaky}</div>}
        </div>
      </div>
    );
  };

  // Retention Status color
  const getRetentionColor = (rate: number) => {
    if (rate >= 80) return 'text-status-done';
    if (rate >= 60) return 'text-status-okay';
    return 'text-status-shaky';
  };

  return (
    <div className="min-h-screen bg-bg-primary pb-28">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-bg-primary/90 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>
            <p className="text-sm text-text-secondary">Your CAT 2026 progress at a glance</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button onClick={handleRefresh} className={`p-1.5 rounded-full hover:bg-white/10 text-text-muted transition-colors ${loading ? 'animate-spin text-white' : ''}`}>
              <RefreshCw size={16} />
            </button>
            <span className="text-[9px] text-text-muted">Updated {formatTime(lastUpdated)}</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* SECTION 1: TOP-LINE STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-bg-secondary border-none">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1 font-bold">Day</div>
              <div>
                <span className="text-3xl font-black text-blue-400">{topline.currentDay}</span>
                <span className="text-xs text-text-muted ml-1">of 150</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-3">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (topline.currentDay / 150) * 100)}%` }} />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-bg-secondary border-none">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1 font-bold">Mastered</div>
              <div>
                <span className="text-3xl font-black text-status-done">{topline.totalR3Done}</span>
                <span className="text-xs text-text-muted ml-1">of 150</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-3">
                <div className="h-full bg-status-done rounded-full" style={{ width: `${Math.min(100, (topline.totalR3Done / 150) * 100)}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-bg-secondary border-none">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1 font-bold">Days to CAT</div>
              <div>
                <span className={`text-3xl font-black text-orange-400 ${topline.daysToCAT < 30 ? 'animate-pulse drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]' : ''}`}>{topline.daysToCAT}</span>
              </div>
              <div className="text-[10px] text-text-muted mt-3">Nov 29, 2026</div>
            </CardContent>
          </Card>

          <Card className="bg-bg-secondary border-none">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1 font-bold">Status</div>
              <div className="mt-1">
                {topline.catchupMode ? (
                  <Badge className="bg-status-okay/20 text-status-okay border-none">Catch-up Mode</Badge>
                ) : (
                  <Badge className="bg-status-done/20 text-status-done border-none">On Track</Badge>
                )}
              </div>
              <div className="text-[10px] text-text-muted mt-3">
                {topline.catchupMode ? `${Math.max(0, topline.expectedDay - topline.currentDay)} days behind` : 'Keeping pace'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 2: TOPIC PIPELINE BY SECTION */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Pipeline by Section</h2>
          <Card className="bg-bg-secondary border-white/5">
            <CardContent className="p-4 sm:p-5">
              <PipelineBar name="QUANT" data={pipeline.bySection.QUANT} total={75} />
              <div className="h-px bg-white/5 my-4"></div>
              <PipelineBar name="VARC" data={pipeline.bySection.VARC} total={40} />
              <div className="h-px bg-white/5 my-4"></div>
              <PipelineBar name="LRDI" data={pipeline.bySection.LRDI} total={35} />
              
              <div className="mt-6 flex flex-wrap justify-center gap-3 sm:gap-4 text-[10px] text-text-muted">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-status-done"></div> Mastered</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-status-done/50"></div> R3</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-status-okay"></div> R2</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div> R1</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-bg-tertiary border border-white/10"></div> Not Started</div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SECTION 3: CONFIDENCE DISTRIBUTION */}
        <section>
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-text-primary">Confidence Distribution</h2>
            <p className="text-xs text-text-muted">Across topics that have been studied</p>
          </div>
          <Card className="bg-bg-secondary border-white/5">
            <CardContent className="p-4 sm:p-5 grid grid-cols-3 gap-2">
              <div>
                <h3 className="text-[10px] text-center font-bold text-text-muted uppercase tracking-wider mb-3">R1</h3>
                <DonutChart data={confidence.r1} total={confidence.r1.solid + confidence.r1.okay + confidence.r1.shaky} />
              </div>
              <div>
                <h3 className="text-[10px] text-center font-bold text-text-muted uppercase tracking-wider mb-3">R2</h3>
                <DonutChart data={confidence.r2} total={confidence.r2.solid + confidence.r2.okay + confidence.r2.shaky} />
              </div>
              <div>
                <h3 className="text-[10px] text-center font-bold text-text-muted uppercase tracking-wider mb-3">R3</h3>
                <DonutChart data={confidence.r3} total={confidence.r3.solid + confidence.r3.okay + confidence.r3.shaky} />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SECTION 4: RETENTION QUALITY */}
        <section>
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-text-primary">Retention Quality</h2>
            <p className="text-xs text-text-muted">How well are R3 topics holding up?</p>
          </div>
          <Card className="bg-bg-secondary border-white/5 overflow-hidden">
            <CardContent className="p-0">
              <div className="p-5 flex flex-col items-center justify-center border-b border-white/5 bg-bg-tertiary/20">
                <span className={`text-5xl font-black ${getRetentionColor(retention.retentionRate)}`}>{retention.r3Topics.length > 0 ? `${retention.retentionRate}%` : '—'}</span>
                <span className="text-xs text-text-muted mt-1 uppercase tracking-wider font-bold">Topics still rated Solid after R3</span>
              </div>
              
              <div className="max-h-[250px] overflow-y-auto bg-bg-primary/30">
                {retention.r3Topics.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-text-primary mb-1">No topics have reached R3 yet</p>
                    <p className="text-xs text-text-muted">Keep going — your retention data will show up here</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {retention.r3Topics.map(topic => {
                      const isFlagged = topic.currentlyFlagged;
                      const isSolid = topic.r3Confidence === 'solid';
                      const bgClass = isFlagged || topic.r3Confidence === 'shaky' ? 'bg-status-shaky/5' : !isSolid ? 'bg-status-okay/5' : '';
                      const confIcon = topic.r3Confidence === 'solid' ? '🟢' : topic.r3Confidence === 'okay' ? '🟡' : '🔴';
                      
                      return (
                        <div key={topic.topicId} className={`p-3 px-4 flex justify-between items-center ${bgClass}`}>
                          <div className="flex items-center gap-2">
                            <Badge variant={topic.section === 'QUANT' ? 'blue' : topic.section === 'LRDI' ? 'orange' : 'green'} className="text-[9px] py-0">{topic.section}</Badge>
                            <span className="text-sm text-text-primary truncate max-w-[150px] sm:max-w-[200px]" title={topic.topicName}>{topic.topicName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-right">
                            {isFlagged && <Badge variant="destructive" className="bg-status-shaky/20 text-status-shaky border-none text-[9px] py-0 hidden sm:inline-flex">⚠️ Re-flagged</Badge>}
                            <div className="flex flex-col items-end">
                              <span className="text-xs">{confIcon} <span className="text-text-muted ml-1">{topic.daysSinceR3}d ago</span></span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {retention.r3Topics.length > 0 && (
                <div className="p-4 border-t border-white/5 bg-bg-tertiary/20 text-center text-xs font-medium">
                  {retention.retentionRate >= 80 ? (
                    <span className="text-status-done">🟢 Strong retention — the engine is working</span>
                  ) : retention.retentionRate >= 60 ? (
                    <span className="text-status-okay">🟡 Decent retention — consider reviewing flagged topics</span>
                  ) : (
                    <span className="text-status-shaky">🔴 Retention is dropping — book extra revision time</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* SECTION 5: MOCK TRENDS */}
        {mocks.recent.length > 0 && (
          <section>
            <div className="flex justify-between items-end mb-3">
              <h2 className="text-lg font-semibold text-text-primary">Mock Performance</h2>
              <Link href="/mocks" className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
            </div>
            
            <Card className="bg-bg-secondary border-white/5">
              <CardContent className="p-4 sm:p-5">
                {mocks.recent.length === 1 ? (
                  <div className="text-center py-6">
                    <span className="text-2xl mb-2 block">📈</span>
                    <h3 className="text-sm font-bold text-text-primary mb-1">Log one more mock to see trends</h3>
                    <p className="text-xs text-text-muted">Latest: {mocks.latestOverall}%ile</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Mini Chart Area (SVG simplified version) */}
                    <div className="w-full h-[120px] bg-bg-tertiary rounded-lg p-2 relative overflow-hidden border border-white/5">
                      <div className="absolute inset-0 flex items-end justify-between px-4 pb-2">
                        {mocks.recent.slice().reverse().map((m, i) => {
                          const height = m.overallPercentile ? `${m.overallPercentile}%` : '0%';
                          return (
                            <div key={m.id} className="w-8 flex flex-col items-center justify-end h-full gap-1 group relative">
                              <span className="text-[8px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity absolute -top-4">{m.overallPercentile}%</span>
                              <div className="w-4 bg-white/20 rounded-t-sm group-hover:bg-white/40 transition-colors" style={{ height }} />
                              <span className="text-[8px] text-text-muted/50">{m.date.split('-').slice(1).join('/')}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center bg-bg-primary p-3 rounded-lg border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white
                          ${mocks.trend === 'improving' ? 'bg-status-done/20 text-status-done' : 
                            mocks.trend === 'declining' ? 'bg-status-shaky/20 text-status-shaky' : 'bg-status-okay/20 text-status-okay'}
                        `}>
                          {mocks.trend === 'improving' ? <TrendingUp size={20} /> : mocks.trend === 'declining' ? <TrendingDown size={20} /> : <Minus size={20} />}
                        </div>
                        <div>
                          <span className="text-xs text-text-muted block uppercase tracking-wider font-bold">Trend</span>
                          <span className="text-sm font-medium capitalize text-text-primary">{mocks.trend.replace('_', ' ')}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 text-right">
                        <div>
                          <span className="text-[10px] text-text-muted block uppercase tracking-wider">Latest</span>
                          <span className="text-sm font-bold text-text-primary">{mocks.latestOverall}%</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-text-muted block uppercase tracking-wider">Best</span>
                          <span className="text-sm font-bold text-status-done">{mocks.bestOverall}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* SECTION 6: WEAK TOPICS LIST */}
        <section>
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-text-primary">Topics Needing Attention</h2>
            <p className="text-xs text-text-muted">{weakTopics.length} topics flagged</p>
          </div>
          
          <Card className="bg-bg-secondary border-white/5 overflow-hidden">
            {weakTopics.length === 0 ? (
              <div className="p-8 text-center">
                <span className="text-3xl block mb-2">🎉</span>
                <p className="text-sm font-bold text-text-primary mb-1">No weak topics flagged</p>
                <p className="text-xs text-text-muted">Keep going — the engine will alert you when issues arise</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {weakTopics.slice(0, 10).map((wt, idx) => {
                  let badgeVariant = "secondary";
                  let badgeClass = "";
                  if (wt.reason === 'mock_flagged') { badgeVariant = "destructive"; badgeClass = "bg-status-shaky text-white border-none"; }
                  else if (wt.reason === 'persistent_shaky') { badgeVariant = "outline"; badgeClass = "text-status-okay border-status-okay/30"; }
                  else if (wt.reason === 'low_test_accuracy') { badgeVariant = "outline"; badgeClass = "text-yellow-400 border-yellow-400/30"; }
                  
                  return (
                    <Link key={`${wt.topicId}-${idx}`} href={`/topic/${wt.topicId}`} className="flex items-center justify-between p-3 px-4 hover:bg-white/5 transition-colors cursor-pointer group">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={wt.section === 'QUANT' ? 'blue' : wt.section === 'LRDI' ? 'orange' : 'green'} className="text-[9px] py-0">{wt.section}</Badge>
                          <span className="text-sm font-medium text-text-primary truncate" title={wt.topicName}>{wt.topicName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={badgeVariant as any} className={`text-[9px] py-0 ${badgeClass}`}>
                            {wt.reason === 'mock_flagged' ? '⚠️ Mock Flag' : wt.reason.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-text-muted truncate">{wt.detail}</span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-text-muted opacity-50 group-hover:opacity-100 group-hover:text-white transition-all shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </section>

      </div>
    </div>
  );
}
