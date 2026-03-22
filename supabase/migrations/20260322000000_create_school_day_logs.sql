-- Tracks why a school day was skipped via the Life Happens modal.
-- One record per day per organization — reason + optional note.

CREATE TABLE IF NOT EXISTS school_day_logs (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  date            date NOT NULL DEFAULT CURRENT_DATE,
  reason          text NOT NULL CHECK (reason IN ('sick', 'field_trip', 'free_day', 'other')),
  note            text,
  field_trip_id   uuid,          -- populated when reason = 'field_trip'
  created_at      timestamptz DEFAULT now()
);

-- One log per org per day (can always update if they change their mind)
CREATE UNIQUE INDEX IF NOT EXISTS school_day_logs_org_date_idx
  ON school_day_logs (organization_id, date);

-- RLS
ALTER TABLE school_day_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners can manage school day logs"
  ON school_day_logs FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Co-teachers can view school day logs"
  ON school_day_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );
