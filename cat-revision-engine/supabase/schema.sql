-- CAT Revision Engine - Phase 1 Schema

CREATE TYPE section_enum AS ENUM ('VARC', 'QUANT', 'LRDI', 'VARC_QUANT');
CREATE TYPE confidence_enum AS ENUM ('shaky', 'okay', 'solid');
CREATE TYPE r1_status_enum AS ENUM ('not_started', 'skimmed', 'done');
CREATE TYPE catchup_tag_enum AS ENUM ('never_touched', 'vaguely_remember', 'studied_before');

CREATE TABLE topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number int NOT NULL,
  topic_name text NOT NULL,
  section section_enum NOT NULL,
  order_index int NOT NULL
);

CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  varc_percentile int,
  quant_percentile int,
  lrdi_percentile int,
  current_day int DEFAULT 1,
  catchup_mode boolean DEFAULT false
);

CREATE TABLE user_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE CASCADE,
  -- R1
  r1_status r1_status_enum DEFAULT 'not_started',
  r1_completed_at timestamp with time zone,
  r1_confidence confidence_enum,
  catchup_tag catchup_tag_enum,
  -- R2
  r2_due_at timestamp with time zone,
  r2_completed_at timestamp with time zone,
  r2_confidence confidence_enum,
  -- R3
  r3_due_at timestamp with time zone,
  r3_completed_at timestamp with time zone,
  r3_confidence confidence_enum,
  -- Meta
  mock_flagged boolean DEFAULT false,
  extra_r2_inserted boolean DEFAULT false,
  UNIQUE(user_id, topic_id)
);

CREATE TABLE daily_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  items jsonb DEFAULT '[]'::jsonb,
  load_score float DEFAULT 0,
  rebalanced boolean DEFAULT false,
  UNIQUE(user_id, date)
);

CREATE TABLE mocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  taken_at date NOT NULL,
  varc_score int,
  quant_score int,
  lrdi_score int,
  total_score int,
  notes text,
  locked boolean DEFAULT false
);

CREATE TABLE mock_topic_perf (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id uuid REFERENCES mocks(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE CASCADE,
  accuracy_pct int,
  UNIQUE(mock_id, topic_id)
);

-- RLS Policies (Disabled for initial setup/testing, but basic structure is here)
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE mocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_topic_perf ENABLE ROW LEVEL SECURITY;

-- Read topics freely
CREATE POLICY "Topics are readable by everyone." ON topics FOR SELECT USING (true);

-- Users can only read/update their own data
CREATE POLICY "Users can view own data." ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data." ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own user_topics." ON user_topics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own user_topics." ON user_topics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own user_topics." ON user_topics FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own daily_queue." ON daily_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily_queue." ON daily_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily_queue." ON daily_queue FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own mocks." ON mocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mocks." ON mocks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mocks." ON mocks FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own mock_topic_perf." ON mock_topic_perf FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM mocks WHERE id = mock_id)
);
CREATE POLICY "Users can insert own mock_topic_perf." ON mock_topic_perf FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM mocks WHERE id = mock_id)
);
CREATE POLICY "Users can update own mock_topic_perf." ON mock_topic_perf FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM mocks WHERE id = mock_id)
);
