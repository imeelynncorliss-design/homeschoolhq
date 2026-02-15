// app/api/calendar/conflicts/available-slots/route.ts
// Find available time slots avoiding blocked times

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { getOrganizationId } from '@/src/lib/auth-helpers';
import { findAvailableTimeSlots } from '@/src/lib/calendar/conflict-detection';

/**
 * GET /api/calendar/conflicts/available-slots
 * Find available time slots in a date range
 * 
 * Query params:
 * - start_date: ISO date string (required)
 * - end_date: ISO date string (required)
 * - duration: Slot duration in minutes (default: 60)
 * - start_hour: Start of day hour 0-23 (default: 8)
 * - end_hour: End of day hour 0-23 (default: 17)
 * - exclude_weekends: true/false (default: true)
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const duration = parseInt(searchParams.get('duration') || '60');
    const startHour = parseInt(searchParams.get('start_hour') || '8');
    const endHour = parseInt(searchParams.get('end_hour') || '17');
    const excludeWeekends = searchParams.get('exclude_weekends') !== 'false';

    // Validate required fields
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: start_date, end_date' },
        { status: 400 }
      );
    }

    // Validate date range
    if (new Date(endDate) <= new Date(startDate)) {
      return NextResponse.json(
        { error: 'end_date must be after start_date' },
        { status: 400 }
      );
    }

    // Build exclude days array
    const excludeDays = excludeWeekends ? [0, 6] : []; // 0=Sunday, 6=Saturday

    // Find available slots
    const availableSlots = await findAvailableTimeSlots(
      organizationId,
      {
        start_date: startDate,
        end_date: endDate,
      },
      duration,
      {
        startHour,
        endHour,
        excludeDays,
      }
    );

    // Group by date for easier consumption
    const slotsByDate: { [date: string]: any[] } = {};
    
    availableSlots.forEach(slot => {
      const date = new Date(slot.start_time).toISOString().split('T')[0];
      if (!slotsByDate[date]) {
        slotsByDate[date] = [];
      }
      slotsByDate[date].push({
        start_time: slot.start_time,
        end_time: slot.end_time,
        start_hour: new Date(slot.start_time).getHours(),
        start_minute: new Date(slot.start_time).getMinutes(),
      });
    });

    return NextResponse.json({
      totalSlots: availableSlots.length,
      slots: availableSlots,
      slotsByDate,
      parameters: {
        start_date: startDate,
        end_date: endDate,
        duration,
        start_hour: startHour,
        end_hour: endHour,
        exclude_weekends: excludeWeekends,
      },
    });

  } catch (error: any) {
    console.error('Failed to find available slots:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}