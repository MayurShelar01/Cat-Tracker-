import { Topic, getBacklogTopics, mockTopics } from "./mockData";
export { mockTopics };
import { Confidence } from "./utils/revisionEngine";

export interface User {
  id: string;
  email: string;
  varc_percentile: number;
  quant_percentile: number;
  lrdi_percentile: number;
  current_day: number;
  catchup_mode: boolean;
}

export type R1Status = 'not_started' | 'skimmed' | 'done';
export type CatchupTag = 'never_touched' | 'vaguely_remember' | 'studied_before';

export interface UserTopic {
  id: string;
  user_id: string;
  topic_id: string;
  // R1
  r1_status: R1Status;
  r1_completed_at: string | null;
  r1_confidence: Confidence | null;
  catchup_tag: CatchupTag | null;
  // R2
  r2_due_at: string | null;
  r2_completed_at: string | null;
  r2_confidence: Confidence | null;
  // R3
  r3_due_at: string | null;
  r3_completed_at: string | null;
  r3_confidence: Confidence | null;
  // Meta
  mock_flagged: boolean;
  extra_r2_inserted: boolean;
}

export interface QueueItem {
  topic_id: string;
  round: number; // 1, 2, or 3
  type: 'r1' | 'r2' | 'r3' | 'test';
  priority: number;
}

export interface TestAttempt {
  id: string;
  topic_id: string;
  round: number;
  attempted_at: string;
  total_questions: number;
  correct: number;
  accuracy_pct: number;
  time_taken: number | null;
}

export interface MockTest {
  id: string;
  user_id: string;
  taken_at: string;
  mock_name: string;
  varc_score: number | null;
  quant_score: number | null;
  lrdi_score: number | null;
  total_score: number;
  varc_percentile: number | null;
  quant_percentile: number | null;
  lrdi_percentile: number | null;
  overall_percentile: number | null;
  locked: boolean;
  notes: string;
}

export interface MockTopicPerf {
  id: string;
  mock_id: string;
  topic_id: string;
  mock_name: string;
  taken_at: string;
  accuracy_pct: number;
}

export interface DailyQueue {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  items: QueueItem[];
  load_score: number;
  rebalanced: boolean;
}

const DB_KEY = 'cat_mock_db';

interface MockDBState {
  users: User[];
  userTopics: UserTopic[];
  dailyQueues: DailyQueue[];
  mocks: MockTest[];
  mockTopicPerf: MockTopicPerf[];
}

export const getDb = (): MockDBState => {
  if (typeof window === 'undefined') {
    return { users: [], userTopics: [], dailyQueues: [], mocks: [], mockTopicPerf: [] };
  }
  const data = localStorage.getItem(DB_KEY);
  if (data) {
    const parsed = JSON.parse(data);
    // Migration: add missing arrays
    if (!parsed.mocks) parsed.mocks = [];
    if (!parsed.mockTopicPerf) parsed.mockTopicPerf = [];
    return parsed;
  }
  // Initialize defaults
  const initialState: MockDBState = {
    users: [{
      id: 'mock-user-1',
      email: 'user@example.com',
      varc_percentile: 0,
      quant_percentile: 0,
      lrdi_percentile: 0,
      current_day: 1,
      catchup_mode: true
    }],
    userTopics: [],
    dailyQueues: [],
    mocks: [],
    mockTopicPerf: []
  };
  localStorage.setItem(DB_KEY, JSON.stringify(initialState));
  return initialState;
};

export const saveDb = (state: MockDBState) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DB_KEY, JSON.stringify(state));
  }
};

export const clearDb = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DB_KEY);
    localStorage.removeItem('cat_triage_plan');
    localStorage.removeItem('cat_diagnostic');
  }
};

export const getUserTopics = () => getDb().userTopics;

export const updateUserTopic = (topicId: string, updates: Partial<UserTopic>) => {
  const db = getDb();
  const index = db.userTopics.findIndex(ut => ut.topic_id === topicId);
  if (index >= 0) {
    db.userTopics[index] = { ...db.userTopics[index], ...updates };
  } else {
    // If doesn't exist, create it (usually from triage)
    db.userTopics.push({
      id: `ut-${Date.now()}-${Math.random()}`,
      user_id: 'mock-user-1',
      topic_id: topicId,
      r1_status: 'not_started',
      r1_completed_at: null,
      r1_confidence: null,
      catchup_tag: null,
      r2_due_at: null,
      r2_completed_at: null,
      r2_confidence: null,
      r3_due_at: null,
      r3_completed_at: null,
      r3_confidence: null,
      mock_flagged: false,
      extra_r2_inserted: false,
      ...updates
    });
  }
  saveDb(db);
};

export const getDailyQueue = (date: string): DailyQueue | undefined => {
  return getDb().dailyQueues.find(q => q.date === date);
};

export const saveDailyQueue = (date: string, queue: Omit<DailyQueue, 'id' | 'user_id'>) => {
  const db = getDb();
  const index = db.dailyQueues.findIndex(q => q.date === date);
  const newQueue: DailyQueue = {
    id: `dq-${date}`,
    user_id: 'mock-user-1',
    ...queue
  };
  if (index >= 0) {
    db.dailyQueues[index] = newQueue;
  } else {
    db.dailyQueues.push(newQueue);
  }
  saveDb(db);
};

export const getMocks = (): MockTest[] => {
  return getDb().mocks.sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime());
};

export const saveMock = (
  mockData: Omit<MockTest, 'id' | 'user_id' | 'locked'>,
  topicPerf: { topic_id: string; accuracy_pct: number }[]
) => {
  const db = getDb();
  const user = db.users[0];
  
  // Mock Lock Rule:
  // Count total topics where day_number <= user's current_day
  const expectedCount = mockTopics.filter(t => t.day_number <= user.current_day).length;
  // Count total user_topics where r1_status = 'done'
  const doneCount = db.userTopics.filter(ut => ut.r1_status === 'done').length;
  
  // If done_count < (expected_count * 0.7): locked = true
  const isLocked = expectedCount > 0 ? (doneCount < expectedCount * 0.7) : false;

  const newMock: MockTest = {
    ...mockData,
    id: `mock-${Date.now()}`,
    user_id: user.id,
    locked: isLocked
  };
  db.mocks.push(newMock);

  // Save topic perf
  topicPerf.forEach(tp => {
    db.mockTopicPerf.push({
      id: `mtp-${Date.now()}-${Math.random()}`,
      mock_id: newMock.id,
      topic_id: tp.topic_id,
      mock_name: newMock.mock_name,
      taken_at: newMock.taken_at,
      accuracy_pct: tp.accuracy_pct
    });
  });

  saveDb(db);
  return newMock;
};

// Date utilities
export const toDateString = (date: Date) => {
  return date.toISOString().split('T')[0];
};

export const addDays = (date: string | Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

// Mock generators for Phase 3 Step 15
export const getTestAttempts = (topicId: string): TestAttempt[] => {
  // Generate some deterministic fake data based on topicId length
  const numId = topicId.length + (topicId.charCodeAt(0) || 0);
  if (numId % 3 === 0) return []; // Some topics have no tests

  const attempts: TestAttempt[] = [];
  const today = new Date();
  
  if (numId % 2 === 0) {
    attempts.push({
      id: `test-${topicId}-1`,
      topic_id: topicId,
      round: 1,
      attempted_at: toDateString(addDays(today, -15)),
      total_questions: 5,
      correct: 4,
      accuracy_pct: 80,
      time_taken: 12
    });
  }
  
  attempts.push({
    id: `test-${topicId}-2`,
    topic_id: topicId,
    round: 2,
    attempted_at: toDateString(addDays(today, -5)),
    total_questions: 10,
    correct: 6,
    accuracy_pct: 60,
    time_taken: 20
  });

  return attempts;
};

export const getMockTopicPerf = (topicId: string): MockTopicPerf[] => {
  const db = getDb();
  // Return saved real data
  const realPerf = db.mockTopicPerf.filter(p => p.topic_id === topicId);
  
  // Fallback to static mock data if none exists, so Step 15 UI still works 
  if (realPerf.length > 0) return realPerf;
  
  const numId = topicId.length + (topicId.charCodeAt(topicId.length - 1) || 0);
  if (numId % 2 !== 0) return []; // Only some topics appear in mocks

  return [
    {
      id: `mtp-${topicId}-1`,
      mock_id: 'mock-0',
      topic_id: topicId,
      mock_name: 'Mock 3',
      taken_at: toDateString(addDays(new Date(), -3)),
      accuracy_pct: 40
    }
  ];
};

export const getMockTopicPerfByMock = (mockId: string): MockTopicPerf[] => {
  const db = getDb();
  return db.mockTopicPerf.filter(p => p.mock_id === mockId);
};
