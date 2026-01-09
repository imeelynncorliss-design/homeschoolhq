// ============================================================================
// API Route: /api/standards
// Browse and search standards with filtering
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getStandards } from '@/lib/utils-standards';
import type { StandardsFilterParams } from '@/types/standards';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const params: StandardsFilterParams = {
      state_code: searchParams.get('state_code') || 'CCSS',
      grade_level: searchParams.get('grade_level') || undefined,
      subject: searchParams.get('subject') || undefined,
      domain: searchParams.get('domain') || undefined,
      search: searchParams.get('search') || undefined,
      is_active: searchParams.get('is_active') !== 'false',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
    };

    const result = await getStandards(params);

    return NextResponse.json({
      success: true,
      data: result,
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

/// POST - Create a custom standard
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      state_code,
      grade_level, 
      subject, 
      standard_code,
      description, 
      domain,
      source = 'Custom',
      framework = 'Custom'
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

    // Insert the new standard
    const { data, error } = await supabase
      .from('standards')
      .insert({
        state_code: state_code || null,
        grade_level,
        subject,
        standard_code: standard_code || null,
        code: standard_code || null,
        description,
        domain: domain || null,
        source,
        framework,
        effective_year: new Date().getFullYear(),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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