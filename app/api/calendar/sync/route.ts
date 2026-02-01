// app/api/calendar/sync/route.ts
// Manual Calendar Sync Trigger - WITH LAZY INITIALIZATION

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { getCalendarSyncService } from '@/src/lib/calendar/calendar-sync-service';

// DON'T initialize at module load - causes crash if Outlook creds missing
// const syncService = getCalendarSyncService(); // ❌ BAD

/**
 * POST /api/calendar/sync
 * Manually trigger calendar sync for a specific connection
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    // Get connectionId from request
    const { connectionId } = body;
    
    if (!connectionId) {
      return NextResponse.json(
        { 
          success: false,
          message: 'connectionId is required' 
        },
        { status: 400 }
      );
    }

    console.log('🔄 Manual sync triggered for connection:', connectionId);
    
    // Auth bypass for testing - controlled by environment variable
    const BYPASS_AUTH = process.env.BYPASS_AUTH_FOR_TESTING === 'true';
    
    if (!BYPASS_AUTH) {
      // PRODUCTION: Verify user owns this connection
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
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
          { success: false, message: 'Organization not found' },
          { status: 404 }
        );
      }
      
      // Verify connection belongs to user's organization
      const { data: connection, error: connError } = await supabase
        .from('calendar_connections')
        .select('id, organization_id')
        .eq('id', connectionId)
        .eq('organization_id', profile.organization_id)
        .single();
      
      if (connError || !connection) {
        return NextResponse.json(
          { success: false, message: 'Connection not found or access denied' },
          { status: 404 }
        );
      }
    } else {
      console.log('⚠️ BYPASS_AUTH enabled for testing');
    }

    // ✅ LAZY INITIALIZATION - Only create sync service when actually needed
    // This way, if Outlook creds are missing, it won't crash the whole API
    console.log('📞 Initializing sync service...');
    const syncService = getCalendarSyncService();
    
    // Sync the specific connection
    try {
      console.log('📞 Calling syncService.syncConnection()...');
      const result = await syncService.syncConnection(connectionId);
      
      console.log('✅ Sync completed:', result);
      
      const totalEvents = (result.eventsAdded || 0) + (result.eventsUpdated || 0);
      
      return NextResponse.json({
        success: true,
        message: `Successfully synced calendar`,
        eventsProcessed: totalEvents,
        eventsAdded: result.eventsAdded || 0,
        eventsUpdated: result.eventsUpdated || 0,
        eventsDeleted: result.eventsDeleted || 0,
      });
    } catch (syncError: any) {
      console.error('❌ Sync service error:', syncError);
      
      // Return user-friendly error messages
      let errorMessage = 'Failed to sync calendar';
      
      if (syncError.message?.includes('token')) {
        errorMessage = 'Access token expired. Please reconnect your calendar.';
      } else if (syncError.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (syncError.message?.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again in a few minutes.';
      } else if (syncError.message?.includes('invalid_client_credential') || 
                 syncError.message?.includes('MICROSOFT')) {
        errorMessage = 'Microsoft Outlook is not configured yet. Please use Google Calendar.';
      } else if (syncError.message) {
        errorMessage = syncError.message;
      }
      
      return NextResponse.json(
        { 
          success: false,
          message: errorMessage,
          error: syncError.message 
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Manual sync failed:', error);
    console.error('Stack:', error.stack);
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Internal server error',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calendar/sync
 * Get sync status for organization's calendars
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
          { error: 'Unauthorized' },
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

    // Get recent sync logs
    const { data: syncLogs, error: logsError } = await supabase
      .from('calendar_sync_log')
      .select(`
        *,
        connection:calendar_connections(
          provider,
          provider_account_email,
          calendar_name
        )
      `)
      .eq('organization_id', organizationId)
      .order('started_at', { ascending: false })
      .limit(20);

    if (logsError) {
      throw new Error(`Failed to fetch sync logs: ${logsError.message}`);
    }

    return NextResponse.json({
      syncLogs: syncLogs || [],
      total: syncLogs?.length || 0,
    });
  } catch (error: any) {
    console.error('Failed to get sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status', details: error.message },
      { status: 500 }
    );
  }
}