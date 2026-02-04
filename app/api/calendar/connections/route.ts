// app/api/calendar/connections/route.ts
// Calendar Connections Management

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { getOrganizationId } from '@/src/lib/auth-helpers'

/**
 * GET /api/calendar/connections
 * Get all calendar connections for organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user and their organization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const organizationId = await getOrganizationId()
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
      
    // Fetch calendar connections
    const { data: connections, error } = await supabase
      .from('calendar_connections')
      .select(`
        id,
        provider,
        provider_account_email,
        calendar_name,
        sync_enabled,
        auto_block_enabled,
        conflict_notification_enabled,
        push_lessons_to_calendar,
        last_sync_at,
        last_sync_status,
        created_at
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch connections:', error);
      return NextResponse.json(
        { error: 'Failed to fetch connections', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      connections: connections || [],
      total: connections?.length || 0,
    });
  } catch (error: any) {
    console.error('Failed to get calendar connections:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/calendar/connections
 * Update connection settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    const body = await request.json();
    const {
      connectionId,
      sync_enabled,
      auto_block_enabled,
      conflict_notification_enabled,
      push_lessons_to_calendar,
    } = body;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Missing connectionId' },
        { status: 400 }
      );
    }

    // Get connection to verify ownership
    const { data: connection, error: connError } = await supabase
      .from('calendar_connections')
      .select('user_id, organization_id')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (connection.user_id !== userId) {
      return NextResponse.json(
        { error: 'Access denied - not the owner of this connection' },
        { status: 403 }
      );
    }

    // Build update object
    const updates: any = {};
    if (sync_enabled !== undefined) updates.sync_enabled = sync_enabled;
    if (auto_block_enabled !== undefined) updates.auto_block_enabled = auto_block_enabled;
    if (conflict_notification_enabled !== undefined) updates.conflict_notification_enabled = conflict_notification_enabled;
    if (push_lessons_to_calendar !== undefined) updates.push_lessons_to_calendar = push_lessons_to_calendar;

    // Update connection
    const { data: updated, error: updateError } = await supabase
      .from('calendar_connections')
      .update(updates)
      .eq('id', connectionId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update connection: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      connection: updated,
    });
  } catch (error: any) {
    console.error('Failed to update connection:', error);
    return NextResponse.json(
      { error: 'Failed to update connection', details: error.message },
      { status: 500 }
    );
  }
}