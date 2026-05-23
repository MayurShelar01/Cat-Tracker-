import { createClient } from '../supabase/client';
import { isSupabase } from './index';
import * as mockDb from '../mockDb';
import { getAllTopics } from './index';

export interface DashboardData {
  topline: {
    currentDay: number;
    expectedDay: number;
    daysToCAT: number;
    catchupMode: boolean;
    totalTopicsDone: number;
    totalR1Done: number;
    totalR2Done: number;
    totalR3Done: number;
    totalNotStarted: number;
  };
  pipeline: {
    bySection: {
      QUANT: { notStarted: number; r1: number; r2: number; r3: number; mastered: number };
      LRDI: { notStarted: number; r1: number; r2: number; r3: number; mastered: number };
      VARC: { notStarted: number; r1: number; r2: number; r3: number; mastered: number };
    };
  };
  confidence: {
    r1: { shaky: number; okay: number; solid: number };
    r2: { shaky: number; okay: number; solid: number };
    r3: { shaky: number; okay: number; solid: number };
  };
  retention: {
    r3Topics: Array<{
      topicId: string;
      topicName: string;
      section: string;
      r3CompletedAt: string;
      r3Confidence: 'shaky' | 'okay' | 'solid';
      daysSinceR3: number;
      currentlyFlagged: boolean;
    }>;
    retentionRate: number;
  };
  mocks: {
    recent: Array<{ id: string; date: string; varcPercentile: number | null; quantPercentile: number | null; lrdiPercentile: number | null; overallPercentile: number | null; mockName: string }>;
    trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
    bestOverall: number | null;
    latestOverall: number | null;
  };
  weakTopics: Array<{
    topicId: string;
    topicName: string;
    section: string;
    reason: 'mock_flagged' | 'persistent_shaky' | 'low_test_accuracy' | 'overdue';
    detail: string;
    lastTouched: string;
  }>;
}

// In-memory cache
let cache: { data: DashboardData; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000;

export async function getDashboardData(userId: string, forceRefresh = false): Promise<DashboardData> {
  if (!forceRefresh && cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  const allTopics = await getAllTopics();

  let userObj: any, userTopics: any[], tests: any[], mocks: any[], mockPerf: any[];

  if (!isSupabase) {
    const db = mockDb.getDb();
    userObj = db.users.find(u => u.id === userId);
    userTopics = db.user_topics.filter(ut => ut.user_id === userId);
    tests = db.test_attempts.filter(t => t.user_id === userId);
    mocks = db.mocks.filter(m => m.user_id === userId && !m.locked);
    mockPerf = db.mock_topic_perf.filter(mp => mocks.some(m => m.id === mp.mock_id));
  } else {
    const supabase = createClient();
    const [userRes, utRes, testsRes, mocksRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('user_topics').select('*').eq('user_id', userId),
      supabase.from('test_attempts').select('*').eq('user_id', userId),
      supabase.from('mocks').select('*').eq('user_id', userId).eq('locked', false)
    ]);

    userObj = userRes.data;
    userTopics = utRes.data || [];
    tests = testsRes.data || [];
    mocks = mocksRes.data || [];

    const mockIds = mocks.map(m => m.id);
    if (mockIds.length > 0) {
      const perfRes = await supabase.from('mock_topic_perf').select('*').in('mock_id', mockIds);
      mockPerf = perfRes.data || [];
    } else {
      mockPerf = [];
    }
  }

  if (!userObj) {
    throw new Error('User not found');
  }

  // --- TOPLINE ---
  const catDate = new Date('2026-11-29T00:00:00Z');
  const todayDate = new Date();
  const daysToCAT = Math.max(0, Math.floor((catDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  const totalR1Done = userTopics.filter(ut => ut.r1_status === 'done').length;
  const totalR2Done = userTopics.filter(ut => !!ut.r2_completed_at).length;
  const totalR3Done = userTopics.filter(ut => !!ut.r3_completed_at).length;
  const totalTopicsDone = totalR3Done; // user requirement
  const totalNotStarted = allTopics.length - userTopics.length;

  const topline = {
    currentDay: userObj.current_day || 1,
    expectedDay: userObj.expected_day || 1,
    daysToCAT,
    catchupMode: !!userObj.catchup_mode,
    totalTopicsDone,
    totalR1Done,
    totalR2Done,
    totalR3Done,
    totalNotStarted
  };

  // --- PIPELINE ---
  const pipeline = {
    bySection: {
      QUANT: { notStarted: 0, r1: 0, r2: 0, r3: 0, mastered: 0 },
      LRDI: { notStarted: 0, r1: 0, r2: 0, r3: 0, mastered: 0 },
      VARC: { notStarted: 0, r1: 0, r2: 0, r3: 0, mastered: 0 }
    }
  };

  allTopics.forEach(t => {
    const sec = t.section as 'QUANT' | 'LRDI' | 'VARC';
    if (!sec || !pipeline.bySection[sec]) return;
    
    const ut = userTopics.find(u => u.topic_id === t.id);
    if (!ut) {
      pipeline.bySection[sec].notStarted++;
    } else if (ut.r3_completed_at) {
      pipeline.bySection[sec].mastered++;
    } else if (ut.r2_completed_at) {
      pipeline.bySection[sec].r3++; // R3 is in progress
    } else if (ut.r1_status === 'done') {
      pipeline.bySection[sec].r2++; // R2 is in progress
    } else {
      pipeline.bySection[sec].r1++; // R1 is in progress
    }
  });

  // --- CONFIDENCE ---
  const confidence = {
    r1: { shaky: 0, okay: 0, solid: 0 },
    r2: { shaky: 0, okay: 0, solid: 0 },
    r3: { shaky: 0, okay: 0, solid: 0 }
  };

  userTopics.forEach(ut => {
    if (ut.r1_confidence) confidence.r1[ut.r1_confidence as 'shaky' | 'okay' | 'solid']++;
    if (ut.r2_confidence) confidence.r2[ut.r2_confidence as 'shaky' | 'okay' | 'solid']++;
    if (ut.r3_confidence) confidence.r3[ut.r3_confidence as 'shaky' | 'okay' | 'solid']++;
  });

  // --- RETENTION ---
  const r3TopicsList = userTopics
    .filter(ut => !!ut.r3_completed_at)
    .map(ut => {
      const topic = allTopics.find(t => t.id === ut.topic_id);
      const r3Date = new Date(ut.r3_completed_at);
      const daysSince = Math.floor((todayDate.getTime() - r3Date.getTime()) / (1000 * 60 * 60 * 24));
      return {
        topicId: ut.topic_id,
        topicName: topic?.topic_name || 'Unknown',
        section: topic?.section || 'VARC',
        r3CompletedAt: ut.r3_completed_at,
        r3Confidence: ut.r3_confidence as 'shaky' | 'okay' | 'solid',
        daysSinceR3: daysSince,
        currentlyFlagged: !!ut.mock_flagged
      };
    })
    .sort((a, b) => b.daysSinceR3 - a.daysSinceR3); // oldest first means largest daysSinceR3 first? 
    // "sorted by daysSinceR3 DESC (oldest first)" -> largest daysSinceR3 is oldest

  let retentionRate = 0;
  if (r3TopicsList.length > 0) {
    const solidUnflagged = r3TopicsList.filter(t => t.r3Confidence === 'solid' && !t.currentlyFlagged).length;
    retentionRate = Math.round((solidUnflagged / r3TopicsList.length) * 100);
  }

  // --- MOCKS ---
  const sortedMocks = [...mocks].sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime());
  const recentMocks = sortedMocks.slice(0, 5).map(m => ({
    id: m.id,
    date: m.taken_at,
    varcPercentile: m.varc_percentile,
    quantPercentile: m.quant_percentile,
    lrdiPercentile: m.lrdi_percentile,
    overallPercentile: m.overall_percentile,
    mockName: m.mock_name || `Mock — ${m.taken_at}`
  }));

  let bestOverall = null;
  if (mocks.length > 0) {
    bestOverall = Math.max(...mocks.map(m => m.overall_percentile || 0));
  }
  const latestOverall = sortedMocks.length > 0 ? (sortedMocks[0].overall_percentile || null) : null;

  let trend: 'improving' | 'declining' | 'stable' | 'insufficient_data' = 'insufficient_data';
  if (sortedMocks.length >= 2) {
    const latestAvg = sortedMocks.slice(0, 2).reduce((sum, m) => sum + (m.overall_percentile || 0), 0) / Math.min(2, sortedMocks.length);
    const prevMocks = sortedMocks.slice(2, 5);
    if (prevMocks.length > 0) {
      const prevAvg = prevMocks.reduce((sum, m) => sum + (m.overall_percentile || 0), 0) / prevMocks.length;
      if (latestAvg >= prevAvg + 5) trend = 'improving';
      else if (latestAvg <= prevAvg - 5) trend = 'declining';
      else trend = 'stable';
    } else {
      // If only 2 mocks exist, compare the 2
      const first = sortedMocks[1].overall_percentile || 0;
      const second = sortedMocks[0].overall_percentile || 0;
      if (second >= first + 5) trend = 'improving';
      else if (second <= first - 5) trend = 'declining';
      else trend = 'stable';
    }
  }

  // --- WEAK TOPICS ---
  const weakTopics = [];
  const todayStr = todayDate.toISOString().split('T')[0];

  for (const ut of userTopics) {
    const topic = allTopics.find(t => t.id === ut.topic_id);
    if (!topic) continue;

    const base = {
      topicId: ut.topic_id,
      topicName: topic.topic_name,
      section: topic.section || 'VARC',
      lastTouched: ut.r3_completed_at || ut.r2_completed_at || ut.r1_completed_at || ''
    };

    if (ut.mock_flagged) {
      // Find the mock that triggered this
      const perf = mockPerf.filter(mp => mp.topic_id === ut.topic_id && mp.accuracy_pct < 60)
        .sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime());
      
      const detailStr = perf.length > 0 ? `Flagged from ${perf[0].mock_name} (${perf[0].accuracy_pct}%)` : `Flagged from Mock`;
      
      weakTopics.push({ ...base, reason: 'mock_flagged' as const, detail: detailStr, priority: 1 });
      continue;
    }

    // Persistent shaky
    let shakyCount = 0;
    if (ut.r1_confidence === 'shaky') shakyCount++;
    if (ut.r2_confidence === 'shaky') shakyCount++;
    if (ut.r3_confidence === 'shaky') shakyCount++;

    if (shakyCount >= 3 || (ut.r3_completed_at && ut.r3_confidence === 'shaky')) {
      weakTopics.push({ ...base, reason: 'persistent_shaky' as const, detail: `Shaky for ${shakyCount} rounds`, priority: 2 });
      continue;
    }

    // Low test accuracy
    const tAtt = tests.filter(t => t.topic_id === ut.topic_id);
    if (tAtt.length > 0) {
      const recentTAtt = tAtt.sort((a, b) => new Date(b.attempted_at).getTime() - new Date(a.attempted_at).getTime())[0];
      if (recentTAtt.accuracy_pct < 50) {
        weakTopics.push({ ...base, reason: 'low_test_accuracy' as const, detail: `Recent test accuracy ${recentTAtt.accuracy_pct}%`, priority: 3 });
        continue;
      }
    }

    // Overdue
    if (ut.r2_due_at && ut.r2_due_at < todayStr && !ut.r2_completed_at) {
      weakTopics.push({ ...base, reason: 'overdue' as const, detail: `R2 overdue since ${ut.r2_due_at}`, priority: 4 });
      continue;
    }
    if (ut.r3_due_at && ut.r3_due_at < todayStr && !ut.r3_completed_at) {
      weakTopics.push({ ...base, reason: 'overdue' as const, detail: `R3 overdue since ${ut.r3_due_at}`, priority: 4 });
      continue;
    }
  }

  // Sort weak topics
  weakTopics.sort((a, b) => a.priority - b.priority);

  const data: DashboardData = {
    topline,
    pipeline,
    confidence,
    retention: { r3Topics: r3TopicsList, retentionRate },
    mocks: { recent: recentMocks, trend, bestOverall, latestOverall },
    weakTopics: weakTopics.map(w => ({ ...w, priority: undefined })) as any
  };

  cache = { data, timestamp: Date.now() };
  return data;
}
