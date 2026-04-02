-- Add is_admin flag to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Seed existing hardcoded admins (only updates rows that exist)
UPDATE user_profiles
SET is_admin = true
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'imeelynn.corliss@gmail.com',
    'courtneyditrich@gmail.com',
    'corlissimo@gmail.com',
    'bcunningham1117@gmail.com'
  )
);
