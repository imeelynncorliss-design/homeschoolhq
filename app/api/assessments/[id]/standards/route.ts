// app/api/assessments/[id]/standards/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

// GET - Fetch all standards for an assessment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;
    console.log('Fetching standards for assessment:', assessmentId);

    // Query using YOUR actual column names
    const { data, error } = await supabase
      .from('assessment_standards')
      .select(`
        id,
        assessment_id,
        standard_id,
        alignment_strength,
        notes,
        created_at,
        standards (
          id,
          framework,
          code,
          standard_code,
          description,
          full_statement,
          subject,
          grade_level,
          domain,
          state_code
        )
      `)
      .eq('assessment_id', assessmentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assessment standards:', error);
      return NextResponse.json(
        { error: 'Failed to fetch standards', details: error.message },
        { status: 500 }
      );
    }

    // Transform to match frontend expectations
    const result = data?.map(item => {
      const standard = Array.isArray(item.standards) ? item.standards[0] : item.standards;
      return {
        id: item.id,
        assessment_id: item.assessment_id,
        standard_id: item.standard_id,
        added_at: item.created_at,
        standard: {
          id: standard.id,
          framework: standard.framework || 'Not specified',
          code: standard.code || standard.standard_code || 'N/A',
          description: standard.description || standard.full_statement || 'No description',
          subject: standard.subject,
          grade_level: standard.grade_level,
          domain: standard.domain,
        }
      };
    }) || [];

    console.log(`Found ${result.length} standards`);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Add standards to an assessment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;
    const body = await request.json();
    const { standard_ids, alignment_strength = 'full', notes, created_by } = body;

    console.log('Adding standards to assessment:', assessmentId, standard_ids);

    if (!Array.isArray(standard_ids) || standard_ids.length === 0) {
      return NextResponse.json(
        { error: 'standard_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    // Check for existing associations
    const { data: existing } = await supabase
      .from('assessment_standards')
      .select('standard_id')
      .eq('assessment_id', assessmentId)
      .in('standard_id', standard_ids);

    const existingIds = new Set(existing?.map(e => e.standard_id) || []);
    const newStandardIds = standard_ids.filter(id => !existingIds.has(id));

    if (newStandardIds.length === 0) {
      return NextResponse.json({
        message: 'All standards already added',
        added: 0,
        skipped: standard_ids.length
      });
    }

    // Insert new associations with YOUR schema
    const insertData = newStandardIds.map(standard_id => ({
      assessment_id: assessmentId,
      standard_id,
      alignment_strength,
      notes,
      created_by,
      created_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('assessment_standards')
      .insert(insertData);

    if (insertError) {
      console.error('Error adding standards:', insertError);
      return NextResponse.json(
        { error: 'Failed to add standards', details: insertError.message },
        { status: 500 }
      );
    }

    console.log(`Successfully added ${newStandardIds.length} standards`);
    return NextResponse.json({
      success: true,
      added: newStandardIds.length,
      skipped: standard_ids.length - newStandardIds.length,
      message: `Successfully added ${newStandardIds.length} standard(s)`
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a standard from an assessment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { assessment_standard_id } = body;

    console.log('Removing assessment standard:', assessment_standard_id);

    if (!assessment_standard_id) {
      return NextResponse.json(
        { error: 'assessment_standard_id is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('assessment_standards')
      .delete()
      .eq('id', assessment_standard_id);

    if (error) {
      console.error('Error removing standard:', error);
      return NextResponse.json(
        { error: 'Failed to remove standard', details: error.message },
        { status: 500 }
      );
    }

    console.log('Successfully removed standard');
    return NextResponse.json({
      success: true,
      message: 'Standard removed successfully'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}