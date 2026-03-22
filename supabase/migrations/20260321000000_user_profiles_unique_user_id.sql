-- Ensure each user has at most one profile row.
-- First, deduplicate: keep the most recently updated row per user_id and delete the rest.
DELETE FROM user_profiles
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM user_profiles
  ORDER BY user_id, updated_at DESC NULLS LAST
);

-- Add unique constraint if it doesn't already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_user_id_key'
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;
