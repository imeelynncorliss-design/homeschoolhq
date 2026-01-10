// ============================================================================
// API Route: /api/students/[id]/proficiency
// Track and update student proficiency on standards
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getStudentAllProficiencies,
  getStudentProficiency,
  updateStudentProficiency,
  getStudentCoverage,
  getStandardsGaps,
  getStandardsByProficiency,
} from '@/lib/utils-standards';
import type { ProficiencyLevel } from '@/types/standards';

// GET - Get proficiency data for a student
export async function GET(
  request: NextRequest,
  { params }: { params: Promise< { id: string }> }
) {
  try {
    const { id: kidId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const standardId = searchParams.get('standard_id');
    const action = searchParams.get('action'); // 'coverage', 'gaps', 'by_level'
    const subject = searchParams.get('subject');
    const gradeLevel = searchParams.get('grade_level');
    const proficiencyLevel = searchParams.get('proficiency_level') as ProficiencyLevel | null;

    // Get specific standard proficiency
    if (standardId) {
      const proficiency = await getStudentProficiency(kidId, standardId);
      return NextResponse.json({
        success: true,
        data: proficiency,
      });
    }

    // Get coverage report
    if (action === 'coverage') {
      const coverage = await getStudentCoverage(kidId, subject || undefined, gradeLevel || undefined);
      return NextResponse.json({
        success: true,
        data: coverage,
      });
    }

    // Get gap analysis
    if (action === 'gaps' && gradeLevel && subject) {
      const gaps = await getStandardsGaps(kidId, gradeLevel, subject);
      return NextResponse.json({
        success: true,
        data: gaps,
      });
    }

    // Get standards by proficiency level
    if (action === 'by_level' && proficiencyLevel) {
      const standards = await getStandardsByProficiency(kidId, proficiencyLevel);
      return NextResponse.json({
        success: true,
        data: standards,
      });
    }

    // Default: Get all proficiencies
    const allProficiencies = await getStudentAllProficiencies(kidId);
    return NextResponse.json({
      success: true,
      data: allProficiencies,
    });
  } catch (error) {
    console.error('Error fetching student proficiency:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch proficiency data',
        },
      },
      { status: 500 }
    );
  }
}

// PUT - Update student proficiency for a standard
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: kidId } = await params;
    const body = await request.json();
    const {
      standard_id,
      proficiency_level,
      organization_id,
      notes,
      user_id,
    } = body;

    // Validation
    if (!standard_id || !proficiency_level || !organization_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'standard_id, proficiency_level, and organization_id are required',
          },
        },
        { status: 400 }
      );
    }

    const validLevels: ProficiencyLevel[] = [
      'not_started',
      'introduced',
      'developing',
      'proficient',
      'mastered',
    ];

    if (!validLevels.includes(proficiency_level)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid proficiency_level. Must be one of: ${validLevels.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    const result = await updateStudentProficiency(
      kidId,
      standard_id,
      proficiency_level,
      organization_id,
      notes,
      user_id
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Proficiency updated successfully',
    });
  } catch (error) {
    console.error('Error updating proficiency:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update proficiency',
        },
      },
      { status: 500 }
    );
  }
}

// POST - Bulk update proficiencies (e.g., after grading an assessment)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id:kidId } = await params;
    const body = await request.json();
    const { updates, organization_id, user_id } = body;

    if (!Array.isArray(updates) || !organization_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'updates array and organization_id are required',
          },
        },
        { status: 400 }
      );
    }

    // Process each update
    const results = await Promise.all(
      updates.map(async (update: any) => {
        return updateStudentProficiency(
          kidId,
          update.standard_id,
          update.proficiency_level,
          organization_id,
          update.notes,
          user_id
        );
      })
    );

    return NextResponse.json({
      success: true,
      data: results,
      message: `Updated ${results.length} proficiency records`,
    });
  } catch (error) {
    console.error('Error bulk updating proficiency:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BULK_UPDATE_ERROR',
          message: 'Failed to bulk update proficiencies',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Example usage:
// 
// Get all proficiencies for a student:
// GET /api/students/kid123/proficiency
//
// Get specific standard proficiency:
// GET /api/students/kid123/proficiency?standard_id=std456
//
// Get coverage report:
// GET /api/students/kid123/proficiency?action=coverage&subject=Mathematics&grade_level=3
//
// Get gap analysis:
// GET /api/students/kid123/proficiency?action=gaps&subject=Mathematics&grade_level=3
//
// Get standards by proficiency level:
// GET /api/students/kid123/proficiency?action=by_level&proficiency_level=developing
//
// Update proficiency:
// PUT /api/students/kid123/proficiency
//   Body: {
//     "standard_id": "std456",
//     "proficiency_level": "proficient",
//     "organization_id": "org789",
//     "notes": "Great progress!"
//   }
//
// Bulk update after assessment:
// POST /api/students/kid123/proficiency
//   Body: {
//     "organization_id": "org789",
//     "updates": [
//       { "standard_id": "std1", "proficiency_level": "proficient" },
//       { "standard_id": "std2", "proficiency_level": "developing" }
//     ]
//   }
// ============================================================================