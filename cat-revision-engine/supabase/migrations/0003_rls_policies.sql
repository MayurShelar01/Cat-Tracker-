-- Enable RLS on all user-data tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_topic_perf ENABLE ROW LEVEL SECURITY;

-- topics table is public read (no RLS needed, or enable with public read policy)

-- Users can only see/modify their own data
CREATE POLICY "Users see own profile" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users see own topics" ON user_topics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own queue" ON daily_queue
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own tests" ON test_attempts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own mocks" ON mocks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own mock perf" ON mock_topic_perf
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM mocks 
      WHERE mocks.id = mock_topic_perf.mock_id 
      AND mocks.user_id = auth.uid()
    )
  );

-- topics table: public read
CREATE POLICY "Anyone can read topics" ON topics
  FOR SELECT USING (true);
