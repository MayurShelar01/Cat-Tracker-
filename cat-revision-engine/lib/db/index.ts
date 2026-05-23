import { createClient } from '../supabase/client';
import { Database } from '../supabase/database.types';

export class DbError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
  }
}

// Fallback to mockDb logic if NEXT_PUBLIC_USE_SUPABASE is not 'true'
const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';

import * as mockDb from '../mockDb';
import { User, UserTopic, DailyQueue, TestAttempt, MockTest, MockTopicPerf } from '../mockDb';

export const isSupabase = USE_SUPABASE;

// --- Users ---
export async function getUser(userId: string): Promise<User | null> {
  if (!USE_SUPABASE) {
    const db = mockDb.getDb();
    return db.users.find(u => u.id === userId) || null;
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
  if (error && error.code !== 'PGRST116') throw new DbError('Failed to get user', error);
  return data as any;
}

export async function createUser(user: Partial<User> & { id: string, email: string }): Promise<User> {
  if (!USE_SUPABASE) {
    const db = mockDb.getDb();
    const newUser = { varc_percentile: 0, quant_percentile: 0, lrdi_percentile: 0, current_day: 1, catchup_mode: false, ...user } as User;
    db.users.push(newUser);
    mockDb.saveDb(db);
    return newUser;
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('users').insert(user).select().single();
  if (error) throw new DbError('Failed to create user', error);
  return data as any;
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User> {
  if (!USE_SUPABASE) {
    const db = mockDb.getDb();
    const index = db.users.findIndex(u => u.id === userId);
    if (index >= 0) {
      db.users[index] = { ...db.users[index], ...updates };
      mockDb.saveDb(db);
      return db.users[index];
    }
    throw new DbError('User not found in mock db');
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('users').update(updates).eq('id', userId).select().single();
  if (error) throw new DbError('Failed to update user', error);
  return data as any;
}

// --- Topics ---
export async function getAllTopics(): Promise<Database['public']['Tables']['topics']['Row'][]> {
  if (!USE_SUPABASE) {
    return mockDb.mockTopics as any;
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('topics').select('*').order('order_index', { ascending: true });
  if (error) throw new DbError('Failed to get topics', error);
  return data;
}

export async function getTopicById(id: string): Promise<Database['public']['Tables']['topics']['Row'] | null> {
  if (!USE_SUPABASE) {
    return mockDb.mockTopics.find(t => t.id === id) as any || null;
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('topics').select('*').eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw new DbError('Failed to get topic', error);
  return data;
}

// --- UserTopics ---
export async function getUserTopics(userId: string): Promise<UserTopic[]> {
  if (!USE_SUPABASE) {
    return mockDb.getUserTopics().filter(ut => ut.user_id === userId);
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('user_topics').select('*').eq('user_id', userId);
  if (error) throw new DbError('Failed to get user topics', error);
  return data as any;
}

export async function getUserTopic(userId: string, topicId: string): Promise<UserTopic | null> {
  if (!USE_SUPABASE) {
    return mockDb.getUserTopics().find(ut => ut.user_id === userId && ut.topic_id === topicId) || null;
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('user_topics').select('*').eq('user_id', userId).eq('topic_id', topicId).single();
  if (error && error.code !== 'PGRST116') throw new DbError('Failed to get user topic', error);
  return data as any;
}

export async function createUserTopic(ut: Partial<UserTopic>): Promise<UserTopic> {
  if (!USE_SUPABASE) {
    mockDb.updateUserTopic(ut.topic_id!, ut);
    return mockDb.getUserTopics().find(u => u.topic_id === ut.topic_id)!;
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('user_topics').insert(ut).select().single();
  if (error) throw new DbError('Failed to create user topic', error);
  return data as any;
}

export async function updateUserTopic(userId: string, topicId: string, updates: Partial<UserTopic>): Promise<UserTopic> {
  if (!USE_SUPABASE) {
    mockDb.updateUserTopic(topicId, updates);
    return mockDb.getUserTopics().find(ut => ut.topic_id === topicId)!;
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('user_topics').update(updates).eq('user_id', userId).eq('topic_id', topicId).select().single();
  if (error) throw new DbError('Failed to update user topic', error);
  return data as any;
}

export async function bulkCreateUserTopics(topics: Partial<UserTopic>[]): Promise<UserTopic[]> {
  if (!USE_SUPABASE) {
    for (const ut of topics) {
      mockDb.updateUserTopic(ut.topic_id!, ut);
    }
    return mockDb.getUserTopics();
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('user_topics').insert(topics).select();
  if (error) throw new DbError('Failed to bulk create user topics', error);
  return data as any;
}

// --- DailyQueue ---
export async function getDailyQueue(userId: string, date: string): Promise<DailyQueue | null> {
  if (!USE_SUPABASE) {
    return mockDb.getDailyQueue(date) || null;
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('daily_queue').select('*').eq('user_id', userId).eq('date', date).single();
  if (error && error.code !== 'PGRST116') throw new DbError('Failed to get daily queue', error);
  return data as any;
}

export async function saveDailyQueue(queue: Partial<DailyQueue>): Promise<DailyQueue> {
  if (!USE_SUPABASE) {
    mockDb.saveDailyQueue(queue.date!, queue as any);
    return mockDb.getDailyQueue(queue.date!)!;
  }
  const supabase = createClient();
  // Upsert pattern
  const existing = await getDailyQueue(queue.user_id!, queue.date!);
  if (existing) {
    const { data, error } = await supabase.from('daily_queue').update(queue).eq('id', existing.id).select().single();
    if (error) throw new DbError('Failed to update daily queue', error);
    return data as any;
  } else {
    const { data, error } = await supabase.from('daily_queue').insert(queue).select().single();
    if (error) throw new DbError('Failed to insert daily queue', error);
    return data as any;
  }
}

export async function updateDailyQueueItem(userId: string, date: string, items: any[]): Promise<DailyQueue> {
  if (!USE_SUPABASE) {
    const q = mockDb.getDailyQueue(date);
    if (q) {
      q.items = items;
      mockDb.saveDailyQueue(date, q);
      return q;
    }
    throw new DbError('Queue not found in mock db');
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('daily_queue').update({ items }).eq('user_id', userId).eq('date', date).select().single();
  if (error) throw new DbError('Failed to update daily queue items', error);
  return data as any;
}

// --- TestAttempts ---
export async function getTestAttempts(topicId: string): Promise<TestAttempt[]> {
  if (!USE_SUPABASE) {
    return mockDb.getTestAttempts(topicId);
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('test_attempts').select('*').eq('topic_id', topicId).order('attempted_at', { ascending: false });
  if (error) throw new DbError('Failed to get test attempts', error);
  return data as any;
}

export async function createTestAttempt(attempt: Partial<TestAttempt>): Promise<TestAttempt> {
  if (!USE_SUPABASE) {
    // mockDb doesn't actually have a save for test attempts, it generates dynamically
    return { ...attempt, id: `test-${Date.now()}` } as TestAttempt;
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('test_attempts').insert(attempt).select().single();
  if (error) throw new DbError('Failed to create test attempt', error);
  return data as any;
}

export async function getTestAttemptsByTopic(topicId: string): Promise<TestAttempt[]> {
  return getTestAttempts(topicId);
}

// --- Mocks ---
export async function getMocks(userId: string): Promise<MockTest[]> {
  if (!USE_SUPABASE) {
    return mockDb.getMocks().filter(m => m.user_id === userId);
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('mocks').select('*').eq('user_id', userId).order('taken_at', { ascending: false });
  if (error) throw new DbError('Failed to get mocks', error);
  return data as any;
}

export async function getMockById(mockId: string): Promise<MockTest | null> {
  if (!USE_SUPABASE) {
    return mockDb.getMocks().find(m => m.id === mockId) || null;
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('mocks').select('*').eq('id', mockId).single();
  if (error && error.code !== 'PGRST116') throw new DbError('Failed to get mock', error);
  return data as any;
}

export async function createMock(mock: Partial<MockTest>, topicPerf: any[] = []): Promise<MockTest> {
  if (!USE_SUPABASE) {
    return mockDb.saveMock(mock as any, topicPerf);
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('mocks').insert(mock).select().single();
  if (error) throw new DbError('Failed to create mock', error);
  
  if (topicPerf.length > 0) {
    const perfData = topicPerf.map(tp => ({ ...tp, mock_id: data.id, mock_name: data.mock_name, taken_at: data.taken_at }));
    await supabase.from('mock_topic_perf').insert(perfData);
  }
  
  return data as any;
}

export async function updateMock(mockId: string, updates: Partial<MockTest>): Promise<MockTest> {
  if (!USE_SUPABASE) {
    const db = mockDb.getDb();
    const index = db.mocks.findIndex(m => m.id === mockId);
    if (index >= 0) {
      db.mocks[index] = { ...db.mocks[index], ...updates } as any;
      mockDb.saveDb(db);
      return db.mocks[index];
    }
    throw new DbError('Mock not found');
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('mocks').update(updates).eq('id', mockId).select().single();
  if (error) throw new DbError('Failed to update mock', error);
  return data as any;
}

// --- MockTopicPerf ---
export async function getMockTopicPerf(topicId: string): Promise<MockTopicPerf[]> {
  if (!USE_SUPABASE) {
    return mockDb.getMockTopicPerf(topicId);
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('mock_topic_perf').select('*').eq('topic_id', topicId).order('taken_at', { ascending: false });
  if (error) throw new DbError('Failed to get mock topic perf', error);
  return data as any;
}

export async function getMockTopicPerfByMock(mockId: string): Promise<MockTopicPerf[]> {
  if (!USE_SUPABASE) {
    return mockDb.getMockTopicPerfByMock(mockId);
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('mock_topic_perf').select('*').eq('mock_id', mockId);
  if (error) throw new DbError('Failed to get mock topic perf by mock', error);
  return data as any;
}

export async function createMockTopicPerf(perf: Partial<MockTopicPerf>): Promise<MockTopicPerf> {
  if (!USE_SUPABASE) {
    const db = mockDb.getDb();
    const newPerf = { id: `mtp-${Date.now()}`, ...perf } as MockTopicPerf;
    db.mockTopicPerf.push(newPerf);
    mockDb.saveDb(db);
    return newPerf;
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('mock_topic_perf').insert(perf).select().single();
  if (error) throw new DbError('Failed to create mock topic perf', error);
  return data as any;
}
