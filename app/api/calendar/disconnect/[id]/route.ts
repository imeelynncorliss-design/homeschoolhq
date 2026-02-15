// app/api/calendar/disconnect/[id]/route.ts
import { createClient } from '@/src/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
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
      .select('user_id, organization_id')
      .eq('id', id)
      .single();

    if (!connection || connection.user_id !== user.id) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    // Delete synced events first (cascade)
    await supabase
      .from('synced_work_events')
      .delete()
      .eq('calendar_connection_id', id);

    // Delete connection
    const { error } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Disconnect failed:', error);
    return NextResponse.json(
      { message: error.message || 'Disconnect failed' },
      { status: 500 }
    );
  }
}