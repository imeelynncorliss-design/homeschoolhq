-- Add learning profile columns to kids table
-- learning_style: VAK array e.g. ['visual', 'auditory']
-- mi_profile: Multiple Intelligences top picks e.g. ['kinesthetic', 'visual', 'musical']

ALTER TABLE kids ADD COLUMN IF NOT EXISTS learning_style text[];
ALTER TABLE kids ADD COLUMN IF NOT EXISTS mi_profile text[];
