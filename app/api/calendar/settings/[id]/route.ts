// app/api/calendar/settings/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';

/**
 * PATCH /api/calendar/settings/[id]
 * Update calendar connection settings
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate allowed fields
    const allowedFields = [
      'sync_enabled',
      'auto_block_enabled',
      'conflict_notification_enabled',
      'push_lessons_to_calendar'
    ];

    const updates: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key) && typeof value === 'boolean') {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Update settings
    const { data, error } = await supabase
      .from('calendar_connections')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update calendar settings:', error);
      return NextResponse.json(
        { error: 'Failed to update settings', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Calendar connection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      connection: data
    });

  } catch (error: any) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}