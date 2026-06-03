-- Enable RLS only on tables that already have policies.
--
-- Supabase Security Advisor warning addressed:
--   "Policy Exists RLS Disabled"
--
-- Important: enabling RLS on a table with no policies can make app data invisible
-- to authenticated users. This migration intentionally avoids that failure mode by
-- checking pg_policies first instead of blanket-enabling every public table.
--
-- Follow-up hardening should be staged table-by-table:
--   1. add/verify SELECT/INSERT/UPDATE/DELETE policies for the table
--   2. test owner + co-teacher flows in sandbox
--   3. enable RLS for that table

DO $$
DECLARE
  table_name text;
  tables_to_check text[] := ARRAY[
    'organizations',
    'user_organizations',
    'user_profiles',
    'user_subscriptions',
    'kids',
    'lessons',
    'subjects',
    'materials',
    'planning_tasks',
    'planning_periods',
    'blocked_time_slots',
    'vacation_periods',
    'school_year_config',
    'school_year_settings',
    'daily_attendance',
    'user_compliance_settings',
    'user_standards',
    'lesson_standards',
    'standard_templates',
    'available_templates',
    'assessments',
    'assessment_results',
    'assessment_standards',
    'collaborator_invites',
    'family_collaborators',
    'calendar_connections',
    'calendar_sync_log',
    'calendar_conflict_resolutions',
    'synced_work_events',
    'class_enrollments',
    'coop_members',
    'community_profiles',
    'connection_requests',
    'field_trips',
    'curriculum_imports',
    'organization_settings',
    'avatars'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables_to_check LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = table_name
      )
    THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      RAISE NOTICE 'Enabled RLS on public.%', table_name;
    ELSE
      RAISE NOTICE 'Skipped public.% because table is missing or has no policies', table_name;
    END IF;
  END LOOP;
END $$;
