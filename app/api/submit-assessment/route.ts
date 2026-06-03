// app/api/submit-assessment/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { assessmentId, answers, autoScore, needsManualGrading } = await request.json();

    console.log('=== SUBMIT ASSESSMENT DEBUG ===');
    console.log('Assessment ID:', assessmentId);
    console.log('Auto Score:', autoScore);
    console.log('Needs Manual Grading:', needsManualGrading);
    console.log('Answers count:', answers?.length);

    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('id, organization_id, kid_id')
      .eq('id', assessmentId)
      .single();

    if (assessmentError || !assessment) {
      console.error('Error loading assessment before saving result:', assessmentError);
      return NextResponse.json({
        error: 'Assessment record was not found',
        details: assessmentError?.message || 'No assessment returned for this id'
      }, { status: 404 });
    }

    const submittedAt = new Date().toISOString();

    // Insert or update the parent assessment result
    const { data: result, error: insertError } = await supabase
      .from('assessment_results')
      .upsert({
        assessment_id: assessmentId,
        organization_id: assessment.organization_id,
        kid_id: assessment.kid_id,
        answers: answers,
        auto_score: autoScore, // Can be null for short-answer/project assessments
        needs_manual_grading: needsManualGrading,
        status: needsManualGrading ? 'needs_review' : 'completed',
        completed: true,
        completed_at: submittedAt,
        submitted_at: submittedAt,
        updated_at: submittedAt
      }, { onConflict: 'assessment_id' })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving assessment result:', insertError);
      return NextResponse.json({ 
        error: 'Failed to save assessment result',
        details: insertError.message 
      }, { status: 500 });
    }

    await supabase
      .from('assessments')
      .update({
        completed: true,
        completed_at: submittedAt,
        status: needsManualGrading ? 'needs_review' : 'completed',
        score: autoScore,
        updated_at: submittedAt
      })
      .eq('id', assessmentId);

    console.log('Assessment result saved successfully:', result);

    return NextResponse.json({ 
      success: true, 
      result: result 
    });

  } catch (error) {
    console.error('Submit assessment error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to submit assessment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}