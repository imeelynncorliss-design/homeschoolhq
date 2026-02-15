// src/lib/calendar/auto-block-helpers.ts
// Helper functions for auto-blocking work events

import { createClient } from '@/src/lib/supabase/server';

export interface WorkEvent {
  id: string;
  calendar_connection_id: string;
  organization_id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_meeting: boolean;
  status: string;
  auto_blocked: boolean;
}

export interface BlockedTimeSlot {
  organization_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  source_type: 'work_event';
  source_event_id: string;
  title: string;
  description: string | null;
  is_active: boolean;
}

/**
 * Check if a work event should be auto-blocked
 */
export function shouldAutoBlock(event: WorkEvent): boolean {
  return (
    event.is_meeting === true &&
    event.status === 'confirmed' &&
    event.auto_blocked === false
  );
}

/**
 * Check if calendar connection has auto-blocking enabled
 */
export async function isAutoBlockEnabled(
  calendarConnectionId: string
): Promise<boolean> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('calendar_connections')
    .select('auto_block_enabled')
    .eq('id', calendarConnectionId)
    .single();

  if (error || !data) {
    console.error('Failed to check auto_block_enabled:', error);
    return false;
  }

  return data.auto_block_enabled === true;
}

/**
 * Create a blocked time slot from a work event
 */
export async function createBlockFromEvent(
  event: WorkEvent
): Promise<{ success: boolean; error?: string; blockId?: string }> {
  const supabase = await createClient();

  // First check if connection has auto-blocking enabled
  const autoBlockEnabled = await isAutoBlockEnabled(event.calendar_connection_id);
  
  if (!autoBlockEnabled) {
    return { success: false, error: 'Auto-blocking not enabled for this connection' };
  }

  // Check if block already exists for this event
  const { data: existingBlock } = await supabase
    .from('blocked_time_slots')
    .select('id')
    .eq('source_event_id', event.id)
    .eq('source_type', 'work_event')
    .single();

  if (existingBlock) {
    return { success: true, blockId: existingBlock.id };
  }

  // Create the block
  const blockData: BlockedTimeSlot = {
    organization_id: event.organization_id,
    user_id: event.user_id,
    start_time: event.start_time,
    end_time: event.end_time,
    source_type: 'work_event',
    source_event_id: event.id,
    title: `🚫 ${event.title}`,
    description: event.description,
    is_active: true,
  };

  const { data: block, error } = await supabase
    .from('blocked_time_slots')
    .insert(blockData)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create blocked time slot:', error);
    return { success: false, error: error.message };
  }

  // Mark the work event as auto_blocked
  await supabase
    .from('synced_work_events')
    .update({ auto_blocked: true, updated_at: new Date().toISOString() })
    .eq('id', event.id);

  return { success: true, blockId: block.id };
}

/**
 * Update a blocked time slot when the source event changes
 */
export async function updateBlockFromEvent(
  event: WorkEvent
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Find existing block
  const { data: existingBlock } = await supabase
    .from('blocked_time_slots')
    .select('id')
    .eq('source_event_id', event.id)
    .eq('source_type', 'work_event')
    .single();

  if (!existingBlock) {
    // No existing block, create one if should be auto-blocked
    if (shouldAutoBlock(event)) {
      return await createBlockFromEvent(event);
    }
    return { success: true };
  }

  // Event no longer qualifies for blocking (e.g., cancelled or not a meeting)
  if (!shouldAutoBlock(event)) {
    const { error } = await supabase
      .from('blocked_time_slots')
      .delete()
      .eq('id', existingBlock.id);

    if (error) {
      console.error('Failed to delete block:', error);
      return { success: false, error: error.message };
    }

    // Unmark the event as auto_blocked
    await supabase
      .from('synced_work_events')
      .update({ auto_blocked: false, updated_at: new Date().toISOString() })
      .eq('id', event.id);

    return { success: true };
  }

  // Update the block with new event details
  const { error } = await supabase
    .from('blocked_time_slots')
    .update({
      start_time: event.start_time,
      end_time: event.end_time,
      title: `🚫 ${event.title}`,
      description: event.description,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existingBlock.id);

  if (error) {
    console.error('Failed to update block:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Process all pending work events for auto-blocking
 * Returns count of blocks created
 */
export async function processWorkEventsForAutoBlock(
  organizationId: string
): Promise<{ blocksCreated: number; blocksUpdated: number; errors: string[] }> {
  const supabase = await createClient();
  
  // Get all calendar connections with auto_block_enabled
  const { data: connections, error: connError } = await supabase
    .from('calendar_connections')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('auto_block_enabled', true);

  if (connError || !connections || connections.length === 0) {
    return { blocksCreated: 0, blocksUpdated: 0, errors: [] };
  }

  const connectionIds = connections.map(c => c.id);

  // Get all work events that should be auto-blocked but aren't yet
  const { data: events, error: eventsError } = await supabase
    .from('synced_work_events')
    .select('*')
    .in('calendar_connection_id', connectionIds)
    .eq('is_meeting', true)
    .eq('status', 'confirmed')
    .eq('auto_blocked', false)
    .eq('is_deleted', false);

  if (eventsError) {
    console.error('Failed to fetch work events:', eventsError);
    return { blocksCreated: 0, blocksUpdated: 0, errors: [eventsError.message] };
  }

  if (!events || events.length === 0) {
    return { blocksCreated: 0, blocksUpdated: 0, errors: [] };
  }

  let blocksCreated = 0;
  let blocksUpdated = 0;
  const errors: string[] = [];

  for (const event of events) {
    const result = await createBlockFromEvent(event as WorkEvent);
    if (result.success) {
      blocksCreated++;
    } else if (result.error) {
      errors.push(`Event ${event.id}: ${result.error}`);
    }
  }

  return { blocksCreated, blocksUpdated, errors };
}

/**
 * Remove blocks for events that no longer qualify
 */
export async function cleanupStaleBlocks(
  organizationId: string
): Promise<{ blocksRemoved: number; errors: string[] }> {
  const supabase = await createClient();
  
  // Get all work event blocks
  const { data: blocks, error: blocksError } = await supabase
    .from('blocked_time_slots')
    .select(`
      id,
      source_event_id,
      synced_work_events!inner(
        id,
        is_meeting,
        status,
        is_deleted
      )
    `)
    .eq('organization_id', organizationId)
    .eq('source_type', 'work_event');

  if (blocksError || !blocks) {
    return { blocksRemoved: 0, errors: [blocksError?.message || 'Failed to fetch blocks'] };
  }

  let blocksRemoved = 0;
  const errors: string[] = [];

  for (const block of blocks) {
    const event = block.synced_work_events as any;
    
    // Remove block if event is no longer a meeting, not confirmed, or deleted
    if (!event.is_meeting || event.status !== 'confirmed' || event.is_deleted) {
      const { error: deleteError } = await supabase
        .from('blocked_time_slots')
        .delete()
        .eq('id', block.id);

      if (deleteError) {
        errors.push(`Block ${block.id}: ${deleteError.message}`);
      } else {
        blocksRemoved++;
        
        // Unmark the event as auto_blocked
        await supabase
          .from('synced_work_events')
          .update({ auto_blocked: false })
          .eq('id', event.id);
      }
    }
  }

  return { blocksRemoved, errors };
}