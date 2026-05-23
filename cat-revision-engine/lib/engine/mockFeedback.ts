import { getMockById, getMockTopicPerfByMock, getUserTopic, updateUserTopic } from '../db';
import { generateDailyQueue } from '../utils/revisionEngine';
import { toDateString, addDays } from '@/lib/utils';
import { getAllTopics } from '../db';

export interface MockFeedbackResult {
  flaggedTopics: Array<{
    topicId: string;
    topicName: string;
    section: string;
    accuracyPct: number;
    previousConfidence: 'shaky' | 'okay' | 'solid' | null;
    newConfidence: 'shaky' | 'okay' | 'solid';
    extraR2Date: string;  // ISO date
    roundAffected: 'r2' | 'r3';  // which round's confidence was downgraded
  }>;
  totalFlagged: number;
  mockName: string;
}

export async function applyMockFeedback(mockId: string, userId: string): Promise<MockFeedbackResult> {
  const mock = await getMockById(mockId);
  if (!mock) throw new Error("Mock not found");

  const topicPerf = await getMockTopicPerfByMock(mockId);
  const weakTopics = topicPerf.filter(tp => tp.topic_id !== null && tp.accuracy_pct !== null && tp.accuracy_pct < 60);

  const result: MockFeedbackResult = {
    flaggedTopics: [],
    totalFlagged: 0,
    mockName: mock.mock_name || `Mock — ${mock.taken_at}`
  };

  if (weakTopics.length === 0) return result;

  const allTopics = await getAllTopics();
  const today = new Date();
  const extraR2Date = toDateString(addDays(today, 5));

  for (const wt of weakTopics) {
    const topicId = wt.topic_id as string;
    const userTopic = await getUserTopic(userId, topicId);
    if (!userTopic) continue;

    // Determine round to downgrade
    let targetRound: 'r1' | 'r2' | 'r3' | null = null;
    let currentConf: 'shaky' | 'okay' | 'solid' | null = null;

    if (userTopic.r3_completed_at) {
      targetRound = 'r3';
      currentConf = userTopic.r3_confidence as any;
    } else if (userTopic.r2_completed_at) {
      targetRound = 'r2';
      currentConf = userTopic.r2_confidence as any;
    } else if (userTopic.r1_completed_at) {
      targetRound = 'r1';
      currentConf = userTopic.r1_confidence as any;
    }

    // Skip if never studied
    if (!targetRound) continue;

    let newConf: 'shaky' | 'okay' | 'solid' = 'shaky';
    if (currentConf === 'solid') newConf = 'okay';
    else if (currentConf === 'okay') newConf = 'shaky';
    else if (currentConf === 'shaky') newConf = 'shaky';

    // Calculate r2_due_at
    let nextR2Due = userTopic.r2_due_at;
    if (!nextR2Due || extraR2Date < nextR2Due) {
      nextR2Due = extraR2Date;
    }

    const updates: any = {
      mock_flagged: true,
      extra_r2_inserted: true,
      r2_due_at: nextR2Due
    };

    if (targetRound === 'r3') updates.r3_confidence = newConf;
    else if (targetRound === 'r2') updates.r2_confidence = newConf;
    else updates.r1_confidence = newConf;

    await updateUserTopic(userId, topicId, updates);

    const topicData = allTopics.find(t => t.id === topicId);

    result.flaggedTopics.push({
      topicId: topicId,
      topicName: topicData?.topic_name || "Unknown Topic",
      section: topicData?.section || "VARC",
      accuracyPct: wt.accuracy_pct as number,
      previousConfidence: currentConf,
      newConfidence: newConf,
      extraR2Date,
      roundAffected: targetRound === 'r3' ? 'r3' : 'r2' // For UI simplicity
    });
  }

  result.totalFlagged = result.flaggedTopics.length;

  // Regenerate queue for today and the extra R2 date
  await generateDailyQueue(userId, today);
  await generateDailyQueue(userId, new Date(extraR2Date));

  return result;
}
