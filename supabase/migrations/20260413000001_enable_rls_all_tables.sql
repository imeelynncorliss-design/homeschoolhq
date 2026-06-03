-- Enable RLS on all tables that have policies defined but RLS not yet enabled.
-- Tables already enabled (skipped here):
--   user_agreements, portfolio_uploads, ai_usage, state_compliance,
--   school_day_logs, co_teacher_tasks, daily_subject_logs
--
-- Run this migration to resolve the 42 "Policy Exists RLS Disabled" errors
-- in the Supabase Security Advisor.
--
-- All existing app-layer queries are already scoped by user_id / organization_id
-- so enabling RLS here should not break any existing functionality, but test
-- against staging before applying to production.

-- Core user + org tables
ALTER TABLE public.organizations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organizations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions         ENABLE ROW LEVEL SECURITY;

-- Students
ALTER TABLE public.kids                       ENABLE ROW LEVEL SECURITY;

-- Planning
ALTER TABLE public.lessons                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_periods           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_time_slots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_periods           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_year_config         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_year_settings       ENABLE ROW LEVEL SECURITY;

-- Compliance + attendance
ALTER TABLE public.daily_attendance           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_compliance_settings   ENABLE ROW LEVEL SECURITY;

-- Standards
ALTER TABLE public.user_standards             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_standards           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standard_templates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.available_templates        ENABLE ROW LEVEL SECURITY;

-- Assessments
-- Some environments were missing these tables before the create-assessment-tables migration was added.
-- Guard these statements so fresh migration runs do not fail before the tables are created.
DO $$ BEGIN
  IF to_regclass('public.assessments') IS NOT NULL THEN
    ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.assessment_results') IS NOT NULL THEN
    ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.assessment_standards') IS NOT NULL THEN
    ALTER TABLE public.assessment_standards ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Collaboration + calendar
ALTER TABLE public.collaborator_invites       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_collaborators       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_connections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_sync_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_conflict_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synced_work_events         ENABLE ROW LEVEL SECURITY;

-- Co-op
ALTER TABLE public.class_enrollments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coop_members               ENABLE ROW LEVEL SECURITY;

-- Community + profiles
ALTER TABLE public.community_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_requests        ENABLE ROW LEVEL SECURITY;

-- Records
ALTER TABLE public.field_trips                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_imports         ENABLE ROW LEVEL SECURITY;

-- Org settings + avatars
ALTER TABLE public.organization_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatars                    ENABLE ROW LEVEL SECURITY;
