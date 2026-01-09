// ============================================================================
// HomeschoolHQ - Standards Alignment Types
// TypeScript type definitions for standards system
// ============================================================================

// ============================================================================
// DATABASE TYPES
// ============================================================================

export type Standard = {
  id: string;
  standard_code: string; // Matches 'code' column in DB via aliasing
  state_code: string;
  grade_level: string;
  subject: string;
  domain: string | null;
  description: string;
  full_statement: string | null;
  parent_standard_id: string | null;
  source: string | null;
  effective_year: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export interface AssessmentStandard {
  id: string;
  assessment_id: string;
  standard_id: string;
  standard?: Standard; // Joined standard data
  alignment_strength?: string;
  notes?: string;
  created_at?: string;
}

export type LessonStandard = {
  id: string;
  lesson_id: string;
  standard_id: string;
  alignment_strength: 'full' | 'partial' | 'supporting';
  notes: string | null;
  created_at: string;
  created_by: string | null;
};

export type ProficiencyLevel = 
  | 'not_started'
  | 'introduced'
  | 'developing'
  | 'proficient'
  | 'mastered';

export type StudentStandardProficiency = {
  id: string;
  kid_id: string; 
  standard_id: string;
  organization_id: string;
  proficiency_level: ProficiencyLevel;
  notes: string | null;
  evidence_count: number;
  avg_assessment_score: number | null;
  last_assessment_score: number | null;
  last_assessment_date: string | null;
  first_introduced_date: string | null;
  last_updated: string;
  updated_by: string | null;
  created_at: string;
};

// ============================================================================
// JOINED/EXTENDED TYPES
// ============================================================================

export type AssessmentStandardWithStandard = AssessmentStandard & {
  standard: Standard;
};

export type StudentProficiencyWithStandard = StudentStandardProficiency & {
  standard: Standard;
};

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export type StandardsResponse = {
  standards: Standard[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
};

export type StandardsGapAnalysis = {
  kid_id: string;
  grade_level: string;
  subject: string;
  total_standards: number;
  addressed_standards: number;
  gap_standards: Standard[];
  coverage_percentage: number;
};

// Add these to the bottom of /types/standards.ts

export type StandardsFilterParams = {
  state_code?: string;
  grade_level?: string;
  subject?: string;
  domain?: string;
  search?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
};

export type StudentStandardsCoverage = {
  student_id: string;
  organization_id: string;
  subject: string;
  grade_level: string;
  total_standards: number;
  coverage_percentage: number;
};

export type GeneratedActivity = {
  id: string;
  standard_id: string;
  title: string;
  description: string;
  activity_type?: string;
  difficulty_level?: string;
  created_at: string;
};