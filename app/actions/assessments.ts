// app/actions/assessments.ts
'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 

/**
 * Fetches assessments and results for the viewer
 */
export async function getPastAssessments(kidId: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: assessments, error: aError } = await supabase
    .from('assessments')
    .select('*, lessons(title, subject)')
    .eq('kid_id', kidId)
    .order('created_at', { ascending: false });

  if (aError) throw new Error(aError.message);

  const assessmentIds = assessments?.map(a => a.id) || [];
  const { data: results, error: rError } = await supabase
    .from('assessment_results')
    .select('*')
    .in('assessment_id', assessmentIds);

  if (rError) throw new Error(rError.message);

  return {
    assessments: (assessments || []) as any[],
    results: (results || []) as any[]
  };
}

/**
 * UPDATED: Updates the manual grade and clears the "Needs Review" flag
 * Now includes parent comments
 */
export async function updateManualGrade(
  resultId: string, 
  newScore: number, 
  parentComments?: string
) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const now = new Date().toISOString();
  const updateData: any = { 
    auto_score: newScore,
    manual_score: newScore,
    needs_manual_grading: false,
    status: 'graded',
    completed: true,
    graded_at: now,
    updated_at: now
  };

  // Add parent comments if provided
  if (parentComments !== undefined) {
    updateData.parent_comments = parentComments;
  }

  const { data: result, error } = await supabase
    .from('assessment_results')
    .update(updateData)
    .eq('id', resultId)
    .select('assessment_id')
    .single();

  if (error) {
    console.error('Update Grade Error:', error);
    throw error;
  }

  if (result?.assessment_id) {
    const { error: assessmentError } = await supabase
      .from('assessments')
      .update({
        score: newScore,
        status: 'graded',
        completed: true,
        updated_at: now,
      })
      .eq('id', result.assessment_id);

    if (assessmentError) {
      console.error('Update Assessment Grade Error:', assessmentError);
      throw assessmentError;
    }
  }
  
  return { success: true };
}

/**
 * Deletes an assessment and all related data
 * Cascades through: assessment_standards -> assessment_results -> assessments
 */
export async function deleteAssessment(assessmentId: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Delete assessment_standards first (junction table)
    const { error: standardsError } = await supabase
      .from('assessment_standards')
      .delete()
      .eq('assessment_id', assessmentId);

    if (standardsError) {
      console.error('Error deleting assessment standards:', standardsError);
      throw new Error('Failed to delete assessment standards');
    }

    // Delete assessment_results
    const { error: resultsError } = await supabase
      .from('assessment_results')
      .delete()
      .eq('assessment_id', assessmentId);

    if (resultsError) {
      console.error('Error deleting assessment results:', resultsError);
      throw new Error('Failed to delete assessment results');
    }

    // Finally, delete the assessment itself
    const { error: assessmentError } = await supabase
      .from('assessments')
      .delete()
      .eq('id', assessmentId);

    if (assessmentError) {
      console.error('Error deleting assessment:', assessmentError);
      throw new Error('Failed to delete assessment');
    }

    return { success: true };
  } catch (error) {
    console.error('Delete assessment error:', error);
    throw error;
  }
}