// app/api/standards/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateStudentProficiency, getStudentAllProficiencies } from '@/lib/utils-standards';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// EXISTING: Get student proficiencies
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const proficiencies = await getStudentAllProficiencies(id);
    return NextResponse.json({ success: true, data: proficiencies });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}

// EXISTING: Update student proficiency
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body = await request.json();
    const result = await updateStudentProficiency(
      id,
      body.standard_id,
      body.proficiency_level,
      body.organization_id,
      body.notes,
      body.user_id
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}

// NEW: Delete a standard
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: standardId } = await params;

    if (!standardId) {
      return NextResponse.json({
        success: false,
        error: { code: 'MISSING_ID', message: 'Standard ID is required' }
      }, { status: 400 });
    }

    // Get auth token from headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authorization header required' }
      }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify user with Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
      }, { status: 401 });
    }

    // Get the user's organization_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.organization_id) {
      return NextResponse.json({
        success: false,
        error: { code: 'NO_ORGANIZATION', message: 'User organization not found' }
      }, { status: 404 });
    }

    const organizationId = userData.organization_id;

    // First, check if the standard exists and belongs to this organization
    const { data: existingStandard, error: fetchError } = await supabase
      .from('user_standards')
      .select('id, organization_id')
      .eq('id', standardId)
      .single();

    if (fetchError || !existingStandard) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Standard not found' }
      }, { status: 404 });
    }

    // Verify the standard belongs to the user's organization
    if (existingStandard.organization_id !== organizationId) {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to delete this standard' }
      }, { status: 403 });
    }

    // Check if this standard is being used in any assessments
    const { data: assessmentStandards, error: checkError } = await supabase
      .from('assessment_standards')
      .select('id')
      .eq('user_standard_id', standardId);

    if (checkError) {
      console.error('Error checking assessment usage:', checkError);
      return NextResponse.json({
        success: false,
        error: { code: 'CHECK_ERROR', message: 'Failed to check if standard is in use' }
      }, { status: 500 });
    }

    // If the standard is being used, prevent deletion
    if (assessmentStandards && assessmentStandards.length > 0) {
      return NextResponse.json({
        success: false,
        error: { 
          code: 'IN_USE', 
          message: `This standard is currently aligned with ${assessmentStandards.length} assessment(s). Please remove these alignments before deleting the standard.` 
        }
      }, { status: 409 }); // 409 Conflict
    }

    // Delete the standard
    const { error: deleteError } = await supabase
      .from('user_standards')
      .delete()
      .eq('id', standardId);

    if (deleteError) {
      console.error('Error deleting standard:', deleteError);
      return NextResponse.json({
        success: false,
        error: { code: 'DELETE_ERROR', message: `Failed to delete standard: ${deleteError.message}` }
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Standard deleted successfully'
    }, { status: 200 });

  } catch (error: any) {
    console.error('Delete standard error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Internal server error' }
    }, { status: 500 });
  }
}