// app/api/submit-assessment/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { assessmentId, answers, autoScore, submittedAt, needsManualGrading } = await request.json();

    // Save assessment results
    const { data: result, error } = await supabase
      .from('assessment_results')
      .insert({
        assessment_id: assessmentId,
        answers: answers,
        auto_score: autoScore,
        needs_manual_grading: needsManualGrading,
        submitted_at: submittedAt,
        completed: true
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save assessment results:', error);
      return NextResponse.json({ error: 'Failed to save results' }, { status: 500 });
    }

    // Update the assessment record with completion status
    await supabase
      .from('assessments')
      .update({ 
        completed: true,
        completed_at: submittedAt,
        score: autoScore
      })
      .eq('id', assessmentId);

    return NextResponse.json({ 
      success: true,
      resultId: result.id,
      score: autoScore
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