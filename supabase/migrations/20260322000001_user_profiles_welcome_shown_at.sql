-- Add welcome_shown_at to user_profiles so the welcome + tour trigger reliably
-- across devices and sessions (not dependent on localStorage).

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS welcome_shown_at timestamptz;
