// app/api/calendar/conflicts/scan-lessons/route.ts
// Scan existing lessons and update conflict status

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { getOrganizationId } from '@/src/lib/auth-helpers';
import { scanAndUpdateAllLessonConflicts } from '@/src/lib/calendar/lesson-conflict-integration';

/**
 * POST /api/calendar/conflicts/scan-lessons
 * Scan all lessons and update their conflict status
 * 
 * This should be called:
 * 1. After auto-blocking work events
 * 2. When user manually creates blocked time slots
 * 3. Periodically to keep lesson conflict status in sync
 * 
 * Request body (optional):
 * {
 *   after_date?: string (ISO) - Only scan lessons after this date
 *   kid_id?: string - Only scan lessons for specific kid
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

    // Parse optional filters
    const body = await request.json().catch(() => ({}));
    const { after_date, kid_id } = body;

    console.log('Scanning lessons for conflicts...');

    // Scan and update lessons
    const results = await scanAndUpdateAllLessonConflicts(
      organizationId,
      {
        afterDate: after_date,
        kidId: kid_id,
      }
    );

    if (results.errors.length > 0) {
      console.error('Lesson scan completed with errors:', results.errors);
    }

    return NextResponse.json({
      success: true,
      summary: {
        scanned: results.scanned,
        updated: results.updated,
        conflictsFound: results.conflictsFound,
        errors: results.errors.length,
      },
      details: {
        scannedLessons: results.scanned,
        updatedLessons: results.updated,
        lessonsWithConflicts: results.conflictsFound,
        errors: results.errors,
      },
    });

  } catch (error: any) {
    console.error('Failed to scan lessons:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calendar/conflicts/scan-lessons
 * Get summary of lessons with conflicts
 */
export async function GET(request: NextRequest) {
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

    // Get count of lessons with conflicts
    const { count: totalConflicts } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('has_conflict', true);

    // Get count by severity
    const { data: fullConflicts } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('has_conflict', true)
      .eq('conflict_severity', 'full');

    const { data: partialConflicts } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('has_conflict', true)
      .eq('conflict_severity', 'partial');

    // Get lessons with conflicts (recent)
    const { data: recentConflicts } = await supabase
      .from('lessons')
      .select(`
        id,
        title,
        start_time,
        end_time,
        has_conflict,
        conflict_severity,
        conflicting_event_ids,
        conflicting_lesson_ids,
        kids!inner(first_name, last_name)
      `)
      .eq('organization_id', organizationId)
      .eq('has_conflict', true)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(10);

    return NextResponse.json({
      summary: {
        totalConflicts: totalConflicts || 0,
        fullConflicts: fullConflicts?.length || 0,
        partialConflicts: partialConflicts?.length || 0,
      },
      recentConflicts: recentConflicts || [],
    });

  } catch (error: any) {
    console.error('Failed to get conflict summary:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}