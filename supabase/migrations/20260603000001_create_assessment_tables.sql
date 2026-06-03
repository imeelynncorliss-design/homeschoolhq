-- Create assessment tables used by parent-administered assessment/test flows.
-- These tables are referenced throughout the app but were missing from earlier migrations.
-- Idempotent so it is safe for environments that already have some/all tables.

CREATE TABLE IF NOT EXISTS public.assessments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  assessment_type text NOT NULL,
  type text NOT NULL,
  subject text,
  grade_level text,
  difficulty text,
  question_count integer,
  content jsonb,
  score numeric,
  status text DEFAULT 'generated',
  completed boolean DEFAULT false,
  completed_at timestamptz,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  kid_id uuid REFERENCES public.kids(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.kids(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  teacher_id uuid,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assessments_organization_id_idx ON public.assessments (organization_id);
CREATE INDEX IF NOT EXISTS assessments_kid_id_idx ON public.assessments (kid_id);
CREATE INDEX IF NOT EXISTS assessments_lesson_id_idx ON public.assessments (lesson_id);
CREATE INDEX IF NOT EXISTS assessments_created_at_idx ON public.assessments (created_at DESC);

CREATE TABLE IF NOT EXISTS public.assessment_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id uuid UNIQUE REFERENCES public.assessments(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  kid_id uuid REFERENCES public.kids(id) ON DELETE CASCADE,
  answers jsonb NOT NULL,
  auto_score numeric,
  manual_score numeric,
  needs_manual_grading boolean DEFAULT false,
  parent_comments text,
  parent_feedback text,
  status text DEFAULT 'submitted',
  completed boolean DEFAULT true,
  completed_at timestamptz,
  graded_at timestamptz,
  time_spent_minutes integer,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assessment_results_assessment_id_idx ON public.assessment_results (assessment_id);
CREATE INDEX IF NOT EXISTS assessment_results_organization_id_idx ON public.assessment_results (organization_id);
CREATE INDEX IF NOT EXISTS assessment_results_kid_id_idx ON public.assessment_results (kid_id);

CREATE TABLE IF NOT EXISTS public.assessment_standards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_standard_id uuid NOT NULL REFERENCES public.user_standards(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  alignment_strength text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (assessment_id, user_standard_id)
);

CREATE INDEX IF NOT EXISTS assessment_standards_assessment_id_idx ON public.assessment_standards (assessment_id);
CREATE INDEX IF NOT EXISTS assessment_standards_user_standard_id_idx ON public.assessment_standards (user_standard_id);
CREATE INDEX IF NOT EXISTS assessment_standards_organization_id_idx ON public.assessment_standards (organization_id);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_standards ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Org owners can manage assessments"
    ON public.assessments FOR ALL
    USING (
      organization_id IN (
        SELECT id FROM public.organizations WHERE user_id = auth.uid()
      )
    )
    WITH CHECK (
      organization_id IN (
        SELECT id FROM public.organizations WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Co-teachers can manage assessments"
    ON public.assessments FOR ALL
    USING (
      organization_id IN (
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
      )
    )
    WITH CHECK (
      organization_id IN (
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Org owners can manage assessment results"
    ON public.assessment_results FOR ALL
    USING (
      organization_id IN (
        SELECT id FROM public.organizations WHERE user_id = auth.uid()
      )
      OR assessment_id IN (
        SELECT id FROM public.assessments
        WHERE organization_id IN (
          SELECT id FROM public.organizations WHERE user_id = auth.uid()
        )
      )
    )
    WITH CHECK (
      organization_id IN (
        SELECT id FROM public.organizations WHERE user_id = auth.uid()
      )
      OR assessment_id IN (
        SELECT id FROM public.assessments
        WHERE organization_id IN (
          SELECT id FROM public.organizations WHERE user_id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Co-teachers can manage assessment results"
    ON public.assessment_results FOR ALL
    USING (
      organization_id IN (
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
      )
      OR assessment_id IN (
        SELECT id FROM public.assessments
        WHERE organization_id IN (
          SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
        )
      )
    )
    WITH CHECK (
      organization_id IN (
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
      )
      OR assessment_id IN (
        SELECT id FROM public.assessments
        WHERE organization_id IN (
          SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Org owners can manage assessment standards"
    ON public.assessment_standards FOR ALL
    USING (
      organization_id IN (
        SELECT id FROM public.organizations WHERE user_id = auth.uid()
      )
      OR assessment_id IN (
        SELECT id FROM public.assessments
        WHERE organization_id IN (
          SELECT id FROM public.organizations WHERE user_id = auth.uid()
        )
      )
    )
    WITH CHECK (
      organization_id IN (
        SELECT id FROM public.organizations WHERE user_id = auth.uid()
      )
      OR assessment_id IN (
        SELECT id FROM public.assessments
        WHERE organization_id IN (
          SELECT id FROM public.organizations WHERE user_id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Co-teachers can manage assessment standards"
    ON public.assessment_standards FOR ALL
    USING (
      organization_id IN (
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
      )
      OR assessment_id IN (
        SELECT id FROM public.assessments
        WHERE organization_id IN (
          SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
        )
      )
    )
    WITH CHECK (
      organization_id IN (
        SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
      )
      OR assessment_id IN (
        SELECT id FROM public.assessments
        WHERE organization_id IN (
          SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
