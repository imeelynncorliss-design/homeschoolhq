-- Enable RLS for tables currently flagged by Supabase Security Advisor.
--
-- Warning addressed:
--   "Policy Exists RLS Disabled"
--
-- This is intentionally forward-only and conservative: it enables RLS only when
-- the public table exists AND at least one policy already exists for the table.
-- That avoids blanket-enabling RLS on tables that do not yet have access
-- policies, which could accidentally hide data from authenticated users.
--
-- Apply/test in SBX first, then re-run Supabase Security Advisor.

DO $$
DECLARE
  table_name text;
  tables_to_check text[] := ARRAY[
    'calendar_conflict_resolutions',
    'calendar_connections',
    'calendar_sync_log',
    'class_enrollments',
    'coop_members',
    'daily_attendance',
    'kids',
    'lessons',
    'subject_proficiency'
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
