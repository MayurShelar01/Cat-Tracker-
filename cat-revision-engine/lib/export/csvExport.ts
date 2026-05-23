import { createClient } from '../supabase/client';

function arrayToCSV(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.join(',');
  const dataRows = rows.map(row => row.map(escape).join(','));
  return [headerRow, ...dataRows].join('\n');
}

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportTopicsCSV(userId: string): Promise<void> {
  const supabase = createClient();
  const [{ data: topics }, { data: userTopics }] = await Promise.all([
    supabase.from('topics').select('*').order('order_index', { ascending: true }),
    supabase.from('user_topics').select('*').eq('user_id', userId)
  ]);

  if (!topics) throw new Error('Failed to fetch topics');

  const headers = [
    'day_number', 'topic_name', 'section', 'catchup_tag', 
    'r1_status', 'r1_completed_at', 'r1_confidence', 
    'r2_due_at', 'r2_completed_at', 'r2_confidence', 
    'r3_due_at', 'r3_completed_at', 'r3_confidence', 
    'mock_flagged', 'extra_r2_inserted', 'skip_count'
  ];

  const rows = topics.map((t: any) => {
    const ut = userTopics?.find((u: any) => u.topic_id === t.id);
    return [
      t.day_number,
      t.topic_name,
      t.section,
      ut?.catchup_tag,
      ut?.r1_status,
      ut?.r1_completed_at,
      ut?.r1_confidence,
      ut?.r2_due_at,
      ut?.r2_completed_at,
      ut?.r2_confidence,
      ut?.r3_due_at,
      ut?.r3_completed_at,
      ut?.r3_confidence,
      ut?.mock_flagged ? 'TRUE' : 'FALSE',
      ut?.extra_r2_inserted ? 'TRUE' : 'FALSE',
      ut?.skip_count || 0
    ];
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const csvContent = arrayToCSV(headers, rows);
  downloadCSV(csvContent, `cat-engine-topics-${dateStr}.csv`);
}

export async function exportTestsCSV(userId: string): Promise<void> {
  const supabase = createClient();
  const [{ data: tests }, { data: topics }] = await Promise.all([
    supabase.from('test_attempts').select('*').eq('user_id', userId).order('attempted_at', { ascending: false }),
    supabase.from('topics').select('*')
  ]);

  if (!tests) return;

  const headers = [
    'attempted_at', 'topic_name', 'section', 'round', 
    'total_questions', 'correct', 'accuracy_pct', 
    'time_taken_sec', 'time_taken_min'
  ];

  const rows = tests.map((t: any) => {
    const topic = topics?.find((topic: any) => topic.id === t.topic_id);
    return [
      t.attempted_at,
      topic?.topic_name || 'Unknown Topic',
      topic?.section || 'Unknown Section',
      t.round,
      t.total_questions,
      t.correct,
      t.accuracy_pct,
      t.time_taken_sec,
      t.time_taken_sec ? Math.round((t.time_taken_sec / 60) * 10) / 10 : null
    ];
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const csvContent = arrayToCSV(headers, rows);
  downloadCSV(csvContent, `cat-engine-tests-${dateStr}.csv`);
}

export async function exportMocksCSV(userId: string): Promise<void> {
  const supabase = createClient();
  const { data: mocks } = await supabase.from('mocks').select('*').eq('user_id', userId).order('taken_at', { ascending: false });

  if (!mocks) return;

  const headers = [
    'taken_at', 'mock_name', 'varc_score', 'quant_score', 'lrdi_score', 'total_score',
    'varc_percentile', 'quant_percentile', 'lrdi_percentile', 'overall_percentile',
    'locked', 'notes'
  ];

  const rows = mocks.map((m: any) => [
    m.taken_at,
    m.mock_name,
    m.varc_score,
    m.quant_score,
    m.lrdi_score,
    m.total_score,
    m.varc_percentile,
    m.quant_percentile,
    m.lrdi_percentile,
    m.overall_percentile,
    m.locked ? 'TRUE' : 'FALSE',
    m.notes
  ]);

  const dateStr = new Date().toISOString().split('T')[0];
  const csvContent = arrayToCSV(headers, rows);
  downloadCSV(csvContent, `cat-engine-mocks-${dateStr}.csv`);
}

export async function exportFullLogCSV(userId: string): Promise<void> {
  const supabase = createClient();
  const [
    { data: userTopics }, 
    { data: tests }, 
    { data: mocks }, 
    { data: mockPerf },
    { data: topics }
  ] = await Promise.all([
    supabase.from('user_topics').select('*').eq('user_id', userId),
    supabase.from('test_attempts').select('*').eq('user_id', userId),
    supabase.from('mocks').select('*').eq('user_id', userId),
    supabase.from('mock_topic_perf').select('*, mocks!inner(user_id)').eq('mocks.user_id', userId),
    supabase.from('topics').select('*')
  ]);

  const events: any[] = [];

  // R1 completed
  userTopics?.forEach((ut: any) => {
    const topic = topics?.find((t: any) => t.id === ut.topic_id);
    if (ut.r1_completed_at) {
      events.push({
        date: ut.r1_completed_at,
        event_type: 'r1_completed',
        topic_name: topic?.topic_name,
        section: topic?.section,
        round: 1,
        detail: `Confidence: ${ut.r1_confidence || 'N/A'}`
      });
    }
    if (ut.r2_completed_at) {
      events.push({
        date: ut.r2_completed_at,
        event_type: 'r2_completed',
        topic_name: topic?.topic_name,
        section: topic?.section,
        round: 2,
        detail: `Confidence: ${ut.r2_confidence || 'N/A'}`
      });
    }
    if (ut.r3_completed_at) {
      events.push({
        date: ut.r3_completed_at,
        event_type: 'r3_completed',
        topic_name: topic?.topic_name,
        section: topic?.section,
        round: 3,
        detail: `Confidence: ${ut.r3_confidence || 'N/A'}`
      });
    }
  });

  // Tests
  tests?.forEach((t: any) => {
    const topic = topics?.find((top: any) => top.id === t.topic_id);
    events.push({
      date: t.attempted_at,
      event_type: 'test_attempted',
      topic_name: topic?.topic_name,
      section: topic?.section,
      round: t.round,
      detail: `Score: ${t.correct}/${t.total_questions} (${t.accuracy_pct}%)`
    });
  });

  // Mocks
  mocks?.forEach((m: any) => {
    events.push({
      date: m.taken_at,
      event_type: 'mock_logged',
      topic_name: null,
      section: null,
      round: null,
      detail: `${m.mock_name} logged. Overall %ile: ${m.overall_percentile || 'N/A'}`
    });
  });

  // Mock perf (Flagged events)
  mockPerf?.forEach((mp: any) => {
    if (mp.accuracy_pct < 60) {
      const topic = topics?.find((t: any) => t.id === mp.topic_id);
      events.push({
        date: mp.taken_at,
        event_type: 'flag_added',
        topic_name: topic?.topic_name,
        section: topic?.section,
        round: null,
        detail: `${mp.mock_name} flagged this topic (${mp.accuracy_pct}% accuracy)`
      });
    }
  });

  // Sort chronologically
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const headers = ['date', 'event_type', 'topic_name', 'section', 'round', 'detail'];
  const rows = events.map(e => [e.date, e.event_type, e.topic_name, e.section, e.round, e.detail]);

  const dateStr = new Date().toISOString().split('T')[0];
  const csvContent = arrayToCSV(headers, rows);
  downloadCSV(csvContent, `cat-engine-full-log-${dateStr}.csv`);
}

export async function exportAllCSV(userId: string): Promise<void> {
  await exportTopicsCSV(userId);
  await new Promise(r => setTimeout(r, 200));
  await exportTestsCSV(userId);
  await new Promise(r => setTimeout(r, 200));
  await exportMocksCSV(userId);
  await new Promise(r => setTimeout(r, 200));
  await exportFullLogCSV(userId);
}
