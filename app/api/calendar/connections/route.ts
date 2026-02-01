// app/api/calendar/connections/route.ts
// Calendar Connections Management

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';

/**
 * GET /api/calendar/connections
 * Get all calendar connections for organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Auth bypass for testing - controlled by environment variable
    const BYPASS_AUTH = process.env.BYPASS_AUTH_FOR_TESTING === 'true';
    let organizationId: string;
    
    if (BYPASS_AUTH) {
      // TESTING: Use query param or default test org
      organizationId = request.nextUrl.searchParams.get('organizationId') || 
                      process.env.TEST_ORG_ID || 
                      'd52497c0-42a9-49b7-ba3b-849bffa27fc4';
      console.log('⚠️ BYPASS_AUTH enabled - using test organization');
    } else {
      // PRODUCTION: Get from authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized - Please log in' },
          { status: 401 }
        );
      }
      
      // Get user's organization
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      
      if (profileError || !profile?.organization_id) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }
      
      organizationId = profile.organization_id;
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
    
    // Auth bypass for testing - controlled by environment variable
    const BYPASS_AUTH = process.env.BYPASS_AUTH_FOR_TESTING === 'true';
    let userId: string;
    
    if (BYPASS_AUTH) {
      // TESTING: Use test user
      userId = process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000001';
      console.log('⚠️ BYPASS_AUTH enabled - using test user');
    } else {
      // PRODUCTION: Real authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      userId = user.id;
    }

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

    // Verify ownership (skip in test mode)
    if (!BYPASS_AUTH && connection.user_id !== userId) {
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