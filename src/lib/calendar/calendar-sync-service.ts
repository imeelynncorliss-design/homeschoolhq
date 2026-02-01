// src/lib/calendar/calendar-sync.service.ts
// Calendar Sync Orchestration Service

import { createClient } from '@/src/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getGoogleCalendarService } from './google-calendar-service';
import { getOutlookCalendarService } from './outlook-calendar-service';
import { getConflictDetectionService } from './conflict-detection-service';
import type {
  CalendarConnection,
  SyncedWorkEvent,
  CalendarProvider,
  SyncResult,
  SyncError,
  ExternalCalendarEvent,
} from '@/src/types/calendar';

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for sync operations');
  }
  
  return createServiceClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
export class CalendarSyncService {
  private googleService?: ReturnType<typeof getGoogleCalendarService>;
  private outlookService?: ReturnType<typeof getOutlookCalendarService>;
  private conflictService?: ReturnType<typeof getConflictDetectionService>;

  // ✅ Add these lazy getters
  private getGoogleService() {
    if (!this.googleService) {
      this.googleService = getGoogleCalendarService();
    }
    return this.googleService;
  }

  private getOutlookService() {
    if (!this.outlookService) {
      this.outlookService = getOutlookCalendarService();
    }
    return this.outlookService;
  }

  private getConflictService() {
    if (!this.conflictService) {
      this.conflictService = getConflictDetectionService();
    }
    return this.conflictService;
  }
  /**
   * Sync a single calendar connection
   */
  async syncConnection(connectionId: string): Promise<SyncResult> {
    console.log('🎯 Starting sync for connection ID:', connectionId);
    const supabase = getServiceClient()

    try {
      // Get connection details
      const { data: connection, error: connError } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (connError || !connection) {
        throw new Error('Calendar connection not found');
      }

      if (!connection.sync_enabled) {
        throw new Error('Sync is disabled for this connection');
      }

      // Create sync log entry
      const { data: syncLog, error: logError } = await supabase
        .from('calendar_sync_log')
        .insert({
          calendar_connection_id: connectionId,
          sync_status: 'started',
        })
        .select()
        .single();

      if (logError || !syncLog) {
        throw new Error('Failed to create sync log');
      }

      try {
        // Refresh token if needed
        const validToken = await this.ensureValidToken(connection);

        // Fetch events from provider
        const events = await this.fetchEventsFromProvider(
          connection,
          validToken
        );

        // Sync events to database
        const syncStats = await this.syncEventsToDatabase(
          connection,
          events
        );

        // Detect conflicts
        const conflictCount = await this.detectAndUpdateConflicts(
          connection.organization_id,
          syncStats.eventIds
        );

        // Update sync log
        await supabase
          .from('calendar_sync_log')
          .update({
            sync_status: 'completed',
            sync_completed_at: new Date().toISOString(),
            events_fetched: events.length,
            events_created: syncStats.created,
            events_updated: syncStats.updated,
            events_deleted: syncStats.deleted,
            conflicts_detected: conflictCount,
          })
          .eq('id', syncLog.id);

       // Update connection last sync
      console.log('🔄 About to update connection status to completed for:', connectionId);
      console.log('📊 Sync stats:', { 
        eventsFetched: events.length, 
        created: syncStats.created, 
        updated: syncStats.updated 
      });

  const { data: updateData, error: updateError } = await supabase
    .from('calendar_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: 'completed',
    })
    .eq('id', connectionId)
    .select(); // ✅ Add .select() to see what was updated

  console.log('✅ Update result:', { 
    updateData, 
    updateError, 
    connectionId 
  });

  if (updateError) {
    console.error('❌ Failed to update sync status:', updateError);
    // Don't throw - we still want to return success since sync worked
  }

        return {
          success: true,
          connectionId,
          summary: {
            eventsFetched: events.length,
            eventsCreated: syncStats.created,
            eventsUpdated: syncStats.updated,
            eventsDeleted: syncStats.deleted,
            conflictsDetected: conflictCount,
          },
        };
      } catch (syncError: any) {
        // Update sync log with error
        await supabase
          .from('calendar_sync_log')
          .update({
            sync_status: 'failed',
            sync_completed_at: new Date().toISOString(),
            error_message: syncError.message,
          })
          .eq('id', syncLog.id);

        // Update connection with error
        await supabase
          .from('calendar_connections')
          .update({
            last_sync_status: 'failed',
          })
          .eq('id', connectionId);

        throw syncError;
      }
    } catch (error: any) {
      console.error('Calendar sync failed:', error);
      return {
        success: false,
        connectionId,
        summary: {
          eventsFetched: 0,
          eventsCreated: 0,
          eventsUpdated: 0,
          eventsDeleted: 0,
          conflictsDetected: 0,
        },
        errors: [
          {
            code: 'SYNC_FAILED',
            message: error.message,
          } as SyncError,
        ],
      };
    }
  }

  /**
   * Sync all connections for an organization
   */
  async syncAllConnections(organizationId: string): Promise<SyncResult[]> {
    const supabase = getServiceClient();

    try {
      const { data: connections, error } = await supabase
        .from('calendar_connections')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('sync_enabled', true);

      if (error) throw error;

      if (!connections || connections.length === 0) {
        return [];
      }

      // Sync all connections in parallel
      const results = await Promise.all(
        connections.map((conn) => this.syncConnection(conn.id))
      );

      return results;
    } catch (error: any) {
      console.error('Failed to sync all connections:', error);
      throw new Error(`Batch sync failed: ${error.message}`);
    }
  }

  /**
   * Ensure token is valid, refresh if needed
   */
  private async ensureValidToken(
    connection: CalendarConnection
  ): Promise<string> {
    const supabase = getServiceClient();

    // Check if token is expired or about to expire (within 5 minutes)
    const expiresAt = connection.token_expires_at
      ? new Date(connection.token_expires_at)
      : null;
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (!expiresAt || expiresAt <= fiveMinutesFromNow) {
      // Token expired or about to expire, refresh it
      if (!connection.refresh_token) {
        throw new Error('No refresh token available');
      }

      try {
        let newTokens;
        if (connection.provider === 'google') {
          newTokens = await this.getGoogleService().refreshAccessToken(  // ✅ NEW
            connection.refresh_token
          );
        } else {
          newTokens = await this.getOutlookService().refreshAccessToken(  // ✅ NEW
            connection.refresh_token
          );
        }

        // Update connection with new tokens
        const expiresAt = new Date(
          Date.now() + newTokens.expires_in * 1000
        ).toISOString();

        await supabase
          .from('calendar_connections')
          .update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token || connection.refresh_token,
            token_expires_at: expiresAt,
          })
          .eq('id', connection.id);

        return newTokens.access_token;
      } catch (error: any) {
        throw new Error(`Token refresh failed: ${error.message}`);
      }
    }

    return connection.access_token!;
  }

  /**
   * Fetch events from calendar provider
   */
  private async fetchEventsFromProvider(
    connection: CalendarConnection,
    accessToken: string
  ): Promise<ExternalCalendarEvent[]> {
    const calendarId = connection.calendar_id || 'primary';

    const lookbackDays = parseInt(
      process.env.CALENDAR_SYNC_LOOKBACK_DAYS || '7'
    );
    const lookaheadDays = parseInt(
      process.env.CALENDAR_SYNC_LOOKAHEAD_DAYS || '90'
    );

    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - lookbackDays);

    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + lookaheadDays);

    let allEvents: ExternalCalendarEvent[] = [];
    let nextPageToken: string | undefined;

    try {
      do {
        let response;
        if (connection.provider === 'google') {
          response = await this.getGoogleService().fetchEvents(
            accessToken,
            calendarId,
            {
              timeMin,
              timeMax,
              syncToken: connection.sync_token,
              pageToken: nextPageToken,
            }
          );
        } else {
          response = await this.getOutlookService().fetchEvents(
            accessToken,
            calendarId,
            {
              timeMin,
              timeMax,
              deltaLink: connection.sync_token,
            }
          );
        }

        allEvents = allEvents.concat(response.events);
        nextPageToken = response.nextPageToken;

        // Update sync token for incremental sync
        if (response.nextSyncToken && !nextPageToken) {
          const supabase = getServiceClient();
          await supabase
            .from('calendar_connections')
            .update({ sync_token: response.nextSyncToken })
            .eq('id', connection.id);
        }
      } while (nextPageToken);

      return allEvents;
    } catch (error: any) {
      throw new Error(`Failed to fetch events: ${error.message}`);
    }
  }

  /**
   * Sync events to database
   */
  private async syncEventsToDatabase(
    connection: CalendarConnection,
    events: ExternalCalendarEvent[]
  ): Promise<{
    created: number;
    updated: number;
    deleted: number;
    eventIds: string[];
  }> {
    const supabase = getServiceClient();
    let created = 0;
    let updated = 0;
    let deleted = 0;
    const eventIds: string[] = [];

    try {
      // Get existing events for this connection
      const { data: existingEvents } = await supabase
        .from('synced_work_events')
        .select('id, external_event_id')
        .eq('calendar_connection_id', connection.id);

      const existingEventMap = new Map(
        existingEvents?.map((e) => [e.external_event_id, e.id]) || []
      );

      // Process each event
      for (const event of events) {
        const eventData = {
          calendar_connection_id: connection.id,
          organization_id: connection.organization_id,
          external_event_id: event.id,
          external_calendar_id: event.calendarId,
          title: event.title,
          description: event.description,
          location: event.location,
          start_time: event.startTime,
          end_time: event.endTime,
          is_all_day: event.isAllDay,
          is_meeting: event.isMeeting,
          is_recurring: event.isRecurring,
          recurring_event_id: event.recurringEventId,
          attendees_count: event.attendees?.length || 0,
          last_synced_at: new Date().toISOString(),
        };

        if (existingEventMap.has(event.id)) {
          // Update existing event
          const existingId = existingEventMap.get(event.id)!;
          const { error } = await supabase
            .from('synced_work_events')
            .update(eventData)
            .eq('id', existingId);

          if (!error) {
            updated++;
            eventIds.push(existingId);
          }
        } else {
          // Create new event
          const { data: newEvent, error } = await supabase
            .from('synced_work_events')
            .insert(eventData)
            .select('id')
            .single();

          if (!error && newEvent) {
            created++;
            eventIds.push(newEvent.id);
          }
        }
      }

      // Mark deleted events (events that exist in DB but not in sync)
      const syncedEventIds = new Set(events.map((e) => e.id));
      const deletedEvents = Array.from(existingEventMap.entries())
        .filter(([externalId]) => !syncedEventIds.has(externalId))
        .map(([, dbId]) => dbId);

      if (deletedEvents.length > 0) {
        const { error } = await supabase
          .from('synced_work_events')
          .update({ is_deleted: true })
          .in('id', deletedEvents);

        if (!error) {
          deleted = deletedEvents.length;
        }
      }

      return { created, updated, deleted, eventIds };
    } catch (error: any) {
      throw new Error(`Failed to sync events to database: ${error.message}`);
    }
  }

  /**
   * Detect conflicts for synced events
   */
  private async detectAndUpdateConflicts(
    organizationId: string,
    eventIds: string[]
  ): Promise<number> {
    const supabase = getServiceClient();

    try {
      // Get the events that were just synced
      const { data: events } = await supabase
        .from('synced_work_events')
        .select('*')
        .in('id', eventIds);

      if (!events) return 0;

      let conflictCount = 0;

      // Detect conflicts for each event
      for (const event of events) {
        const result = await this.getConflictService().detectConflictsForEvent( 
          organizationId,
          event as SyncedWorkEvent
        );

        if (result.hasConflict) {
          conflictCount += result.conflicts.length;
        }

        // The conflict detection trigger will update the event automatically
      }

      return conflictCount;
    } catch (error: any) {
      console.error('Failed to detect conflicts:', error);
      return 0;
    }
  }

  /**
   * Auto-block work events in HomeschoolHQ calendar
   */
  async autoBlockWorkEvents(
    organizationId: string,
    eventIds: string[]
  ): Promise<number> {
    const supabase = getServiceClient();

    try {
      // Get events that should be auto-blocked
      const { data: events } = await supabase
        .from('synced_work_events')
        .select('*, calendar_connections!inner(auto_block_enabled)')
        .in('id', eventIds)
        .eq('calendar_connections.auto_block_enabled', true)
        .eq('auto_blocked', false);

      if (!events || events.length === 0) return 0;

      let blockedCount = 0;

      // Create blocked lesson slots for each work event
      for (const event of events) {
        // Create a "blocked" lesson in the calendar
        const { data: blockedLesson, error } = await supabase
          .from('lessons')
          .insert({
            organization_id: organizationId,
            title: `🚫 ${event.title} (Work)`,
            description: `Automatically blocked for work event: ${event.title}`,
            scheduled_start: event.start_time,
            scheduled_end: event.end_time,
            status: 'blocked',
            is_work_block: true,
          })
          .select('id')
          .single();

        if (!error && blockedLesson) {
          // Update the work event to reference the blocked lesson
          await supabase
            .from('synced_work_events')
            .update({
              auto_blocked: true,
              blocked_lesson_id: blockedLesson.id,
            })
            .eq('id', event.id);

          blockedCount++;
        }
      }

      return blockedCount;
    } catch (error: any) {
      console.error('Failed to auto-block work events:', error);
      return 0;
    }
  }
}

// Singleton instance
let calendarSyncService: CalendarSyncService;

export function getCalendarSyncService(): CalendarSyncService {
  if (!calendarSyncService) {
    calendarSyncService = new CalendarSyncService();
  }
  return calendarSyncService;
}