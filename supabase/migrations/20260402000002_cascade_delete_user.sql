-- Enable cascading deletes when a user is deleted.
-- Most data hangs off organizations (via organization_id), so cascading
-- organizations → auth.users cleans up the bulk of it.
-- User-level tables (user_profiles, user_subscriptions, etc.) are handled separately.

-- 1. organizations: cascade from auth.users
ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_user_id_fkey,
  ADD CONSTRAINT organizations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. user_profiles
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey,
  ADD CONSTRAINT user_profiles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. user_subscriptions
ALTER TABLE user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey,
  ADD CONSTRAINT user_subscriptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. user_organizations (junction table)
ALTER TABLE user_organizations
  DROP CONSTRAINT IF EXISTS user_organizations_user_id_fkey,
  ADD CONSTRAINT user_organizations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. user_standards
ALTER TABLE user_standards
  DROP CONSTRAINT IF EXISTS user_standards_user_id_fkey,
  ADD CONSTRAINT user_standards_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. family_collaborators
ALTER TABLE family_collaborators
  DROP CONSTRAINT IF EXISTS family_collaborators_user_id_fkey,
  ADD CONSTRAINT family_collaborators_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 7. collaborator_invites (two user references) — guard against missing columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collaborator_invites' AND column_name = 'from_user_id'
  ) THEN
    ALTER TABLE collaborator_invites
      DROP CONSTRAINT IF EXISTS collaborator_invites_from_user_id_fkey;
    ALTER TABLE collaborator_invites
      ADD CONSTRAINT collaborator_invites_from_user_id_fkey
        FOREIGN KEY (from_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collaborator_invites' AND column_name = 'to_user_id'
  ) THEN
    ALTER TABLE collaborator_invites
      DROP CONSTRAINT IF EXISTS collaborator_invites_to_user_id_fkey;
    ALTER TABLE collaborator_invites
      ADD CONSTRAINT collaborator_invites_to_user_id_fkey
        FOREIGN KEY (to_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 8. community_profiles
ALTER TABLE community_profiles
  DROP CONSTRAINT IF EXISTS community_profiles_user_id_fkey,
  ADD CONSTRAINT community_profiles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 9. connection_requests (two user references)
ALTER TABLE connection_requests
  DROP CONSTRAINT IF EXISTS connection_requests_from_user_id_fkey,
  ADD CONSTRAINT connection_requests_from_user_id_fkey
    FOREIGN KEY (from_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE connection_requests
  DROP CONSTRAINT IF EXISTS connection_requests_to_user_id_fkey,
  ADD CONSTRAINT connection_requests_to_user_id_fkey
    FOREIGN KEY (to_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
