-- Add missing columns to user_profiles that were added directly via Supabase dashboard
-- These columns support: parent first name, homeschool style preference, and pinned home screen features

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS homeschool_style text,
  ADD COLUMN IF NOT EXISTS pinned_features text[];

-- RLS: users can update their own profile row (policy likely already exists for other columns)
-- Only add if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles'
      AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON user_profiles FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
