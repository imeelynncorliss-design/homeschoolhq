-- Create template tables
CREATE TABLE IF NOT EXISTS standard_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code VARCHAR(2) NOT NULL,
  grade_level VARCHAR(10) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  standard_code VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  domain VARCHAR(200),
  template_version VARCHAR(50) NOT NULL,
  template_name VARCHAR(200),
  source_name VARCHAR(200),
  source_url TEXT,
  import_method VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(state_code, standard_code, template_version)
);

CREATE INDEX IF NOT EXISTS idx_templates_state_grade 
  ON standard_templates(state_code, grade_level, subject);

-- Enable RLS
ALTER TABLE standard_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY templates_public_read ON standard_templates
  FOR SELECT USING (true);

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '✓ Tables created successfully!';
END $$;
