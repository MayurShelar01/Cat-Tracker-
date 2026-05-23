import { getUserTopics, saveDailyQueue, updateUserTopic, getUser, getDailyQueue } from "../db";
import { toDateString, addDays } from '@/lib/utils';
import { mockTopics, Topic } from "../mockData";

export type Confidence = 'shaky' | 'okay' | 'solid';

// Scheduling logic
export function scheduleR2(r1_completed_at: Date, confidence: Confidence): Date {
  const daysToAdd = confidence === 'shaky' ? 14 : 21;
  return addDays(r1_completed_at, daysToAdd);
}

export function scheduleR3(r2_completed_at: Date): Date {
  return addDays(r2_completed_at, 45); // always 45 days
}

// Queue logic
export function computeLoadScore(items: any[]): number {
  const r1_count = items.filter(item => item.type === 'r1').length;
  const revision_count = items.filter(item => item.type === 'r2' || item.type === 'r3').length;
  const test_count = items.filter(item => item.type === 'test').length;
  
  return r1_count + (revision_count * 0.5) + (test_count / 5);
}

// Global "Today" override for Dev Tools
export const getVirtualToday = (): Date => {
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem('cat_dev_today');
    if (override) return new Date(override);
  }
  return new Date();
};

export const setVirtualToday = (date: Date | null) => {
  if (typeof window !== 'undefined') {
    if (date) {
      localStorage.setItem('cat_dev_today', date.toISOString());
    } else {
      localStorage.removeItem('cat_dev_today');
    }
  }
};

const getConfidencePriority = (conf: Confidence | null | string): number => {
  if (conf === 'shaky') return 3;
  if (conf === 'okay') return 2;
  if (conf === 'solid') return 1;
  return 0; // unknown/null
};

const getSectionPriority = (section: string): number => {
  if (section === 'LRDI') return 3;
  if (section === 'QUANT') return 2;
  return 1; // VARC
};

export const generateDailyQueue = async (userId: string, targetDate?: Date) => {
  const today = targetDate || getVirtualToday();
  const todayStr = toDateString(today);
  
  const user = await getUser(userId);
  if (!user) throw new Error("User not found");
  
  const allUserTopics = await getUserTopics(userId);
  
  let queueItems: any[] = [];
  
  // 1. Gather R1 items
  if (user.catchup_mode) {
    // Pick 2-3 topics that are never_touched or vaguely_remember
    const pendingR1 = allUserTopics
      .filter(ut => ut.r1_status !== 'done' && (ut.catchup_tag === 'never_touched' || ut.catchup_tag === 'vaguely_remember'))
      .sort((a, b) => {
        const tA = mockTopics.find(t => t.id === a.topic_id)?.order_index || 0;
        const tB = mockTopics.find(t => t.id === b.topic_id)?.order_index || 0;
        return tA - tB;
      });
      
    const itemsToAdd = pendingR1.slice(0, Math.min(3, pendingR1.length));
    itemsToAdd.forEach(ut => {
      queueItems.push({
        topic_id: ut.topic_id,
        round: 1,
        type: 'r1',
        priority: ut.catchup_tag === 'vaguely_remember' ? 2 : 1
      });
    });
  } else {
    // Standard mode: pull the next 1 topic globally
    const completedTopicIds = new Set(allUserTopics.filter(ut => ut.r1_status === 'done').map(ut => ut.topic_id));
    const nextTopic = mockTopics.find(t => !completedTopicIds.has(t.id));
    if (nextTopic) {
      queueItems.push({
        topic_id: nextTopic.id,
        round: 1,
        type: 'r1',
        priority: 1
      });
    }
  }

  // 2. Gather R2 / R3 items due today (or overdue)
  const isDueOrOverdue = (due_at: string | null) => {
    if (!due_at) return false;
    return due_at <= todayStr;
  };

  const dueR2 = allUserTopics.filter(ut => ut.r2_due_at && !ut.r2_completed_at && isDueOrOverdue(ut.r2_due_at));
  const dueR3 = allUserTopics.filter(ut => ut.r3_due_at && !ut.r3_completed_at && isDueOrOverdue(ut.r3_due_at));

  // Sort them for priority mapping later
  dueR2.forEach(ut => {
    queueItems.push({
      topic_id: ut.topic_id,
      round: 2,
      type: 'r2',
      priority: getConfidencePriority(ut.r1_confidence) * 10 + getSectionPriority(mockTopics.find(t => t.id === ut.topic_id)?.section || 'VARC'),
      isOverdue: ut.r2_due_at! < todayStr,
      mock_flagged: ut.mock_flagged
    });
  });

  dueR3.forEach(ut => {
    queueItems.push({
      topic_id: ut.topic_id,
      round: 3,
      type: 'r3',
      priority: getConfidencePriority(ut.r2_confidence) * 10 + getSectionPriority(mockTopics.find(t => t.id === ut.topic_id)?.section || 'VARC'),
      isOverdue: ut.r3_due_at! < todayStr,
      mock_flagged: ut.mock_flagged
    });
  });

  // 3. Gather Tests
  // R2 and R3 topics should trigger tests on the same day they are scheduled for revision.
  // Actually, wait. A topic is in the queue for R2 today. Should it also have a test?
  // Usually, the topic is revised first, then a test is recommended. We can just add tests for the items in R2/R3 today.
  dueR2.forEach(ut => {
    queueItems.push({
      topic_id: ut.topic_id,
      round: 2,
      type: 'test',
      priority: 0,
      mock_flagged: ut.mock_flagged
    });
  });

  dueR3.forEach(ut => {
    queueItems.push({
      topic_id: ut.topic_id,
      round: 3,
      type: 'test',
      priority: 0,
      mock_flagged: ut.mock_flagged
    });
  });

  // 4. Compute load and Auto-defer
  let loadScore = computeLoadScore(queueItems);
  let rebalanced = false;

  if (loadScore > 10) {
    rebalanced = true;
    // Sort logic: Overdue > Mock Flagged R2/R3 > Higher Priority
    queueItems.sort((a, b) => {
      // 1. Overdue first
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      // 2. R1 always gets high placement (keep them stable)
      if (a.type === 'r1' && b.type !== 'r1') return -1;
      if (a.type !== 'r1' && b.type === 'r1') return 1;
      // 3. Mock Flagged
      if (a.mock_flagged && !b.mock_flagged) return -1;
      if (!a.mock_flagged && b.mock_flagged) return 1;
      // 4. By Round (R2 > R3)
      if (a.round !== b.round) return a.round - b.round;
      // 5. Normal priority score (higher first)
      return b.priority - a.priority;
    });

    const keptItems = [];
    const deferredItems = [];
    
    let currentLoad = 0;
    for (const item of queueItems) {
      const itemLoad = item.type === 'r1' ? 1 : 0.5;
      if (currentLoad + itemLoad <= 10 || item.type === 'r1') { // Never defer R1 here
        keptItems.push(item);
        currentLoad += itemLoad;
      } else {
        deferredItems.push(item);
      }
    }
    
    // Actually redistribute deferredItems across next 3 days (never tomorrow)
    for (let i = 0; i < deferredItems.length; i++) {
      const item = deferredItems[i];
      const daysToDefer = (i % 3) + 2; // spreads +2, +3, +4 days... (never +1)
      const targetDayStr = toDateString(addDays(today, daysToDefer));
      if (item.round === 2) await updateUserTopic(userId, item.topic_id, { r2_due_at: targetDayStr });
      if (item.round === 3) await updateUserTopic(userId, item.topic_id, { r3_due_at: targetDayStr });
    }
    
    queueItems = keptItems;
    loadScore = currentLoad;
  }

  // Save daily queue
  await saveDailyQueue({
    user_id: userId,
    date: todayStr,
    items: queueItems,
    load_score: loadScore,
    rebalanced
  });
  
  return { queueItems, loadScore, rebalanced, todayStr };
};

export const handleSkip = async (userId: string, topicId: string, round: number, skippedDate: Date) => {
  const targetDay = addDays(skippedDate, 3); 
  const targetStr = toDateString(targetDay);
  
  const userTopic = await getUserTopics(userId).then(res => res.find(ut => ut.topic_id === topicId));
  const skipCount = (userTopic?.skip_count || 0) + 1;
  
  if (round === 2) await updateUserTopic(userId, topicId, { r2_due_at: targetStr, skip_count: skipCount });
  if (round === 3) await updateUserTopic(userId, topicId, { r3_due_at: targetStr, skip_count: skipCount });
  
  // Re-generate queue for today to remove it
  await generateDailyQueue(userId, skippedDate);
  
  return targetDay;
};

// Test volume multiplier for Step 17
export function getTestVolumeMultiplier(isMockFlagged: boolean): number {
  return isMockFlagged ? 1.5 : 1;
}
