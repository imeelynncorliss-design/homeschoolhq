// app/api/calendar/connections/[id]/route.ts
// Delete/Manage Individual Calendar Connection

import { createClient } from '@/src/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { getGoogleCalendarService } from '@/src/lib/calendar/google-calendar-service';
import { getOutlookCalendarService } from '@/src/lib/calendar/outlook-calendar-service';

/**
 * DELETE /api/calendar/connections/:id
 * Disconnect calendar
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(); // ADD THIS LINE
    const params = await context.params; // ADD THIS LINE
    
    let userId: string | null = null;

    // Check if running on server (service role) or client
    if (typeof window === 'undefined') {
      // Server-side: get user from auth
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

    // Delete the connection
    const { error: deleteError } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('id', connectionId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error deleting calendar connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    );
  }
}