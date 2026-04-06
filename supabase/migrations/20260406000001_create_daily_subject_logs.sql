-- Quick Daily Subject Log
-- Lightweight alternative to full lessons — parent checks off subjects covered each day.
-- No lesson required. Feeds subject coverage and counts as a school day for compliance.

CREATE TABLE IF NOT EXISTS daily_subject_logs (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  kid_id          uuid NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
  log_date        date NOT NULL DEFAULT CURRENT_DATE,
  subjects        text[] NOT NULL DEFAULT '{}',   -- e.g. ['Math', 'Reading', 'Science']
  notes           text,                            -- optional free-text note
  hours           numeric(4,2),                    -- optional hours logged for the day
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- One log per kid per day (upsert-friendly)
CREATE UNIQUE INDEX IF NOT EXISTS daily_subject_logs_kid_date_idx
  ON daily_subject_logs (kid_id, log_date);

-- RLS
ALTER TABLE daily_subject_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners can manage daily subject logs"
  ON daily_subject_logs FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Co-teachers can manage daily subject logs"
  ON daily_subject_logs FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );
