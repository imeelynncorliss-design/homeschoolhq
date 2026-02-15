// app/api/calendar/sync/route.ts
// Manual Calendar Sync Trigger - WITH LAZY INITIALIZATION AND AUTO-BLOCKING

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { getCalendarSyncService } from '@/src/lib/calendar/calendar-sync-service';
import { getOrganizationId } from '@/src/lib/auth-helpers';

interface SyncResult {
  eventsAdded?: number;
  eventsUpdated?: number;
  eventsDeleted?: number;
  success?: boolean;
  error?: string;
}

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
    
    // Verify user is authenticated and get their organization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const organizationId = await getOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Organization not found' 
      }, { status: 404 });
    }

    // Verify connection belongs to user's organization
    const { data: connection, error: connError } = await supabase
      .from('calendar_connections')
      .select('id, organization_id')
      .eq('id', connectionId)
      .eq('organization_id', organizationId)
      .single();
    
    if (connError || !connection) {
      return NextResponse.json(
        { success: false, message: 'Connection not found or access denied' },
        { status: 404 }
      );
    }

    // ✅ LAZY INITIALIZATION - Only create sync service when actually needed
    // This way, if Outlook creds are missing, it won't crash the whole API
    console.log('📞 Initializing sync service...');
    const syncService = getCalendarSyncService();
    
    // Sync the specific connection
    try {
      console.log('📞 Calling syncService.syncConnection()...');
      const result: SyncResult = await syncService.syncConnection(connectionId);
     
      console.log('✅ Sync completed:', result);
      
      const totalEvents = (result.eventsAdded || 0) + (result.eventsUpdated || 0);
      
      // ✅ TRIGGER AUTO-BLOCKING AFTER SUCCESSFUL SYNC
      try {
        console.log('🔄 Processing auto-blocking...');
        
        // Process auto-blocking for work events
        // Process auto-blocking
        try {
          console.log('🔄 Processing auto-blocking...');
          const blockResponse = await fetch(`${request.nextUrl.origin}/api/calendar/auto-block/process`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '',
            },
            body: JSON.stringify({}),
          });
          
          const blockData = await blockResponse.json();
          console.log('✅ Auto-blocking response:', blockData);
          
        } catch (autoBlockError: any) {
          console.error('⚠️ Auto-blocking failed:', autoBlockError.message);
          // Don't throw - we still want sync to succeed even if auto-blocking fails
        }
        
        
        // Scan lessons for conflicts
        console.log('🔍 Scanning lessons for conflicts...');
        const scanResponse = await fetch(`${request.nextUrl.origin}/api/calendar/conflicts/scan-lessons`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || '',
          },
          body: JSON.stringify({}),
        });
        
        if (scanResponse.ok) {
          const scanResult = await scanResponse.json();
          console.log('✅ Lesson conflict scan complete:', scanResult.summary);
        } else {
          console.warn('⚠️ Lesson conflict scan failed:', await scanResponse.text());
        }
        
      } catch (postSyncError) {
        // Don't fail the sync if auto-blocking fails - log and continue
        console.error('⚠️ Post-sync processing failed (non-critical):', postSyncError);
      }
      
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
    
    // Get authenticated user and their organization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const organizationId = await getOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
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