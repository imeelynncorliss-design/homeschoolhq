// src/lib/calendar/lesson-conflict-integration.ts
// Integration helper to add conflict validation to lesson creation/update endpoints

import { createClient } from '@/src/lib/supabase/server';
import { checkLessonSchedulingConflicts } from './conflict-detection';

export interface LessonConflictCheckResult {
  canSchedule: boolean;
  shouldProceed: boolean;
  error?: string;
  warnings: string[];
  conflictDetails?: any;
}

/**
 * Validate lesson scheduling before creating/updating
 * Call this in your lesson creation/update endpoints BEFORE saving to database
 * 
 * @param organizationId - Organization ID
 * @param lessonData - Lesson data to validate
 * @param options - Validation options
 * @returns Validation result
 */
export async function validateLessonBeforeSave(
  organizationId: string,
  lessonData: {
    start_time: string;
    end_time: string;
    kid_id?: string;
    lesson_id?: string;
  },
  options?: {
    allowPartialConflicts?: boolean; // Allow scheduling with partial blocked time conflicts
    allowLessonConflicts?: boolean; // Allow double-booking lessons (generally false)
  }
): Promise<LessonConflictCheckResult> {
  const allowPartialConflicts = options?.allowPartialConflicts ?? true;
  const allowLessonConflicts = options?.allowLessonConflicts ?? false;

  try {
    // Check for conflicts
    const conflictCheck = await checkLessonSchedulingConflicts(
      organizationId,
      lessonData
    );

    const warnings: string[] = [...conflictCheck.warnings];

    // Check if we can proceed
    let canSchedule = true;
    let shouldProceed = true;
    let error: string | undefined;

    // CRITICAL: Full blocked time conflicts ALWAYS prevent scheduling
    if (conflictCheck.blockedTimeConflicts.conflictSeverity === 'full') {
      canSchedule = false;
      shouldProceed = false;
      error = 'Cannot schedule - time is completely blocked by work events';
    }
    
    // Partial blocked time conflicts - warn but allow if configured
    else if (
      conflictCheck.blockedTimeConflicts.conflictSeverity === 'partial' &&
      !allowPartialConflicts
    ) {
      canSchedule = false;
      shouldProceed = false;
      error = 'Cannot schedule - time partially conflicts with blocked time';
    }
    
    // Lesson conflicts - generally prevent scheduling
    if (conflictCheck.lessonConflicts.length > 0 && !allowLessonConflicts) {
      canSchedule = false;
      shouldProceed = false;
      error = error 
        ? `${error}; Also conflicts with existing lessons`
        : `Cannot schedule - conflicts with ${conflictCheck.lessonConflicts.length} existing lesson(s)`;
    }

    return {
      canSchedule,
      shouldProceed,
      error,
      warnings,
      conflictDetails: conflictCheck,
    };

  } catch (err: any) {
    console.error('Failed to validate lesson scheduling:', err);
    return {
      canSchedule: false,
      shouldProceed: false,
      error: 'Failed to validate scheduling conflicts',
      warnings: [],
    };
  }
}

/**
 * Update existing lesson with conflict information
 * Sets has_conflict and related fields based on blocked time conflicts
 */
export async function updateLessonConflictStatus(
  lessonId: string,
  organizationId: string,
  lessonData: {
    start_time: string;
    end_time: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const conflictCheck = await checkLessonSchedulingConflicts(
      organizationId,
      {
        ...lessonData,
        lesson_id: lessonId,
      }
    );

    const hasConflict = 
      conflictCheck.blockedTimeConflicts.hasConflict || 
      conflictCheck.lessonConflicts.length > 0;

    const conflictSeverity = conflictCheck.blockedTimeConflicts.conflictSeverity !== 'none'
      ? conflictCheck.blockedTimeConflicts.conflictSeverity
      : (conflictCheck.lessonConflicts.length > 0 ? 'partial' : null);

    // Get blocked slot IDs
    const conflictingEventIds = conflictCheck.blockedTimeConflicts.blockingSlots.map(
      slot => slot.id
    );

    // Get conflicting lesson IDs
    const conflictingLessonIds = conflictCheck.lessonConflicts.map(
      lesson => lesson.id
    );

    // Update lesson with conflict info
    const { error } = await supabase
      .from('lessons')
      .update({
        has_conflict: hasConflict,
        conflicting_event_ids: conflictingEventIds.length > 0 ? conflictingEventIds : null,
        conflicting_lesson_ids: conflictingLessonIds.length > 0 ? conflictingLessonIds : null,
        conflict_severity: conflictSeverity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lessonId)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Failed to update lesson conflict status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };

  } catch (err: any) {
    console.error('Failed to update lesson conflict status:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Example integration in lesson creation endpoint:
 * 
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   // ... authentication and organization check ...
 *   
 *   const body = await request.json();
 *   const { start_time, end_time, kid_id, title } = body;
 *   
 *   // VALIDATE CONFLICTS BEFORE CREATING
 *   const validation = await validateLessonBeforeSave(
 *     organizationId,
 *     { start_time, end_time, kid_id }
 *   );
 *   
 *   if (!validation.shouldProceed) {
 *     return NextResponse.json(
 *       { 
 *         error: validation.error,
 *         conflicts: validation.conflictDetails,
 *       },
 *       { status: 409 } // 409 Conflict
 *     );
 *   }
 *   
 *   // Create the lesson
 *   const { data: lesson, error } = await supabase
 *     .from('lessons')
 *     .insert({ ... })
 *     .single();
 *   
 *   // Update conflict status
 *   if (lesson) {
 *     await updateLessonConflictStatus(
 *       lesson.id,
 *       organizationId,
 *       { start_time, end_time }
 *     );
 *   }
 *   
 *   return NextResponse.json({ lesson, warnings: validation.warnings });
 * }
 * ```
 */

/**
 * Batch update conflict status for multiple lessons
 * Useful for recurring lessons or bulk operations
 */
export async function batchUpdateLessonConflicts(
  organizationId: string,
  lessonIds: string[]
): Promise<{ 
  updated: number; 
  failed: number; 
  errors: Array<{ lessonId: string; error: string }> 
}> {
  const supabase = await createClient();
  
  // Fetch lessons
  const { data: lessons, error: fetchError } = await supabase
    .from('lessons')
    .select('id, start_time, end_time')
    .eq('organization_id', organizationId)
    .in('id', lessonIds);

  if (fetchError || !lessons) {
    return { updated: 0, failed: lessonIds.length, errors: [] };
  }

  let updated = 0;
  let failed = 0;
  const errors: Array<{ lessonId: string; error: string }> = [];

  for (const lesson of lessons) {
    const result = await updateLessonConflictStatus(
      lesson.id,
      organizationId,
      {
        start_time: lesson.start_time,
        end_time: lesson.end_time,
      }
    );

    if (result.success) {
      updated++;
    } else {
      failed++;
      errors.push({ 
        lessonId: lesson.id, 
        error: result.error || 'Unknown error' 
      });
    }
  }

  return { updated, failed, errors };
}

/**
 * Scan all lessons and update conflict status
 * Run this after auto-block processing to flag affected lessons
 */
export async function scanAndUpdateAllLessonConflicts(
  organizationId: string,
  options?: {
    afterDate?: string; // Only scan lessons after this date
    kidId?: string; // Only scan lessons for specific kid
  }
): Promise<{ 
  scanned: number; 
  updated: number; 
  conflictsFound: number;
  errors: string[] 
}> {
  const supabase = await createClient();

  // Build query
  let query = supabase
    .from('lessons')
    .select('id, start_time, end_time')
    .eq('organization_id', organizationId);

  if (options?.afterDate) {
    query = query.gte('start_time', options.afterDate);
  }

  if (options?.kidId) {
    query = query.eq('kid_id', options.kidId);
  }

  const { data: lessons, error } = await query;

  if (error || !lessons) {
    return { scanned: 0, updated: 0, conflictsFound: 0, errors: [error?.message || 'Failed to fetch lessons'] };
  }

  let updated = 0;
  let conflictsFound = 0;
  const errors: string[] = [];

  for (const lesson of lessons) {
    const result = await updateLessonConflictStatus(
      lesson.id,
      organizationId,
      {
        start_time: lesson.start_time,
        end_time: lesson.end_time,
      }
    );

    if (result.success) {
      updated++;
      
      // Check if this lesson now has conflicts
      const { data: updatedLesson } = await supabase
        .from('lessons')
        .select('has_conflict')
        .eq('id', lesson.id)
        .single();

      if (updatedLesson?.has_conflict) {
        conflictsFound++;
      }
    } else if (result.error) {
      errors.push(result.error);
    }
  }

  return { 
    scanned: lessons.length, 
    updated, 
    conflictsFound,
    errors 
  };
}