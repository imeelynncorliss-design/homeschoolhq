// ============================================================================
// HomeschoolHQ - Standards Utilities
// Database query helpers for standards system
// ============================================================================

import { supabase } from '@/lib/supabase';
import type {
  Standard,
  StandardsFilterParams,
  StandardsResponse,
  StudentStandardProficiency,
  ProficiencyLevel,
  AssessmentStandard,
  LessonStandard,
  StandardsGapAnalysis,
  StudentStandardsCoverage,
  GeneratedActivity,
} from '@/types/standards';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

export function getSupabaseClient() {
  // Uses the centralized client imported at the top
  return supabase;
}

// ============================================================================
// STANDARDS QUERIES
// ============================================================================

/**
 * Browse and search standards with filtering and pagination
 */
export async function getStandards(
  params: StandardsFilterParams = {}
): Promise<StandardsResponse> {
  const supabase = getSupabaseClient();
  const {
    state_code = 'CCSS',
    grade_level,
    subject,
    domain,
    search,
    page = 1,
    limit = 50,
  } = params;

  // Bridge the gap: rename 'code' column to 'standard_code' for the UI
  let query = supabase
    .from('standards')
    .select('*', { count: 'exact' });

  if (state_code) query = query.eq('state_code', state_code);
  if (grade_level) query = query.eq('grade_level', grade_level);
  if (subject) query = query.eq('subject', subject);
  if (domain) query = query.eq('domain', domain);
  
  if (search) {
    query = query.or(`description.ilike.%${search}%,standard_code.ilike.%${search}%`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to).order('standard_code', { ascending: true });

  const { data, error, count } = await query;

  if (error) {
    console.error('Supabase Error in getStandards:', error);
    throw error;
  }

  // Transform the data to populate missing fields
const transformedStandards = (data || []).map(standard => ({
  ...standard,
  code: standard.code || standard.standard_code,
  framework: standard.framework || (
    standard.state_code === 'CCSS' ? 'Common Core State Standards' :
    standard.source || standard.state_code || 'Unknown'
  )
}));

return {
  standards: transformedStandards as Standard[],
  total: count || 0,
  page,
  limit,
  has_more: count ? (page * limit) < count : false,
 };
}

/**
 * Get a single standard by ID with related data
 */
export async function getStandardById(standardId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('standards')
    .select(`
      *,
      standard_code:code,
      parent_standard:parent_standard_id(*),
      child_standards:standards!parent_standard_id(*)
    `)
    .eq('id', standardId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all standards for a specific grade and subject
 */
export async function getStandardsByGradeAndSubject(
  gradeLevel: string,
  subject: string,
  stateCode: string = 'CCSS'
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('standards')
    .select('*, standard_code:code')
    .eq('state_code', stateCode)
    .eq('grade_level', gradeLevel)
    .eq('subject', subject)
    .order('domain', { ascending: true })
    .order('code', { ascending: true });

  if (error) throw error;
  return data as Standard[];
}

// ============================================================================
// ASSESSMENT-STANDARD LINKING
// ============================================================================

/**
 * Link an assessment to a standard
 */
export async function linkAssessmentToStandard(
  assessmentId: string,
  standardId: string,
  alignmentStrength: 'full' | 'partial' | 'supporting' = 'full',
  notes?: string,
  userId?: string
): Promise<AssessmentStandard> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('assessment_standards')
    .insert({
      assessment_id: assessmentId,
      standard_id: standardId,
      alignment_strength: alignmentStrength,
      notes,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as AssessmentStandard;
}

/**
 * Get all standards linked to an assessment
 */
export async function getAssessmentStandards(assessmentId: string): Promise<any[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('assessment_standards')
    .select(`
      *,
      standard:standards(*, standard_code:code) 
    `)
    .eq('assessment_id', assessmentId);

  if (error) throw error;
  return (data || []) as any[];
}

/**
 * Remove a standard from an assessment
 */
export async function unlinkAssessmentFromStandard(
  assessmentId: string,
  standardId: string
) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('assessment_standards')
    .delete()
    .eq('assessment_id', assessmentId)
    .eq('standard_id', standardId);

  if (error) throw error;
  return { success: true };
}

// ============================================================================
// PROFICIENCY TRACKING
// ============================================================================

/**
 * Update or create student proficiency for a standard
 */
export async function updateStudentProficiency(
  kidId: string,
  standardId: string,
  proficiencyLevel: ProficiencyLevel,
  organizationId: string,
  notes?: string,
  userId?: string
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('student_standard_proficiency')
    .upsert({
      kid_id: kidId,
      standard_id: standardId,
      organization_id: organizationId,
      proficiency_level: proficiencyLevel,
      notes,
      updated_by: userId,
      last_updated: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as StudentStandardProficiency;
}

/**
 * Get all proficiency records for a student
 */
export async function getStudentAllProficiencies(kidId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('student_standard_proficiency')
    .select(`*, standard:standards(*, standard_code:code)`)
    .eq('kid_id', kidId)
    .order('last_updated', { ascending: false });

  if (error) throw error;
  return data;
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export async function bulkLinkAssessmentStandards(
  assessmentId: string,
  standardIds: string[],
  userId?: string
) {
  const supabase = getSupabaseClient();
  const records = standardIds.map((standardId) => ({
    assessment_id: assessmentId,
    standard_id: standardId,
    alignment_strength: 'full' as const,
    created_by: userId,
  }));

  const { data, error } = await supabase
    .from('assessment_standards')
    .insert(records)
    .select();

  if (error) throw error;
  return data;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getProficiencyColor(level: ProficiencyLevel): string {
  const colorMap: Record<ProficiencyLevel, string> = {
    not_started: '#6b7280',
    introduced: '#3b82f6',
    developing: '#f59e0b',
    proficient: '#10b981',
    mastered: '#8b5cf6',
  };
  return colorMap[level];
}