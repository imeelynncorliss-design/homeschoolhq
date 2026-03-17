-- Track monthly AI usage per user for tier-based limits
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id        uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_month    date    NOT NULL,  -- first day of month, e.g. 2026-03-01
  lessons        int     NOT NULL DEFAULT 0,
  activities     int     NOT NULL DEFAULT 0,
  scout_queries  int     NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_month)
);

-- Users can only see their own usage
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai_usage"
  ON ai_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can read/write (used by API routes)
CREATE POLICY "Service role has full access to ai_usage"
  ON ai_usage FOR ALL
  USING (true)
  WITH CHECK (true);
