-- Add Multiple Intelligences profile to kids table
-- Stores an array of the child's top intelligence types (e.g. ['kinesthetic', 'visual', 'musical'])

ALTER TABLE kids ADD COLUMN IF NOT EXISTS mi_profile text[];
