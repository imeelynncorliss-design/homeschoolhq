// app/api/calendar/conflicts/route.ts
// Conflict Management API Routes

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { getOrganizationId } from '@/src/lib/auth-helpers'


/**
 * GET /api/calendar/conflicts
 * Get conflicts for organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user and their organization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const organizationId = await getOrganizationId()
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams;
    const severity = searchParams.get('severity');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Query conflict resolutions table
    const { data: conflicts, error } = await supabase
      .from('calendar_conflict_resolutions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('resolved_at', { ascending: false });

    if (error) {
      console.error('Conflicts query error:', error);
      // Return empty array instead of failing
      return NextResponse.json({
        conflicts: [],
        total: 0,
      });
    }

    return NextResponse.json({
      conflicts: conflicts || [],
      total: conflicts?.length || 0,
    });
  } catch (error: any) {
    console.error('Failed to fetch conflicts:', error);
    // Return empty array for graceful degradation
    return NextResponse.json({
      conflicts: [],
      total: 0,
    });
  }
}

/**
 * POST /api/calendar/conflicts
 * Resolve a conflict
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user and their organization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const organizationId = await getOrganizationId();
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      workEventId,
      resolutionType,
      notes,
      newLessonTime,
      affectedLessonId,
    } = body;

    if (!workEventId || !resolutionType) {
      return NextResponse.json(
        { error: 'Missing required fields: workEventId and resolutionType' },
        { status: 400 }
      );
    }

    // Get work event to verify it exists and belongs to organization
    const { data: workEvent, error: eventError } = await supabase
      .from('synced_work_events')
      .select('organization_id, calendar_connection_id')
      .eq('id', workEventId)
      .single();

    if (eventError || !workEvent) {
      return NextResponse.json(
        { error: 'Work event not found' },
        { status: 404 }
      );
    }

    // Verify organization matches
    if (workEvent.organization_id !== organizationId) {
      return NextResponse.json(
        { error: 'Access denied - event belongs to different organization' },
        { status: 403 }
      );
    }

    // Verify user owns the calendar connection
    const { data: connection, error: connError } = await supabase
      .from('calendar_connections')
      .select('user_id')
      .eq('id', workEvent.calendar_connection_id)
      .single();

    if (connError || !connection || connection.user_id !== userId) {
      return NextResponse.json(
        { error: 'Access denied - you do not own this calendar connection' },
        { status: 403 }
      );
    }

    // Create resolution record
    const { data: resolution, error: resolutionError } = await supabase
      .from('calendar_conflict_resolutions')
      .insert({
        synced_work_event_id: workEventId,
        organization_id: organizationId,
        resolved_by: userId,
        resolution_type: resolutionType,
        resolution_notes: notes,
        affected_lesson_id: affectedLessonId,
        new_lesson_time: newLessonTime,
      })
      .select()
      .single();

    if (resolutionError) {
      throw new Error(`Failed to create resolution: ${resolutionError.message}`);
    }

    // Execute resolution based on type
    if (resolutionType === 'reschedule_lesson' && affectedLessonId && newLessonTime) {
      // Get original lesson to calculate duration
      const { data: lesson } = await supabase
        .from('lessons')
        .select('scheduled_start, scheduled_end')
        .eq('id', affectedLessonId)
        .single();

      if (lesson) {
        const duration = new Date(lesson.scheduled_end).getTime() - 
                        new Date(lesson.scheduled_start).getTime();
        const newEndTime = new Date(new Date(newLessonTime).getTime() + duration).toISOString();

        await supabase
          .from('lessons')
          .update({
            scheduled_start: newLessonTime,
            scheduled_end: newEndTime,
          })
          .eq('id', affectedLessonId);
      }
    } else if (resolutionType === 'cancel_lesson' && affectedLessonId) {
      await supabase
        .from('lessons')
        .update({ status: 'cancelled' })
        .eq('id', affectedLessonId);
    }

    // Update work event to mark conflict as resolved
    await supabase
      .from('synced_work_events')
      .update({ has_conflict: false })
      .eq('id', workEventId);

    return NextResponse.json({
      success: true,
      resolution,
    });
  } catch (error: any) {
    console.error('Failed to resolve conflict:', error);
    return NextResponse.json(
      { error: 'Failed to resolve conflict', details: error.message },
      { status: 500 }
    );
  }
}