// ============================================================================
// API Route: /api/standards
// Browse and search user's standards with filtering
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to get user's organization
async function getUserOrganization(request?: NextRequest) {
  try {
    let user = null;
    
    // First try Authorization header (from fetch requests)
    if (request) {
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (!authError && authUser) {
          user = authUser;
        }
      }
    }
    
    // Fall back to cookies (from server-side)
    if (!user) {
      const cookieStore = await cookies();
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
          },
        }
      );

      const { data: { user: cookieUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !cookieUser) {
        console.error('getUserOrganization - no user:', userError);
        return { error: 'Unauthorized', organizationId: null };
      }
      user = cookieUser;
    }

    if (!user) {
      return { error: 'Unauthorized', organizationId: null };
    }

    const { data: kids, error: kidError } = await supabaseAdmin
      .from('kids')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1);
    
    if (kidError || !kids || kids.length === 0) {
      console.error('getUserOrganization - no org:', kidError);
      return { error: 'No organization found', organizationId: null };
    }

    return { error: null, organizationId: kids[0].organization_id };
  } catch (error) {
    console.error('getUserOrganization exception:', error);
    return { error: 'Internal error', organizationId: null };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user's organization - pass request for auth header
    const { error: authError, organizationId } = await getUserOrganization(request);
    if (authError || !organizationId) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: authError } },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const stateCode = searchParams.get('state_code');
    const gradeLevel = searchParams.get('grade_level');
    const subject = searchParams.get('subject');
    const domain = searchParams.get('domain');
    const search = searchParams.get('search');
    const isActive = searchParams.get('is_active') !== 'false';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query for user's standards
    let query = supabaseAdmin
      .from('user_standards')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('active', isActive)
      .order('standard_code');

    // Apply filters
    if (stateCode) query = query.eq('state_code', stateCode);
    if (gradeLevel) query = query.eq('grade_level', gradeLevel);
    if (subject) query = query.eq('subject', subject);
    if (domain) query = query.eq('domain', domain);
    
    if (search) {
      query = query.or(`standard_code.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: standards, error, count } = await query;

    if (error) {
      console.error('Error fetching standards:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FETCH_ERROR',
            message: 'Failed to fetch standards',
            details: error.message,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        standards: standards || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching standards:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch standards',
          details: error,
        },
      },
      { status: 500 }
    );
  }
}

// POST - Create a custom standard
export async function POST(request: NextRequest) {
  try {
    // Get user's organization - pass request for auth header
    const { error: authError, organizationId } = await getUserOrganization(request);
    if (authError || !organizationId) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: authError } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      state_code,
      grade_level, 
      subject, 
      standard_code,
      description, 
      domain,
      source = 'user_created',
    } = body;

    // Validate required fields
    if (!grade_level || !subject || !description) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'grade_level, subject, and description are required',
          },
        },
        { status: 400 }
      );
    }

    // Insert the new custom standard into user_standards
    const { data, error } = await supabaseAdmin
      .from('user_standards')
      .insert({
        organization_id: organizationId,
        state_code: state_code || 'CUSTOM',
        grade_level,
        subject,
        standard_code: standard_code || `CUSTOM-${Date.now()}`,
        description,
        domain: domain || 'Custom',
        source,
        imported_date: new Date().toISOString(),
        customized: true,
        active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating standard:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CREATE_ERROR',
            message: 'Failed to create standard',
            details: error.message,
          },
        },
        { status: 500 }
      );
    }

    console.log('Successfully created custom standard:', data.id);

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Standard created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error creating standard:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove a custom standard
export async function DELETE(request: NextRequest) {
  try {
    // Get user's organization - pass request for auth header
    const { error: authError, organizationId } = await getUserOrganization(request);
    if (authError || !organizationId) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: authError } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const standardId = searchParams.get('id');

    if (!standardId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'standard id is required' } },
        { status: 400 }
      );
    }

    // Only allow deleting standards that belong to this organization AND are custom
    const { error } = await supabaseAdmin
      .from('user_standards')
      .delete()
      .eq('id', standardId)
      .eq('organization_id', organizationId)
      .eq('customized', true);

    if (error) {
      console.error('Error deleting standard:', error);
      return NextResponse.json(
        { success: false, error: { code: 'DELETE_ERROR', message: 'Failed to delete standard', details: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Standard deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error deleting standard:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// ============================================================================
// Example usage:
// GET /api/standards?grade_level=3&subject=Mathematics
// GET /api/standards?search=multiplication&grade_level=3
// GET /api/standards?domain=Operations&page=2&limit=25
// 
// POST /api/standards
// Body: {
//   "grade_level": "11",
//   "subject": "Physics",
//   "standard_code": "TX.PHY.11.2A",
//   "description": "Apply Newton's laws to analyze motion",
//   "domain": "Forces and Motion",
//   "state_code": "TX"
// }
// ============================================================================