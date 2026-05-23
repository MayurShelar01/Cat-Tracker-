"use client"

import React, { useState, useEffect } from 'react';
import { getMocks, createMock, getMockTopicPerfByMock, getAllTopics } from '@/lib/db';
import { toDateString } from '@/lib/mockDb'; // just for utility
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TopicPicker } from '@/components/features/TopicPicker';
import { ChevronDown, ChevronUp, Lock, X, Plus, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { applyMockFeedback, MockFeedbackResult } from '@/lib/engine/mockFeedback';

const TrendChart = ({ mocks }: { mocks: any[] }) => {
  if (mocks.length < 2) {
    return (
      <div className="bg-bg-secondary rounded-xl p-8 text-center text-text-muted border border-white/5">
        <span className="text-2xl mb-2 block">📈</span>
        Log one more mock to see trends
      </div>
    );
  }

  const chartData = [...mocks].reverse();
  const w = 600;
  const h = 250;
  const pad = 20;
  
  const minX = 0;
  const maxX = chartData.length - 1;
  const minY = 0;
  const maxY = 100;

  const getX = (idx: number) => pad + (idx / maxX) * (w - 2 * pad);
  const getY = (val: number) => h - pad - (val / maxY) * (h - 2 * pad);

  const getPoints = (key: string) => {
    return chartData.map((m, i) => {
      const val = m[key] as number | null;
      if (val === null || val === undefined) return '';
      return `${getX(i)},${getY(val)}`;
    }).filter(Boolean).join(' ');
  };

  return (
    <div className="bg-bg-secondary rounded-xl p-4 w-full border border-white/5">
      <h2 className="text-lg font-semibold text-text-primary mb-4">Score Trends</h2>
      <div className="relative w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
        <div className="min-w-[400px]">
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[250px] sm:h-[300px] overflow-visible">
            {/* Grid */}
            <line x1={pad} y1={getY(0)} x2={w-pad} y2={getY(0)} className="stroke-white/10" strokeWidth="1" />
            <text x={pad} y={getY(0)-5} fill="#a3a3a3" fontSize="10">0%</text>
            
            <line x1={pad} y1={getY(50)} x2={w-pad} y2={getY(50)} className="stroke-white/10" strokeWidth="1" />
            <text x={pad} y={getY(50)-5} fill="#a3a3a3" fontSize="10">50%</text>
            
            <line x1={pad} y1={getY(100)} x2={w-pad} y2={getY(100)} className="stroke-white/10" strokeWidth="1" />
            <text x={pad} y={getY(100)-5} fill="#a3a3a3" fontSize="10">100%</text>
            
            {/* Lines */}
            <polyline fill="none" stroke="#22c55e" strokeWidth="2" points={getPoints('varc_percentile')} />
            <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={getPoints('quant_percentile')} />
            <polyline fill="none" stroke="#f97316" strokeWidth="2" points={getPoints('lrdi_percentile')} />
            <polyline fill="none" stroke="#a3a3a3" strokeWidth="2" strokeDasharray="5,5" points={getPoints('overall_percentile')} />
            
            {/* Dots */}
            {chartData.map((m, i) => {
              const x = getX(i);
              return (
                <g key={m.id}>
                  {m.varc_percentile != null && <circle cx={x} cy={getY(m.varc_percentile)} r="4" fill="#22c55e" className="transition-all hover:r-6 cursor-pointer" />}
                  {m.quant_percentile != null && <circle cx={x} cy={getY(m.quant_percentile)} r="4" fill="#3b82f6" className="transition-all hover:r-6 cursor-pointer" />}
                  {m.lrdi_percentile != null && <circle cx={x} cy={getY(m.lrdi_percentile)} r="4" fill="#f97316" className="transition-all hover:r-6 cursor-pointer" />}
                  {m.overall_percentile != null && <circle cx={x} cy={getY(m.overall_percentile)} r="4" fill="#a3a3a3" className="transition-all hover:r-6 cursor-pointer" />}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs text-text-muted">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-section-varc"></div> VARC</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-section-quant"></div> Quants</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-section-lrdi"></div> LRDI</div>
        <div className="flex items-center gap-1"><div className="w-4 h-[2px] border-t-2 border-dashed border-text-muted"></div> Overall</div>
      </div>
    </div>
  );
};

export default function MocksPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [mocks, setMocks] = useState<any[]>([]);
  const [mockPerfs, setMockPerfs] = useState<Record<string, any[]>>({});
  const [allTopics, setAllTopics] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedMocks, setExpandedMocks] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [feedbackResult, setFeedbackResult] = useState<MockFeedbackResult | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    mock_name: "",
    taken_at: toDateString(new Date()),
    varc_score: "", quant_score: "", lrdi_score: "",
    varc_percentile: "", quant_percentile: "", lrdi_percentile: "",
    overall_percentile: "",
    total_score: "",
    notes: ""
  });
  
  const [topicRows, setTopicRows] = useState<{ id: string, topic_id: string | null, accuracy_pct: string }[]>([]);
  const [showTopicRows, setShowTopicRows] = useState(false);

  const loadData = async (uid: string) => {
    try {
      const loadedMocks = await getMocks(uid);
      setMocks(loadedMocks);
      
      const perfs: Record<string, any[]> = {};
      for (const m of loadedMocks) {
        perfs[m.id] = await getMockTopicPerfByMock(m.id);
      }
      setMockPerfs(perfs);
      
      const topics = await getAllTopics();
      setAllTopics(topics);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await loadData(user.id);
      } else {
        window.location.href = '/login';
      }
    };
    init();
  }, []);

  // Auto-calculate total score
  useEffect(() => {
    const v = parseInt(formData.varc_score) || 0;
    const q = parseInt(formData.quant_score) || 0;
    const l = parseInt(formData.lrdi_score) || 0;
    if (v || q || l) {
      setFormData(prev => ({ ...prev, total_score: (v + q + l).toString() }));
    }
  }, [formData.varc_score, formData.quant_score, formData.lrdi_score]);

  const handleSave = async () => {
    if (!formData.taken_at || !userId) {
      alert("Date is required");
      return;
    }
    
    setSubmitting(true);
    try {
      // Clean topic rows
      const validTopicRows = topicRows
        .filter(r => r.topic_id && r.accuracy_pct)
        .map(r => ({ topic_id: r.topic_id as string, accuracy_pct: parseInt(r.accuracy_pct) || 0 }));

      await createMock({
        user_id: userId,
        taken_at: formData.taken_at,
        mock_name: formData.mock_name,
        varc_score: formData.varc_score ? parseInt(formData.varc_score) : null,
        quant_score: formData.quant_score ? parseInt(formData.quant_score) : null,
        lrdi_score: formData.lrdi_score ? parseInt(formData.lrdi_score) : null,
        total_score: parseInt(formData.total_score) || 0,
        varc_percentile: formData.varc_percentile ? parseInt(formData.varc_percentile) : null,
        quant_percentile: formData.quant_percentile ? parseInt(formData.quant_percentile) : null,
        lrdi_percentile: formData.lrdi_percentile ? parseInt(formData.lrdi_percentile) : null,
        overall_percentile: formData.overall_percentile ? parseInt(formData.overall_percentile) : null,
        notes: formData.notes
      }, validTopicRows);

      const feedback = await applyMockFeedback(newMock.id, userId);

      if (feedback.totalFlagged > 0) {
        setFeedbackResult(feedback);
        setShowFeedbackModal(true);
      } else {
        alert("Mock logged ✅");
      }
      
      // Reset form
      setFormData({
        mock_name: "", taken_at: toDateString(new Date()),
        varc_score: "", quant_score: "", lrdi_score: "",
        varc_percentile: "", quant_percentile: "", lrdi_percentile: "",
        overall_percentile: "", total_score: "", notes: ""
      });
      setTopicRows([]);
      setShowForm(false);
      await loadData(userId);
    } catch (err) {
      console.error(err);
      alert("Failed to save mock");
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (pct: number | null) => {
    if (pct === null) return 'text-text-primary';
    if (pct >= 90) return 'text-status-done';
    if (pct >= 70) return 'text-status-okay';
    return 'text-status-shaky';
  };

  const InputSection = ({ label, prefix, scoreKey, pctKey }: any) => (
    <div className={`p-3 bg-bg-tertiary rounded-xl border-l-[3px] border-l-section-${prefix}`}>
      <div className="text-xs text-text-muted mb-2 uppercase tracking-wider font-bold">{label}</div>
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Score"
          className="w-full bg-transparent border border-white/10 rounded-lg h-10 px-2 text-sm text-text-primary text-center focus:border-white/30 outline-none"
          value={(formData as any)[scoreKey]}
          onChange={e => setFormData({ ...formData, [scoreKey]: e.target.value })}
        />
        <input
          type="number"
          placeholder="%ile"
          className="w-full bg-transparent border border-white/10 rounded-lg h-10 px-2 text-sm text-text-primary text-center focus:border-white/30 outline-none"
          value={(formData as any)[pctKey]}
          onChange={e => setFormData({ ...formData, [pctKey]: e.target.value })}
        />
      </div>
    </div>
  );

  if (loading) {
    return <div className="min-h-screen bg-bg-primary p-8 text-center text-text-muted">Loading mocks...</div>;
  }

  const getConfidenceChangeText = (prev: string | null, next: string) => {
    const p = prev === 'solid' ? '🟢 Solid' : prev === 'okay' ? '🟡 Okay' : prev === 'shaky' ? '🔴 Shaky' : '—';
    const n = next === 'solid' ? '🟢 Solid' : next === 'okay' ? '🟡 Okay' : next === 'shaky' ? '🔴 Shaky' : '—';
    if (prev === next && next === 'shaky') return '🔴 Shaky → 🔴 Shaky (re-flagged)';
    return `${p} → ${n}`;
  };

  return (
    <div className="min-h-screen bg-bg-primary pb-28">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-bg-primary/80 backdrop-blur-xl border-b border-white/5 px-4 py-4 shadow-sm">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Mock Tests</h1>
            <p className="text-sm text-text-secondary">Log your mocks and track progress</p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg px-4 h-10 font-medium border-none shadow-lg shadow-purple-500/20">
              <Plus size={16} className="mr-1" /> Log Mock
            </Button>
          )}
        </div>
      </div>

      {/* FEEDBACK MODAL */}
      {showFeedbackModal && feedbackResult && (
        <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center bg-bg-primary/90 sm:bg-black/60 backdrop-blur-xl animate-in fade-in">
          <div className="flex-1 w-full sm:flex-initial sm:w-full sm:max-w-md flex flex-col bg-bg-primary sm:bg-bg-secondary sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-8">
            <div className="p-6 pb-4 border-b border-white/5 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-status-shaky/20 text-status-shaky flex items-center justify-center text-2xl mb-4 border border-status-shaky/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                ⚠️
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-1">Engine adjusted your plan</h2>
              <p className="text-sm text-text-secondary">Based on {feedbackResult.mockName}, {feedbackResult.totalFlagged} topics need extra attention</p>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[50vh] sm:max-h-[40vh] space-y-3 bg-bg-primary/50">
              {feedbackResult.flaggedTopics.slice(0, 10).map(ft => (
                <div key={ft.topicId} className="bg-bg-secondary rounded-xl p-3 border-l-[3px] border-l-status-shaky border-y border-white/5 border-r border-white/5 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={ft.section === 'VARC' ? 'green' : ft.section === 'QUANT' ? 'blue' : 'orange'} className="text-[10px] py-0">{ft.section}</Badge>
                      <span className="font-medium text-text-primary text-sm truncate max-w-[150px]" title={ft.topicName}>{ft.topicName}</span>
                    </div>
                    <span className="text-status-shaky font-bold text-sm">{ft.accuracyPct}%</span>
                  </div>
                  <div className="text-xs text-text-muted flex flex-col gap-1.5 mt-2 bg-bg-tertiary/50 p-2 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span>Confidence</span>
                      <span className="font-medium text-text-secondary">{getConfidenceChangeText(ft.previousConfidence, ft.newConfidence)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Next action</span>
                      <span className="font-medium text-text-secondary flex items-center gap-1">
                        <Calendar size={12} /> Extra revision: {new Date(ft.extraR2Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {feedbackResult.totalFlagged > 10 && (
                <div className="text-center text-xs text-text-muted py-2 italic">
                  ... and {feedbackResult.totalFlagged - 10} more topics
                </div>
              )}
            </div>
            
            <div className="p-4 sm:p-6 border-t border-white/5 bg-bg-secondary sm:bg-transparent mt-auto">
              <div className="flex justify-between text-xs text-text-muted mb-4 px-2">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-shaky"></span> {feedbackResult.totalFlagged} flags added</span>
                <span className="flex items-center gap-1.5"><Calendar size={10} /> +{feedbackResult.totalFlagged} revisions</span>
              </div>
              <Button 
                className="w-full bg-gradient-to-r from-status-shaky to-orange-600 hover:from-status-shaky/90 hover:to-orange-600/90 text-white font-bold h-12 rounded-xl shadow-lg shadow-status-shaky/20 border-none"
                onClick={() => {
                  setShowFeedbackModal(false);
                  window.location.href = '/today';
                }}
              >
                Got it — adjust my plan
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto p-4 space-y-8 mt-2">
        
        {/* LOG MOCK FORM */}
        {showForm && (
          <Card className="bg-bg-secondary border border-white/10 shadow-2xl animate-in fade-in slide-in-from-top-4">
            <CardContent className="p-5 space-y-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-text-primary">Log New Mock</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="text-text-muted hover:text-white h-8 w-8">
                  <X size={18} />
                </Button>
              </div>

              {/* Row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Mock Name</label>
                  <input type="text" placeholder="e.g., Cracku Mock 5" className="w-full bg-bg-tertiary border border-white/10 rounded-lg h-10 px-3 text-sm text-text-primary focus:border-white/30 outline-none" value={formData.mock_name} onChange={e => setFormData({ ...formData, mock_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Date Taken <span className="text-status-shaky">*</span></label>
                  <input type="date" className="w-full bg-bg-tertiary border border-white/10 rounded-lg h-10 px-3 text-sm text-text-primary focus:border-white/30 outline-none" value={formData.taken_at} onChange={e => setFormData({ ...formData, taken_at: e.target.value })} />
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InputSection label="VARC" prefix="varc" scoreKey="varc_score" pctKey="varc_percentile" />
                <InputSection label="Quants" prefix="quant" scoreKey="quant_score" pctKey="quant_percentile" />
                <InputSection label="LRDI" prefix="lrdi" scoreKey="lrdi_score" pctKey="lrdi_percentile" />
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-bg-primary rounded-xl border border-white/5">
                <div className="space-y-1.5 text-center">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Score</label>
                  <input type="number" placeholder="0" className="w-full bg-transparent border-none rounded-lg h-10 px-2 text-xl font-bold text-text-primary text-center outline-none" value={formData.total_score} onChange={e => setFormData({ ...formData, total_score: e.target.value })} />
                </div>
                <div className="space-y-1.5 text-center border-l border-white/5">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Overall %ile</label>
                  <input type="number" placeholder="0.00" className="w-full bg-transparent border-none rounded-lg h-10 px-2 text-xl font-bold text-text-primary text-center outline-none" value={formData.overall_percentile} onChange={e => setFormData({ ...formData, overall_percentile: e.target.value })} />
                </div>
              </div>

              {/* Row 4 */}
              <div className="border border-white/5 rounded-xl bg-bg-tertiary overflow-hidden">
                <button 
                  className="w-full p-4 flex justify-between items-center hover:bg-white/5"
                  onClick={() => setShowTopicRows(!showTopicRows)}
                >
                  <span className="text-sm font-semibold text-text-primary">Topic Performance (optional)</span>
                  {showTopicRows ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
                </button>
                
                {showTopicRows && (
                  <div className="p-4 pt-0 space-y-3">
                    {topicRows.map((row, idx) => (
                      <div key={row.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center p-3 border border-white/5 rounded-lg bg-bg-secondary">
                        <div className="w-full sm:flex-grow">
                          <TopicPicker 
                            topics={allTopics}
                            selectedId={row.topic_id}
                            onSelect={(id) => {
                              const newRows = [...topicRows];
                              newRows[idx].topic_id = id;
                              setTopicRows(newRows);
                            }}
                            excludeIds={topicRows.map(r => r.topic_id).filter(Boolean) as string[]}
                          />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <input 
                            type="number" 
                            placeholder="Acc %" 
                            className="w-full sm:w-24 bg-bg-tertiary border border-white/10 rounded-lg h-10 px-2 text-sm text-text-primary text-center focus:border-white/30 outline-none"
                            value={row.accuracy_pct}
                            onChange={(e) => {
                              const newRows = [...topicRows];
                              newRows[idx].accuracy_pct = e.target.value;
                              setTopicRows(newRows);
                            }}
                          />
                          <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10 text-text-muted hover:text-status-shaky hover:bg-status-shaky/10" onClick={() => setTopicRows(topicRows.filter(r => r.id !== row.id))}>
                            <X size={16} />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full border-dashed border-white/20 text-text-muted hover:text-white hover:border-white/40" onClick={() => setTopicRows([...topicRows, { id: `row-${Date.now()}`, topic_id: null, accuracy_pct: "" }])}>
                      + Add Topic
                    </Button>
                  </div>
                )}
              </div>

              {/* Row 5 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Notes</label>
                <textarea 
                  placeholder="Any observations? Weak areas? Time management issues?" 
                  className="w-full bg-bg-tertiary border border-white/10 rounded-lg p-3 text-sm text-text-primary focus:border-white/30 outline-none resize-y min-h-[80px]"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <Button variant="ghost" className="w-full sm:w-auto text-text-muted" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button disabled={submitting} className="w-full sm:flex-grow bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg h-12 sm:h-10 font-bold border-none" onClick={handleSave}>
                  {submitting ? "Saving..." : "Save Mock"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* EMPTY STATE */}
        {!showForm && mocks.length === 0 && (
          <div className="text-center p-12 bg-bg-secondary rounded-2xl border border-white/5">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-bold text-text-primary mb-2">No mocks logged yet</h3>
            <p className="text-sm text-text-muted mb-6">Log your first mock to start tracking progress</p>
            <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg px-6 border-none">
              <Plus size={16} className="mr-2" /> Log Mock
            </Button>
          </div>
        )}

        {/* TREND CHART */}
        {!showForm && mocks.length > 0 && (
          <TrendChart mocks={mocks} />
        )}

        {/* MOCK HISTORY */}
        {!showForm && mocks.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-text-primary px-1">Mock History</h2>
            
            {mocks.map((mock) => {
              const perfs = mockPerfs[mock.id] || [];
              const isExpanded = expandedMocks[mock.id];
              
              return (
                <Card key={mock.id} className={`bg-bg-secondary border border-white/5 transition-opacity ${mock.locked ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                  <CardContent className="p-0">
                    {/* Top Row */}
                    <div className="p-4 sm:p-5 flex justify-between items-start border-b border-white/5 relative">
                      {mock.locked && (
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-1 bg-black/40 rounded-md text-[10px] font-bold text-text-muted uppercase tracking-wider" title="Locked — complete more R1 topics to unlock">
                          <Lock size={12} />
                          Locked
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium text-text-primary text-base mb-1">
                          {mock.mock_name || `Mock — ${mock.taken_at}`}
                          {perfs.some(p => p.accuracy_pct < 60) && (
                            <Badge variant="destructive" className="ml-2 bg-status-shaky/20 text-status-shaky border-status-shaky/30 text-[10px] py-0 align-middle">
                              {perfs.filter(p => p.accuracy_pct < 60).length} flags
                            </Badge>
                          )}
                        </h3>
                        <div className="text-xs text-text-muted flex items-center gap-2">
                          📅 {mock.taken_at}
                          <span className="w-1 h-1 rounded-full bg-white/20"></span>
                          {mock.total_score} marks
                        </div>
                      </div>
                      
                      {!mock.locked && (
                        <div className="text-right">
                          <div className={`text-2xl font-black ${getScoreColor(mock.overall_percentile)}`}>
                            {mock.overall_percentile ? `${mock.overall_percentile}%ile` : '—'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section Mini-cards */}
                    <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
                      <div className="p-3 text-center border-t-[3px] border-t-transparent sm:border-t-0 sm:border-b-[3px] sm:border-b-transparent hover:bg-white/5 group border-b-section-varc">
                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">VARC</div>
                        <div className="text-sm font-semibold text-text-primary">{mock.varc_score ?? '—'}</div>
                        <div className={`text-xs ${getScoreColor(mock.varc_percentile)}`}>{mock.varc_percentile ?? '—'}%</div>
                      </div>
                      <div className="p-3 text-center border-t-[3px] border-t-transparent sm:border-t-0 sm:border-b-[3px] sm:border-b-transparent hover:bg-white/5 group border-b-section-quant">
                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Quant</div>
                        <div className="text-sm font-semibold text-text-primary">{mock.quant_score ?? '—'}</div>
                        <div className={`text-xs ${getScoreColor(mock.quant_percentile)}`}>{mock.quant_percentile ?? '—'}%</div>
                      </div>
                      <div className="p-3 text-center border-t-[3px] border-t-transparent sm:border-t-0 sm:border-b-[3px] sm:border-b-transparent hover:bg-white/5 group border-b-section-lrdi">
                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">LRDI</div>
                        <div className="text-sm font-semibold text-text-primary">{mock.lrdi_score ?? '—'}</div>
                        <div className={`text-xs ${getScoreColor(mock.lrdi_percentile)}`}>{mock.lrdi_percentile ?? '—'}%</div>
                      </div>
                    </div>

                    {/* Topic Performance */}
                    {perfs.length > 0 && (
                      <div className="border-b border-white/5">
                        <button 
                          className="w-full p-3 px-4 flex justify-between items-center hover:bg-white/5 text-xs text-text-muted"
                          onClick={() => setExpandedMocks({ ...expandedMocks, [mock.id]: !isExpanded })}
                        >
                          <span>{perfs.length} topics tagged</span>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        
                        {isExpanded && (
                          <div className="px-4 pb-3 space-y-2 animate-in slide-in-from-top-2">
                            {perfs.map(p => {
                              const t = allTopics.find(x => x.id === p.topic_id);
                              return (
                                <div key={p.id} className="flex justify-between items-center text-sm py-1">
                                  <div className="flex items-center gap-2 truncate pr-4">
                                    <Badge variant="outline" className="text-[9px] py-0">{t?.section || '?'}</Badge>
                                    <span className="text-text-secondary truncate">{t?.topic_name || 'Unknown Topic'}</span>
                                  </div>
                                  <div className={`font-medium shrink-0 flex items-center gap-1 ${getScoreColor(p.accuracy_pct)}`}>
                                    {p.accuracy_pct}% 
                                    {p.accuracy_pct < 60 && <span title="Triggered re-revision">⚠️</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes Preview */}
                    {mock.notes && (
                      <div className="p-4 bg-bg-tertiary/30 text-xs italic text-text-muted border-t border-white/5">
                        "{mock.notes.length > 80 ? mock.notes.substring(0, 80) + '...' : mock.notes}"
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
