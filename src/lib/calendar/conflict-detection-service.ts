// src/lib/calendar/conflict-detection.service.ts
// Conflict Detection between Work Calendar and HomeschoolHQ Lessons

import { createClient } from '@/src/lib/supabase/server';
import type {
  SyncedWorkEvent,
  CalendarConflict,
  ConflictDetectionResult,
  ConflictType,
  ConflictSeverity,
  ResolutionType,
} from '@/src/types/calendar';

export class ConflictDetectionService {
  /**
   * Detect conflicts for a single work event
   */
  async detectConflictsForEvent(
    organizationId: string,
    workEvent: SyncedWorkEvent
  ): Promise<ConflictDetectionResult> {
    const supabase = await createClient();

    try {
      // Call the database function to detect overlapping lessons
      const { data: conflicts, error } = await supabase.rpc(
        'detect_calendar_conflicts',
        {
          p_organization_id: organizationId,
          p_start_time: workEvent.start_time,
          p_end_time: workEvent.end_time,
        }
      );

      if (error) {
        throw new Error(`Failed to detect conflicts: ${error.message}`);
      }

      if (!conflicts || conflicts.length === 0) {
        return {
          hasConflict: false,
          conflicts: [],
          severity: 'none',
        };
      }

      // Transform database results into CalendarConflict objects
      const calendarConflicts: CalendarConflict[] = await Promise.all(
        conflicts.map(async (conflict: any) => {
          // Get kid name
          const { data: kid } = await supabase
            .from('kids')
            .select('first_name, last_name')
            .eq('id', conflict.lesson_kid_id)
            .single();

          const overlapDuration = this.calculateOverlapMinutes(
            new Date(workEvent.start_time),
            new Date(workEvent.end_time),
            new Date(conflict.lesson_start),
            new Date(conflict.lesson_end)
          );

          const suggestedResolutions = this.generateResolutionSuggestions(
            conflict.conflict_type,
            overlapDuration,
            workEvent.is_meeting
          );

          return {
            id: `${workEvent.id}-${conflict.lesson_id}`,
            workEvent,
            conflictingLesson: {
              id: conflict.lesson_id,
              title: conflict.lesson_title,
              scheduled_start: conflict.lesson_start,
              scheduled_end: conflict.lesson_end,
              kid_id: conflict.lesson_kid_id,
              kid_name: kid
                ? `${kid.first_name} ${kid.last_name}`
                : 'Unknown',
            },
            conflictType: conflict.conflict_type,
            overlapDuration,
            suggestedResolutions,
          };
        })
      );

      // Determine overall severity
      const severity = this.calculateSeverity(calendarConflicts);

      return {
        hasConflict: true,
        conflicts: calendarConflicts,
        severity,
      };
    } catch (error: any) {
      console.error('Error detecting conflicts:', error);
      throw new Error(`Conflict detection failed: ${error.message}`);
    }
  }

  /**
   * Batch detect conflicts for multiple work events
   */
  async detectConflictsForEvents(
    organizationId: string,
    workEvents: SyncedWorkEvent[]
  ): Promise<Map<string, ConflictDetectionResult>> {
    const results = new Map<string, ConflictDetectionResult>();

    // Process in parallel but limit concurrency
    const batchSize = 10;
    for (let i = 0; i < workEvents.length; i += batchSize) {
      const batch = workEvents.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (event) => {
          const result = await this.detectConflictsForEvent(
            organizationId,
            event
          );
          return { eventId: event.id, result };
        })
      );

      batchResults.forEach(({ eventId, result }) => {
        results.set(eventId, result);
      });
    }

    return results;
  }

  /**
   * Get all unresolved conflicts for an organization
   */
  async getUnresolvedConflicts(
    organizationId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      severity?: ConflictSeverity;
    } = {}
  ): Promise<CalendarConflict[]> {
    const supabase = await createClient();

    try {
      let query = supabase
        .from('synced_work_events')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('has_conflict', true)
        .eq('is_deleted', false)
        .order('start_time', { ascending: true });

      if (options.startDate) {
        query = query.gte('start_time', options.startDate.toISOString());
      }

      if (options.endDate) {
        query = query.lte('end_time', options.endDate.toISOString());
      }

      if (options.severity && options.severity !== 'none') {
        query = query.eq('conflict_severity', options.severity);
      }

      const { data: events, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch conflicts: ${error.message}`);
      }

      // Get conflict resolutions to filter out resolved conflicts
      const { data: resolutions } = await supabase
        .from('calendar_conflict_resolutions')
        .select('synced_work_event_id')
        .eq('organization_id', organizationId);

      const resolvedEventIds = new Set(
        resolutions?.map((r) => r.synced_work_event_id) || []
      );

      // Filter out resolved events and expand to individual conflicts
      const unresolvedEvents = events?.filter(
        (event) => !resolvedEventIds.has(event.id)
      ) || [];

      // Transform to CalendarConflict objects
      const conflicts: CalendarConflict[] = [];
      for (const event of unresolvedEvents) {
        const result = await this.detectConflictsForEvent(
          organizationId,
          event as SyncedWorkEvent
        );
        conflicts.push(...result.conflicts);
      }

      return conflicts;
    } catch (error: any) {
      console.error('Error fetching unresolved conflicts:', error);
      throw new Error(`Failed to fetch unresolved conflicts: ${error.message}`);
    }
  }

  /**
   * Calculate overlap duration in minutes
   */
  private calculateOverlapMinutes(
    workStart: Date,
    workEnd: Date,
    lessonStart: Date,
    lessonEnd: Date
  ): number {
    const overlapStart = new Date(
      Math.max(workStart.getTime(), lessonStart.getTime())
    );
    const overlapEnd = new Date(
      Math.min(workEnd.getTime(), lessonEnd.getTime())
    );

    if (overlapEnd <= overlapStart) {
      return 0;
    }

    return Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 60000);
  }

  /**
   * Calculate overall conflict severity
   */
  private calculateSeverity(conflicts: CalendarConflict[]): ConflictSeverity {
    if (conflicts.length === 0) return 'none';

    // Critical if:
    // - 3+ conflicts
    // - Any full overlap conflict
    // - Any conflict with a meeting that overlaps 80%+ of lesson
    const hasCriticalCondition = 
      conflicts.length >= 3 ||
      conflicts.some((c) => c.conflictType === 'full_overlap') ||
      conflicts.some(
        (c) =>
          c.workEvent.is_meeting &&
          c.overlapDuration >=
            this.calculateLessonDuration(c.conflictingLesson!) * 0.8
      );

    if (hasCriticalCondition) return 'critical';

    // Warning for any other conflicts
    return 'warning';
  }

  /**
   * Calculate lesson duration in minutes
   */
  private calculateLessonDuration(lesson: {
    scheduled_start: string;
    scheduled_end: string;
  }): number {
    const start = new Date(lesson.scheduled_start);
    const end = new Date(lesson.scheduled_end);
    return Math.round((end.getTime() - start.getTime()) / 60000);
  }

  /**
   * Generate suggested resolutions based on conflict characteristics
   */
  private generateResolutionSuggestions(
    conflictType: ConflictType,
    overlapDuration: number,
    isWorkMeeting: boolean
  ): ResolutionType[] {
    const suggestions: ResolutionType[] = [];

    if (conflictType === 'full_overlap') {
      // Lesson completely overlaps with work event
      if (isWorkMeeting) {
        suggestions.push('reschedule_lesson', 'cancel_lesson');
      } else {
        suggestions.push('reschedule_lesson', 'reschedule_work', 'mark_flexible');
      }
    } else if (conflictType === 'work_within_lesson') {
      // Work event is entirely within lesson time
      if (isWorkMeeting) {
        suggestions.push('reschedule_lesson', 'mark_flexible');
      } else {
        suggestions.push('reschedule_work', 'mark_flexible', 'ignore_conflict');
      }
    } else {
      // Partial overlap
      if (overlapDuration < 30) {
        // Minor overlap (<30 min)
        suggestions.push('ignore_conflict', 'mark_flexible', 'reschedule_lesson');
      } else if (isWorkMeeting) {
        suggestions.push('reschedule_lesson', 'mark_flexible');
      } else {
        suggestions.push('reschedule_work', 'reschedule_lesson', 'mark_flexible');
      }
    }

    return suggestions;
  }

  /**
   * Get conflict statistics for dashboard
   */
  async getConflictStatistics(organizationId: string): Promise<{
    total: number;
    critical: number;
    warning: number;
    resolved: number;
    unresolved: number;
    upcomingWeek: number;
  }> {
    const supabase = await createClient();

    try {
      // Get all conflicts
      const { data: allConflicts, error: conflictsError } = await supabase
        .from('synced_work_events')
        .select('id, conflict_severity, start_time')
        .eq('organization_id', organizationId)
        .eq('has_conflict', true)
        .eq('is_deleted', false);

      if (conflictsError) throw conflictsError;

      // Get resolved conflicts
      const { data: resolutions, error: resolutionsError } = await supabase
        .from('calendar_conflict_resolutions')
        .select('synced_work_event_id')
        .eq('organization_id', organizationId);

      if (resolutionsError) throw resolutionsError;

      const resolvedIds = new Set(
        resolutions?.map((r) => r.synced_work_event_id) || []
      );

      const total = allConflicts?.length || 0;
      const resolved = resolutions?.length || 0;
      const unresolved = total - resolved;

      const critical =
        allConflicts?.filter((c) => c.conflict_severity === 'critical')
          .length || 0;
      const warning =
        allConflicts?.filter((c) => c.conflict_severity === 'warning')
          .length || 0;

      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const upcomingWeek =
        allConflicts?.filter(
          (c) =>
            !resolvedIds.has(c.id) &&
            new Date(c.start_time) <= weekFromNow &&
            new Date(c.start_time) >= new Date()
        ).length || 0;

      return {
        total,
        critical,
        warning,
        resolved,
        unresolved,
        upcomingWeek,
      };
    } catch (error: any) {
      console.error('Error getting conflict statistics:', error);
      throw new Error(`Failed to get conflict statistics: ${error.message}`);
    }
  }
}

// Singleton instance
let conflictDetectionService: ConflictDetectionService;

export function getConflictDetectionService(): ConflictDetectionService {
  if (!conflictDetectionService) {
    conflictDetectionService = new ConflictDetectionService();
  }
  return conflictDetectionService;
}