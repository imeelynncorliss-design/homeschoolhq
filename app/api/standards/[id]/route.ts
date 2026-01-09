// ============================================================================
// API Route: /api/standards
// Browse and search standards with filtering
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getStandards } from '@/lib/utils-standards';
import type { StandardsFilterParams } from '@/types/standards';

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

// ============================================================================
// Example usage:
// GET /api/standards?grade_level=3&subject=Mathematics
// GET /api/standards?search=multiplication&grade_level=3
// GET /api/standards?domain=Operations&page=2&limit=25
// ============================================================================