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

CREATE TABLE test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE CASCADE,
  round int NOT NULL,
  attempted_at timestamp with time zone NOT NULL,
  total_questions int NOT NULL,
  correct int NOT NULL,
  accuracy_pct int NOT NULL,
  time_taken int
);

CREATE TABLE mocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  taken_at date NOT NULL,
  mock_name text,
  varc_score int,
  quant_score int,
  lrdi_score int,
  total_score int,
  varc_percentile int,
  quant_percentile int,
  lrdi_percentile int,
  overall_percentile int,
  notes text,
  locked boolean DEFAULT false
);

CREATE TABLE mock_topic_perf (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id uuid REFERENCES mocks(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE CASCADE,
  mock_name text,
  taken_at date,
  accuracy_pct int,
  UNIQUE(mock_id, topic_id)
);
