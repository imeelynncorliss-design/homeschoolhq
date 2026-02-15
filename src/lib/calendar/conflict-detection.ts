// src/lib/calendar/conflict-detection.ts
// Conflict detection logic for blocked time slots

import { createClient } from '@/src/lib/supabase/server';

export interface TimeRange {
  start_time: string;
  end_time: string;
}

export interface ConflictDetails {
  hasConflict: boolean;
  blockingSlots: BlockingSlot[];
  conflictSeverity: 'none' | 'partial' | 'full';
  conflictMessage?: string;
}

export interface BlockingSlot {
  id: string;
  start_time: string;
  end_time: string;
  title: string;
  source_type: string;
  description?: string;
  overlap_minutes: number;
  overlap_percentage: number;
}

/**
 * Check if two time ranges overlap
 */
export function hasTimeOverlap(
  range1: TimeRange,
  range2: TimeRange
): boolean {
  const start1 = new Date(range1.start_time).getTime();
  const end1 = new Date(range1.end_time).getTime();
  const start2 = new Date(range2.start_time).getTime();
  const end2 = new Date(range2.end_time).getTime();

  return start1 < end2 && end1 > start2;
}

/**
 * Calculate overlap duration in minutes
 */
export function calculateOverlapMinutes(
  range1: TimeRange,
  range2: TimeRange
): number {
  if (!hasTimeOverlap(range1, range2)) {
    return 0;
  }

  const start1 = new Date(range1.start_time).getTime();
  const end1 = new Date(range1.end_time).getTime();
  const start2 = new Date(range2.start_time).getTime();
  const end2 = new Date(range2.end_time).getTime();

  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);

  return (overlapEnd - overlapStart) / (1000 * 60);
}

/**
 * Calculate what percentage of range1 is overlapped by range2
 */
export function calculateOverlapPercentage(
  range1: TimeRange,
  range2: TimeRange
): number {
  const overlapMinutes = calculateOverlapMinutes(range1, range2);
  if (overlapMinutes === 0) return 0;

  const range1Duration = 
    (new Date(range1.end_time).getTime() - new Date(range1.start_time).getTime()) / (1000 * 60);

  return Math.round((overlapMinutes / range1Duration) * 100);
}

/**
 * Determine conflict severity based on overlap
 */
export function determineConflictSeverity(
  overlapPercentage: number
): 'none' | 'partial' | 'full' {
  if (overlapPercentage === 0) return 'none';
  if (overlapPercentage >= 90) return 'full';
  return 'partial';
}

/**
 * Check for conflicts with blocked time slots
 */
export async function checkBlockedTimeConflicts(
  organizationId: string,
  timeRange: TimeRange,
  excludeBlockId?: string
): Promise<ConflictDetails> {
  const supabase = await createClient();

  // Query for active blocks that overlap with the time range
  let query = supabase
    .from('blocked_time_slots')
    .select('id, start_time, end_time, title, source_type, description')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .lte('start_time', timeRange.end_time)
    .gte('end_time', timeRange.start_time);

  // Exclude a specific block if provided (for updates)
  if (excludeBlockId) {
    query = query.neq('id', excludeBlockId);
  }

  const { data: blocks, error } = await query;

  if (error) {
    console.error('Failed to check blocked time conflicts:', error);
    return {
      hasConflict: false,
      blockingSlots: [],
      conflictSeverity: 'none',
    };
  }

  if (!blocks || blocks.length === 0) {
    return {
      hasConflict: false,
      blockingSlots: [],
      conflictSeverity: 'none',
    };
  }

  // Calculate overlap details for each blocking slot
  const blockingSlots: BlockingSlot[] = blocks.map(block => {
    const overlapMinutes = calculateOverlapMinutes(timeRange, {
      start_time: block.start_time,
      end_time: block.end_time,
    });
    const overlapPercentage = calculateOverlapPercentage(timeRange, {
      start_time: block.start_time,
      end_time: block.end_time,
    });

    return {
      id: block.id,
      start_time: block.start_time,
      end_time: block.end_time,
      title: block.title,
      source_type: block.source_type,
      description: block.description || undefined,
      overlap_minutes: overlapMinutes,
      overlap_percentage: overlapPercentage,
    };
  });

  // Determine overall conflict severity (use worst case)
  const maxOverlapPercentage = Math.max(...blockingSlots.map(b => b.overlap_percentage));
  const conflictSeverity = determineConflictSeverity(maxOverlapPercentage);

  // Generate conflict message
  const conflictMessage = generateConflictMessage(blockingSlots, conflictSeverity);

  return {
    hasConflict: true,
    blockingSlots,
    conflictSeverity,
    conflictMessage,
  };
}

/**
 * Generate human-readable conflict message
 */
function generateConflictMessage(
  blockingSlots: BlockingSlot[],
  severity: 'none' | 'partial' | 'full'
): string {
  if (blockingSlots.length === 0) return '';

  const count = blockingSlots.length;
  const firstBlock = blockingSlots[0];

  if (count === 1) {
    if (severity === 'full') {
      return `This time is completely blocked by: ${firstBlock.title}`;
    } else {
      return `This time partially conflicts with: ${firstBlock.title} (${firstBlock.overlap_percentage}% overlap)`;
    }
  }

  if (severity === 'full') {
    return `This time is completely blocked by ${count} events`;
  } else {
    return `This time conflicts with ${count} blocked time slots`;
  }
}

/**
 * Check for conflicts when creating or updating a lesson
 * Returns detailed conflict information including blocked slots and existing lessons
 */
export async function checkLessonSchedulingConflicts(
  organizationId: string,
  lessonData: {
    start_time: string;
    end_time: string;
    kid_id?: string;
    lesson_id?: string; // For updates, exclude this lesson from conflict check
  }
): Promise<{
  hasConflict: boolean;
  blockedTimeConflicts: ConflictDetails;
  lessonConflicts: any[]; // Existing lessons that conflict
  canSchedule: boolean;
  warnings: string[];
}> {
  const supabase = await createClient();

  // Check blocked time slots
  const blockedTimeConflicts = await checkBlockedTimeConflicts(
    organizationId,
    {
      start_time: lessonData.start_time,
      end_time: lessonData.end_time,
    }
  );

  // Check for conflicts with existing lessons
  let lessonQuery = supabase
    .from('lessons')
    .select('id, title, start_time, end_time, kid_id')
    .eq('organization_id', organizationId)
    .lte('start_time', lessonData.end_time)
    .gte('end_time', lessonData.start_time);

  // If updating, exclude the current lesson
  if (lessonData.lesson_id) {
    lessonQuery = lessonQuery.neq('id', lessonData.lesson_id);
  }

  // If specific kid, check their lessons
  if (lessonData.kid_id) {
    lessonQuery = lessonQuery.eq('kid_id', lessonData.kid_id);
  }

  const { data: conflictingLessons } = await lessonQuery;

  const hasLessonConflicts = (conflictingLessons?.length || 0) > 0;
  const hasBlockedTimeConflicts = blockedTimeConflicts.hasConflict;

  // Determine if scheduling is allowed
  // CRITICAL: Full blocked time conflicts should prevent scheduling
  const canSchedule = 
    blockedTimeConflicts.conflictSeverity !== 'full' && 
    !hasLessonConflicts;

  // Generate warnings
  const warnings: string[] = [];

  if (blockedTimeConflicts.conflictSeverity === 'full') {
    warnings.push('Cannot schedule - time is completely blocked by work events');
  } else if (blockedTimeConflicts.conflictSeverity === 'partial') {
    warnings.push(blockedTimeConflicts.conflictMessage || 'Partial conflict with blocked time');
  }

  if (hasLessonConflicts) {
    warnings.push(`Conflicts with ${conflictingLessons?.length} existing lesson(s)`);
  }

  return {
    hasConflict: hasBlockedTimeConflicts || hasLessonConflicts,
    blockedTimeConflicts,
    lessonConflicts: conflictingLessons || [],
    canSchedule,
    warnings,
  };
}

/**
 * Batch check conflicts for multiple lessons (useful for recurring lessons)
 */
export async function checkBatchLessonConflicts(
  organizationId: string,
  lessons: Array<{
    start_time: string;
    end_time: string;
    kid_id?: string;
  }>
): Promise<Array<{
  lessonIndex: number;
  hasConflict: boolean;
  conflictDetails: ConflictDetails;
}>> {
  const results = await Promise.all(
    lessons.map(async (lesson, index) => {
      const conflicts = await checkBlockedTimeConflicts(
        organizationId,
        {
          start_time: lesson.start_time,
          end_time: lesson.end_time,
        }
      );

      return {
        lessonIndex: index,
        hasConflict: conflicts.hasConflict,
        conflictDetails: conflicts,
      };
    })
  );

  return results;
}

/**
 * Find available time slots in a date range (avoiding blocked times)
 */
export async function findAvailableTimeSlots(
  organizationId: string,
  dateRange: {
    start_date: string;
    end_date: string;
  },
  slotDuration: number, // in minutes
  options?: {
    startHour?: number; // 0-23
    endHour?: number; // 0-23
    excludeDays?: number[]; // 0=Sunday, 6=Saturday
  }
): Promise<TimeRange[]> {
  const supabase = await createClient();

  // Get all blocked slots in the date range
  const { data: blocks } = await supabase
    .from('blocked_time_slots')
    .select('start_time, end_time')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .gte('end_time', dateRange.start_date)
    .lte('start_time', dateRange.end_date);

  const availableSlots: TimeRange[] = [];
  const startDate = new Date(dateRange.start_date);
  const endDate = new Date(dateRange.end_date);

  const startHour = options?.startHour ?? 8; // Default 8am
  const endHour = options?.endHour ?? 17; // Default 5pm
  const excludeDays = options?.excludeDays ?? [0, 6]; // Default exclude weekends

  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();

    // Skip excluded days
    if (!excludeDays.includes(dayOfWeek)) {
      // Check each hour of the day
      for (let hour = startHour; hour < endHour; hour++) {
        const slotStart = new Date(currentDate);
        slotStart.setHours(hour, 0, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotDuration);

        const timeRange: TimeRange = {
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
        };

        // Check if this slot conflicts with any blocks
        const hasConflict = blocks?.some(block =>
          hasTimeOverlap(timeRange, {
            start_time: block.start_time,
            end_time: block.end_time,
          })
        );

        if (!hasConflict) {
          availableSlots.push(timeRange);
        }
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return availableSlots;
}