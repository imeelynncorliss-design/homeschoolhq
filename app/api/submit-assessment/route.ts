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

    // Insert the assessment result
    const { data: result, error: insertError } = await supabase
      .from('assessment_results')
      .insert({
        assessment_id: assessmentId,
        answers: answers,
        auto_score: autoScore, // Can be null for all short-answer assessments
        needs_manual_grading: needsManualGrading,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving assessment result:', insertError);
      return NextResponse.json({ 
        error: 'Failed to save assessment result',
        details: insertError.message 
      }, { status: 500 });
    }

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