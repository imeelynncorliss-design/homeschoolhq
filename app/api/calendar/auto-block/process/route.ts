// app/api/calendar/auto-block/process/route.ts
// Process work events for auto-blocking

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { getOrganizationId } from '@/src/lib/auth-helpers';
import {
  processWorkEventsForAutoBlock,
  cleanupStaleBlocks,
} from '@/src/lib/calendar/auto-block-helpers';

/**
 * POST /api/calendar/auto-block/process
 * Process pending work events and create blocked time slots
 * 
 * This should be called:
 * 1. After calendar sync completes
 * 2. When user toggles auto_block_enabled on a connection
 * 3. Manually via UI to refresh blocks
 */
export async function POST(request: NextRequest) {
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

    // Optional: Process specific connection only
    const body = await request.json().catch(() => ({}));
    const { connectionId } = body;

    // Process work events for auto-blocking
    console.log('Processing work events for auto-blocking...');
    const processResults = await processWorkEventsForAutoBlock(organizationId);

    // Cleanup stale blocks (events that changed)
    console.log('Cleaning up stale blocks...');
    const cleanupResults = await cleanupStaleBlocks(organizationId);

    const allErrors = [
      ...processResults.errors,
      ...cleanupResults.errors,
    ];

    if (allErrors.length > 0) {
      console.error('Auto-block processing completed with errors:', allErrors);
    }

    return NextResponse.json({
      success: true,
      summary: {
        blocksCreated: processResults.blocksCreated,
        blocksRemoved: cleanupResults.blocksRemoved,
        errors: allErrors.length,
      },
      details: {
        created: processResults.blocksCreated,
        removed: cleanupResults.blocksRemoved,
        errors: allErrors,
      },
    });

  } catch (error: any) {
    console.error('Failed to process auto-blocking:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calendar/auto-block/process
 * Get status of blocked time slots
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

    // Get summary of blocks
    const { data: blocks, error } = await supabase
      .from('blocked_time_slots')
      .select('id, source_type, is_active, start_time, end_time')
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Failed to fetch blocks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch blocks', details: error.message },
        { status: 500 }
      );
    }

    const activeBlocks = blocks?.filter(b => b.is_active) || [];
    const workEventBlocks = activeBlocks.filter(b => b.source_type === 'work_event');

    // Get count of work events that should be blocked but aren't
    const { data: connections } = await supabase
      .from('calendar_connections')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('auto_block_enabled', true);

    const connectionIds = connections?.map(c => c.id) || [];

    const { count: pendingCount } = await supabase
      .from('synced_work_events')
      .select('id', { count: 'exact', head: true })
      .in('calendar_connection_id', connectionIds)
      .eq('is_meeting', true)
      .eq('status', 'confirmed')
      .eq('auto_blocked', false)
      .eq('is_deleted', false);

    return NextResponse.json({
      summary: {
        totalBlocks: blocks?.length || 0,
        activeBlocks: activeBlocks.length,
        workEventBlocks: workEventBlocks.length,
        pendingEvents: pendingCount || 0,
      },
      blocks: blocks || [],
    });

  } catch (error: any) {
    console.error('Failed to get auto-block status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}