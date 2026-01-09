// app/api/assessments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

// GET - Fetch all assessments with standards count
export async function GET(request: NextRequest) {
  try {
    console.log('Fetching assessments...');

    // First, get all assessments
    const { data: assessments, error: assessmentsError } = await supabase
      .from('assessments')
      .select('*')
      .order('created_at', { ascending: false });

    if (assessmentsError) {
      console.error('Error fetching assessments:', assessmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch assessments', details: assessmentsError.message },
        { status: 500 }
      );
    }

    // Then get standards count for each assessment
    const assessmentIds = assessments?.map(a => a.id) || [];
    
    let standardsCounts: { [key: string]: number } = {};
    
    if (assessmentIds.length > 0) {
      const { data: countsData, error: countsError } = await supabase
        .from('assessment_standards')
        .select('assessment_id')
        .in('assessment_id', assessmentIds);

      if (!countsError && countsData) {
        // Count occurrences of each assessment_id
        countsData.forEach(item => {
          standardsCounts[item.assessment_id] = (standardsCounts[item.assessment_id] || 0) + 1;
        });
      }
    }

    // Combine assessments with their counts
    const result = assessments?.map(assessment => ({
      ...assessment,
      standards_count: standardsCounts[assessment.id] || 0
    })) || [];

    console.log(`Successfully fetched ${result.length} assessments`);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Unexpected error fetching assessments:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create a new assessment (optional, but useful)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, assessment_type, subject, grade_level, teacher_id } = body;

    if (!title || !assessment_type) {
      return NextResponse.json(
        { error: 'Title and assessment_type are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('assessments')
      .insert({
        title,
        description,
        assessment_type,
        subject,
        grade_level,
        teacher_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating assessment:', error);
      return NextResponse.json(
        { error: 'Failed to create assessment', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    console.error('Unexpected error creating assessment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}