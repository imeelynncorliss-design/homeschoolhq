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

// ============================================================================
// STUDENT PROFICIENCY QUERIES (Single student lookup)
// ============================================================================

/**
 * Get proficiency for a specific student and standard
 */
export async function getStudentProficiency(
  kidId: string,
  standardId: string
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('student_standard_proficiency')
    .select('*')
    .eq('kid_id', kidId)
    .eq('standard_id', standardId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found, which is ok
  return data;
}

// ============================================================================
// GENERATED ACTIVITIES
// ============================================================================

/**
 * Save a generated activity
 */
export async function saveGeneratedActivity(
  activity: {
    standard_id: string;
    kid_id?: string | null;
    organization_id: string;
    title: string;
    activity_type: string;
    difficulty_level: string;
    description: string;
    materials_needed: string;
    instructions: string;
    duration_minutes: number;
    generated_by_ai: boolean;
    ai_prompt_context: any;
    used_count: number;
    is_favorite: boolean;
    is_archived: boolean;
    created_by?: string;
  }
) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('generated_activities')
    .insert(activity)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get activities for a standard
 */
export async function getActivitiesForStandard(
  standardId: string,
  kidId?: string
) {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('generated_activities')
    .select('*')
    .eq('standard_id', standardId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (kidId) {
    query = query.or(`kid_id.eq.${kidId},kid_id.is.null`);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

// ============================================================================
// ADVANCED PROFICIENCY ANALYTICS
// ============================================================================

/**
 * Get student coverage summary by subject
 */
export async function getStudentCoverage(
  kidId: string,
  subject?: string,
  gradeLevel?: string
) {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('student_standard_proficiency')
    .select(`
      *,
      standard:standards(subject, grade_level, domain)
    `)
    .eq('kid_id', kidId);

  const { data, error } = await query;

  if (error) throw error;

  // Group by subject and calculate coverage
  const coverage: Record<string, any> = {};
  
  data?.forEach((prof: any) => {
    const subj = prof.standard?.subject;
    if (!subj) return;
    
    if (!coverage[subj]) {
      coverage[subj] = {
        subject: subj,
        total: 0,
        not_started: 0,
        introduced: 0,
        developing: 0,
        proficient: 0,
        mastered: 0
      };
    }
    
    coverage[subj].total++;
    coverage[subj][prof.proficiency_level]++;
  });

  return Object.values(coverage);
}

/**
 * Gap analysis - find standards not yet addressed for a student
 */
export async function getStandardsGaps(
  kidId: string,
  gradeLevel: string,
  subject: string,
  stateCode: string = 'CCSS'
) {
  const supabase = getSupabaseClient();

  // Get all standards for this grade/subject
  const allStandards = await getStandardsByGradeAndSubject(
    gradeLevel,
    subject,
    stateCode
  );

  // Get standards already addressed by this student
  const { data: addressedData } = await supabase
    .from('student_standard_proficiency')
    .select('standard_id')
    .eq('kid_id', kidId)
    .neq('proficiency_level', 'not_started');

  const addressedIds = new Set(
    addressedData?.map((p) => p.standard_id) || []
  );

  // Find gaps
  const gapStandards = allStandards.filter(
    (s) => !addressedIds.has(s.id)
  );

  return {
    kid_id: kidId,
    grade_level: gradeLevel,
    subject,
    total_standards: allStandards.length,
    addressed_standards: addressedIds.size,
    gap_standards: gapStandards,
    coverage_percentage: Math.round(
      (addressedIds.size / allStandards.length) * 100
    ),
  };
}

/**
 * Get standards by proficiency level for a student
 */
export async function getStandardsByProficiency(
  kidId: string,
  proficiencyLevel: ProficiencyLevel
) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('student_standard_proficiency')
    .select(`
      *,
      standard:standards(*)
    `)
    .eq('kid_id', kidId)
    .eq('proficiency_level', proficiencyLevel);

  if (error) throw error;
  return data || [];
}