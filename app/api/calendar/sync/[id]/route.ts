// app/api/calendar/sync/[id]/route.ts
import { createClient } from '@/src/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCalendarSyncService } from '@/src/lib/calendar/calendar-sync-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 15 compatibility
    const { id } = await params;
    
    const supabase = await createClient();
    
    // Verify user owns this connection
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { data: connection } = await supabase
      .from('calendar_connections')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!connection || connection.user_id !== user.id) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    // Trigger sync
    const syncService = getCalendarSyncService();
    const result = await syncService.syncConnection(id);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Sync failed:', error);
    return NextResponse.json(
      { message: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}