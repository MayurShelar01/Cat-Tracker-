import { createClient } from '../supabase/client';
import { Database } from '../supabase/database.types';

export class DbError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
  }
}

// Fallback to mockDb logic if NEXT_PUBLIC_USE_SUPABASE is not 'true'
const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';



export type User = Database['public']['Tables']['users']['Row'];
export type UserTopic = Database['public']['Tables']['user_topics']['Row'];
export type DailyQueue = Database['public']['Tables']['daily_queue']['Row'];
export type TestAttempt = Database['public']['Tables']['test_attempts']['Row'];
export type MockTest = Database['public']['Tables']['mocks']['Row'];
export type MockTopicPerf = Database['public']['Tables']['mock_topic_perf']['Row'];

export const isSupabase = USE_SUPABASE;

// --- Users ---
export async function getUser(userId: string): Promise<User | null> {
    const supabase = createClient();
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
  if (error && error.code !== 'PGRST116') throw new DbError('Failed to get user', error);
  return data as any;
}

export async function createUser(user: Partial<User> & { id: string, email: string }): Promise<User> {
    const supabase = createClient();
  const { data, error } = await supabase.from('users').insert(user).select().single();
  if (error) throw new DbError('Failed to create user', error);
  return data as any;
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User> {
  const supabase = createClient();
  
  // Try update first
  const { data, error } = await supabase.from('users').update(updates).eq('id', userId).select().single();
  
  if (error && error.code === 'PGRST116') {
    // Row doesn't exist, create it
    const { data: insertData, error: insertError } = await supabase.from('users').insert({ id: userId, ...updates }).select().single();
    if (insertError) throw new DbError('Failed to create user during update', insertError);
    return insertData as any;
  }
  
  if (error) throw new DbError('Failed to update user', error);
  return data as any;
}

// --- Topics ---
export async function getAllTopics(): Promise<Database['public']['Tables']['topics']['Row'][]> {
    const supabase = createClient();
  const { data, error } = await supabase.from('topics').select('*').order('order_index', { ascending: true });
  if (error) throw new DbError('Failed to get topics', error);
  return data;
}

export async function getTopicById(id: string): Promise<Database['public']['Tables']['topics']['Row'] | null> {
    const supabase = createClient();
  const { data, error } = await supabase.from('topics').select('*').eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw new DbError('Failed to get topic', error);
  return data;
}

// --- UserTopics ---
export async function getUserTopics(userId: string): Promise<UserTopic[]> {
    const supabase = createClient();
  const { data, error } = await supabase.from('user_topics').select('*').eq('user_id', userId);
  if (error) throw new DbError('Failed to get user topics', error);
  return data as any;
}

export async function getUserTopic(userId: string, topicId: string): Promise<UserTopic | null> {
    const supabase = createClient();
  const { data, error } = await supabase.from('user_topics').select('*').eq('user_id', userId).eq('topic_id', topicId).single();
  if (error && error.code !== 'PGRST116') throw new DbError('Failed to get user topic', error);
  return data as any;
}

export async function createUserTopic(ut: Partial<UserTopic>): Promise<UserTopic> {
    const supabase = createClient();
  const { data, error } = await supabase.from('user_topics').insert(ut).select().single();
  if (error) throw new DbError('Failed to create user topic', error);
  return data as any;
}

export async function updateUserTopic(userId: string, topicId: string, updates: Partial<UserTopic>): Promise<UserTopic> {
    const supabase = createClient();
  const { data, error } = await supabase.from('user_topics').update(updates).eq('user_id', userId).eq('topic_id', topicId).select().single();
  if (error) throw new DbError('Failed to update user topic', error);
  return data as any;
}

export async function bulkCreateUserTopics(topics: Partial<UserTopic>[]): Promise<UserTopic[]> {
    const supabase = createClient();
  const { data, error } = await supabase.from('user_topics').insert(topics).select();
  if (error) throw new DbError('Failed to bulk create user topics', error);
  return data as any;
}

// --- DailyQueue ---
export async function getDailyQueue(userId: string, date: string): Promise<DailyQueue | null> {
    const supabase = createClient();
  const { data, error } = await supabase.from('daily_queue').select('*').eq('user_id', userId).eq('date', date).single();
  if (error && error.code !== 'PGRST116') throw new DbError('Failed to get daily queue', error);
  return data as any;
}

export async function saveDailyQueue(queue: Partial<DailyQueue>): Promise<DailyQueue> {
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
    const supabase = createClient();
  const { data, error } = await supabase.from('daily_queue').update({ items }).eq('user_id', userId).eq('date', date).select().single();
  if (error) throw new DbError('Failed to update daily queue items', error);
  return data as any;
}

// --- TestAttempts ---
export async function getTestAttempts(topicId: string): Promise<TestAttempt[]> {
    const supabase = createClient();
  const { data, error } = await supabase.from('test_attempts').select('*').eq('topic_id', topicId).order('attempted_at', { ascending: false });
  if (error) throw new DbError('Failed to get test attempts', error);
  return data as any;
}

export async function createTestAttempt(attempt: Partial<TestAttempt>): Promise<TestAttempt> {
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
    const supabase = createClient();
  const { data, error } = await supabase.from('mocks').select('*').eq('user_id', userId).order('taken_at', { ascending: false });
  if (error) throw new DbError('Failed to get mocks', error);
  return data as any;
}

export async function getMockById(mockId: string): Promise<MockTest | null> {
    const supabase = createClient();
  const { data, error } = await supabase.from('mocks').select('*').eq('id', mockId).single();
  if (error && error.code !== 'PGRST116') throw new DbError('Failed to get mock', error);
  return data as any;
}

export async function createMock(mock: Partial<MockTest>, topicPerf: any[] = []): Promise<MockTest> {
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
    const supabase = createClient();
  const { data, error } = await supabase.from('mocks').update(updates).eq('id', mockId).select().single();
  if (error) throw new DbError('Failed to update mock', error);
  return data as any;
}

// --- MockTopicPerf ---
export async function getMockTopicPerf(topicId: string): Promise<MockTopicPerf[]> {
    const supabase = createClient();
  const { data, error } = await supabase.from('mock_topic_perf').select('*').eq('topic_id', topicId).order('taken_at', { ascending: false });
  if (error) throw new DbError('Failed to get mock topic perf', error);
  return data as any;
}

export async function getMockTopicPerfByMock(mockId: string): Promise<MockTopicPerf[]> {
    const supabase = createClient();
  const { data, error } = await supabase.from('mock_topic_perf').select('*').eq('mock_id', mockId);
  if (error) throw new DbError('Failed to get mock topic perf by mock', error);
  return data as any;
}

export async function createMockTopicPerf(perf: Partial<MockTopicPerf>): Promise<MockTopicPerf> {
    const supabase = createClient();
  const { data, error } = await supabase.from('mock_topic_perf').insert(perf).select().single();
  if (error) throw new DbError('Failed to create mock topic perf', error);
  return data as any;
}
