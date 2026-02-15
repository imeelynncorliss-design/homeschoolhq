// app/api/calendar/conflicts/validate/route.ts
// Validate scheduling conflicts before creating/updating lessons

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { getOrganizationId } from '@/src/lib/auth-helpers';
import {
  checkLessonSchedulingConflicts,
  checkBatchLessonConflicts,
} from '@/src/lib/calendar/conflict-detection';

/**
 * POST /api/calendar/conflicts/validate
 * Validate a lesson time for conflicts with blocked time slots and other lessons
 * 
 * Request body:
 * {
 *   start_time: string (ISO),
 *   end_time: string (ISO),
 *   kid_id?: string,
 *   lesson_id?: string (for updates)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const organizationId = await getOrganizationId();
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { start_time, end_time, kid_id, lesson_id } = body;

    // Validate required fields
    if (!start_time || !end_time) {
      return NextResponse.json(
        { error: 'Missing required fields: start_time, end_time' },
        { status: 400 }
      );
    }

    // Validate time range
    if (new Date(end_time) <= new Date(start_time)) {
      return NextResponse.json(
        { error: 'end_time must be after start_time' },
        { status: 400 }
      );
    }

    // Check for conflicts
    const conflictCheck = await checkLessonSchedulingConflicts(
      organizationId,
      {
        start_time,
        end_time,
        kid_id,
        lesson_id,
      }
    );

    // Return validation results
    return NextResponse.json({
      valid: conflictCheck.canSchedule,
      hasConflict: conflictCheck.hasConflict,
      canSchedule: conflictCheck.canSchedule,
      conflicts: {
        blockedTime: conflictCheck.blockedTimeConflicts,
        lessons: conflictCheck.lessonConflicts,
      },
      warnings: conflictCheck.warnings,
      summary: generateValidationSummary(conflictCheck),
    });

  } catch (error: any) {
    console.error('Failed to validate conflicts:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate human-readable validation summary
 */
function generateValidationSummary(conflictCheck: any): string {
  if (conflictCheck.canSchedule) {
    if (conflictCheck.hasConflict) {
      return 'Can schedule with warnings';
    }
    return 'No conflicts - safe to schedule';
  }

  const reasons: string[] = [];

  if (conflictCheck.blockedTimeConflicts.conflictSeverity === 'full') {
    reasons.push('time is completely blocked by work events');
  }

  if (conflictCheck.lessonConflicts.length > 0) {
    reasons.push(`conflicts with ${conflictCheck.lessonConflicts.length} existing lesson(s)`);
  }

  return `Cannot schedule: ${reasons.join(' and ')}`;
}