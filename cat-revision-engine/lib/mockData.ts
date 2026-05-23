export type Section = 'VARC' | 'QUANT' | 'LRDI' | 'VARC_QUANT';

export interface Topic {
  id: string;
  day_number: number;
  topic_name: string;
  section: Section;
  order_index: number;
}

export const mockTopics: Topic[] = [
  { id: 't1', day_number: 1, topic_name: 'Ratio and Proportion', section: 'QUANT', order_index: 1 },
  { id: 't2', day_number: 2, topic_name: 'Mixtures and Solutions', section: 'QUANT', order_index: 2 },
  { id: 't3', day_number: 3, topic_name: 'Percentages', section: 'QUANT', order_index: 3 },
  { id: 't4', day_number: 4, topic_name: 'Variation', section: 'QUANT', order_index: 4 },
  { id: 't5', day_number: 5, topic_name: 'DI Bar, Line Pie Chart', section: 'LRDI', order_index: 5 },
  { id: 't6', day_number: 6, topic_name: 'DI Special Charts', section: 'LRDI', order_index: 6 },
  { id: 't7', day_number: 7, topic_name: 'Approach to RC', section: 'VARC', order_index: 7 },
  { id: 't8', day_number: 8, topic_name: 'Identifying Central Idea of Passage', section: 'VARC', order_index: 8 },
  { id: 't9', day_number: 9, topic_name: 'Introduction to Profit, Loss and Discount', section: 'QUANT', order_index: 9 },
  { id: 't10', day_number: 10, topic_name: 'Faulty Balances and Measures', section: 'QUANT', order_index: 10 },
  { id: 't11', day_number: 11, topic_name: 'Interest', section: 'QUANT', order_index: 11 },
  { id: 't12', day_number: 12, topic_name: 'Installments', section: 'QUANT', order_index: 12 },
  { id: 't13', day_number: 13, topic_name: 'DI Data over the years', section: 'LRDI', order_index: 13 },
  { id: 't14', day_number: 14, topic_name: 'DI Cumulative DI', section: 'LRDI', order_index: 14 },
  { id: 't15', day_number: 15, topic_name: 'DI Table with Missing Values', section: 'LRDI', order_index: 15 },
  { id: 't16', day_number: 16, topic_name: 'Relative Velocity', section: 'QUANT', order_index: 16 },
  { id: 't17', day_number: 17, topic_name: 'Circular Tracks', section: 'QUANT', order_index: 17 },
  { id: 't18', day_number: 18, topic_name: 'Races and Headstarts', section: 'QUANT', order_index: 18 },
  { id: 't19', day_number: 19, topic_name: 'Boats and Escalators', section: 'QUANT', order_index: 19 },
  { id: 't20', day_number: 20, topic_name: 'Informative Reading Comprehensions', section: 'VARC', order_index: 20 },
  { id: 't21', day_number: 21, topic_name: 'Persuasive RCs', section: 'VARC', order_index: 21 },
  { id: 't22', day_number: 22, topic_name: 'Circular Arrangement', section: 'LRDI', order_index: 22 },
  { id: 't23', day_number: 23, topic_name: 'Arrangement Across Levels', section: 'LRDI', order_index: 23 },
  { id: 't24', day_number: 24, topic_name: 'Einstein\'s Puzzle', section: 'LRDI', order_index: 24 },
  { id: 't25', day_number: 25, topic_name: 'Seating Arrangement - People facing different directions', section: 'LRDI', order_index: 25 },
  { id: 't26', day_number: 26, topic_name: 'Square Seating Arrangement', section: 'LRDI', order_index: 26 },
  { id: 't27', day_number: 27, topic_name: 'Inferences', section: 'VARC', order_index: 27 },
  { id: 't28', day_number: 28, topic_name: 'RC\'s having close options', section: 'VARC', order_index: 28 },
  { id: 't29', day_number: 29, topic_name: 'Time and Work', section: 'QUANT', order_index: 29 },
  { id: 't30', day_number: 30, topic_name: 'Pipes and Cisterns', section: 'QUANT', order_index: 30 },
  { id: 't31', day_number: 31, topic_name: 'Team Selection: Advanced', section: 'LRDI', order_index: 31 },
  { id: 't32', day_number: 32, topic_name: 'Games and Tournaments', section: 'LRDI', order_index: 32 },
  { id: 't33', day_number: 33, topic_name: 'Introduction to Triangles', section: 'QUANT', order_index: 33 },
  { id: 't34', day_number: 34, topic_name: 'Area of Triangles', section: 'QUANT', order_index: 34 },
  { id: 't35', day_number: 35, topic_name: 'Internal and External Angle Bisector Theorem', section: 'QUANT', order_index: 35 },
  { id: 't36', day_number: 36, topic_name: 'Congruency and Similarity of Triangles', section: 'QUANT', order_index: 36 },
  { id: 't37', day_number: 37, topic_name: 'Apollonius Theorem', section: 'QUANT', order_index: 37 },
  { id: 't38', day_number: 38, topic_name: 'Number of Triangles given perimeter', section: 'QUANT', order_index: 38 },
  { id: 't39', day_number: 39, topic_name: 'Routes and Networks', section: 'LRDI', order_index: 39 },
  { id: 't40', day_number: 40, topic_name: 'Scheduling', section: 'LRDI', order_index: 40 },
  { id: 't41', day_number: 41, topic_name: 'Quant based DI', section: 'LRDI', order_index: 41 },
];

export const getBacklogTopics = () => mockTopics.filter(t => t.day_number <= 41);

// LocalStorage helpers for mock data
export const saveDiagnosticData = (data: { varc: number; quant: number; lrdi: number }) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cat_diagnostic', JSON.stringify(data));
  }
};

export const saveTriageData = (data: Record<string, string | null>) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cat_triage_plan', JSON.stringify(data));
  }
};

export const getTriageData = () => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem('cat_triage_plan');
    return data ? JSON.parse(data) : null;
  }
  return null;
};
