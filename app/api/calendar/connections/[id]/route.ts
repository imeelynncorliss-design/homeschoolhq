// app/api/calendar/connections/[id]/route.ts
// Delete/Manage Individual Calendar Connection

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { getGoogleCalendarService } from '@/src/lib/calendar/google-calendar-service';
import { getOutlookCalendarService } from '@/src/lib/calendar/outlook-calendar-service';

/**
 * DELETE /api/calendar/connections/:id
 * Disconnect calendar
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const connectionId = params.id;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Missing connectionId' },
        { status: 400 }
      );
    }

    // Get connection details
    const { data: connection, error: connError } = await supabase
      .from('calendar_connections')
      .select('*')
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

    // Revoke access from provider (best effort - don't fail if this fails)
    try {
      if (connection.provider === 'google') {
        const googleService = getGoogleCalendarService();
        await googleService.revokeAccess(connection.access_token);
      } else if (connection.provider === 'outlook') {
        const outlookService = getOutlookCalendarService();
        await outlookService.revokeAccess(connection.access_token);
      }
    } catch (revokeError) {
      console.error('Failed to revoke provider access (continuing with deletion):', revokeError);
      // Continue with deletion even if revoke fails
    }

    // Delete connection from database (cascades to synced events and logs)
    const { error: deleteError } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('id', connectionId);

    if (deleteError) {
      throw new Error(`Failed to delete connection: ${deleteError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Calendar disconnected successfully',
    });
  } catch (error: any) {
    console.error('Failed to disconnect calendar:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect calendar', details: error.message },
      { status: 500 }
    );
  }
}