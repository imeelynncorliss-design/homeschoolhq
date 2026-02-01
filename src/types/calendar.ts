// src/types/calendar.ts
// TypeScript types for Work Calendar Integration

export type CalendarProvider = 'google' | 'outlook';

export type SyncDirection = 'inbound' | 'outbound' | 'bidirectional';

export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed' | 'partial';

export type ConflictSeverity = 'none' | 'warning' | 'critical';

export type ConflictType = 'full_overlap' | 'work_within_lesson' | 'partial_overlap';

export type ResolutionType = 
  | 'reschedule_lesson' 
  | 'cancel_lesson' 
  | 'ignore_conflict' 
  | 'reschedule_work' 
  | 'mark_flexible';

// ============================================
// Database Types (matching Supabase schema)
// ============================================

export interface CalendarConnection {
  id: string;
  organization_id: string;
  user_id: string;
  provider: CalendarProvider;
  
  // OAuth tokens (never exposed to frontend)
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  
  // Provider data
  provider_account_id: string;
  provider_account_email: string;
  calendar_id?: string;
  calendar_name?: string;
  
  // Sync settings
  sync_enabled: boolean;
  auto_block_enabled: boolean;
  conflict_notification_enabled: boolean;
  sync_direction: SyncDirection;
  
  // Sync status
  last_sync_at?: string;
  last_sync_status: string;
  last_sync_error?: string;
  sync_token?: string;
  
  created_at: string;
  updated_at: string;
}

export interface SyncedWorkEvent {
  id: string;
  calendar_connection_id: string;
  organization_id: string;
  
  // External event data
  external_event_id: string;
  external_calendar_id: string;
  
  // Event details
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  
  // Work event metadata
  is_meeting: boolean;
  is_recurring: boolean;
  recurring_event_id?: string;
  attendees_count: number;
  
  // Conflict detection
  has_conflict: boolean;
  conflicting_lesson_ids?: string[];
  conflicting_event_ids?: string[];
  conflict_severity: ConflictSeverity;
  
  // Auto-blocking
  auto_blocked: boolean;
  blocked_lesson_id?: string;
  
  // Sync metadata
  last_synced_at: string;
  is_deleted: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface CalendarSyncLog {
  id: string;
  calendar_connection_id: string;
  sync_started_at: string;
  sync_completed_at?: string;
  sync_status: SyncStatus;
  
  events_fetched: number;
  events_created: number;
  events_updated: number;
  events_deleted: number;
  conflicts_detected: number;
  
  error_message?: string;
  error_details?: Record<string, any>;
  created_at: string;
}

export interface CalendarConflictResolution {
  id: string;
  synced_work_event_id: string;
  organization_id: string;
  resolved_by: string;
  resolution_type: ResolutionType;
  resolution_notes?: string;
  affected_lesson_id?: string;
  new_lesson_time?: string;
  resolved_at: string;
}

// ============================================
// API Response Types
// ============================================

export interface OAuthAuthorizationUrl {
  url: string;
  state: string;
  codeVerifier?: string; // For PKCE (Google)
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export interface CalendarListResponse {
  calendars: CalendarInfo[];
  nextPageToken?: string;
}

export interface CalendarInfo {
  id: string;
  name: string;
  description?: string;
  isPrimary?: boolean;
  canWrite?: boolean;
  color?: string;
}

export interface CalendarEventResponse {
  events: ExternalCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

export interface ExternalCalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  status: 'confirmed' | 'tentative' | 'cancelled';
  
  // Meeting metadata
  isMeeting: boolean;
  attendees?: Array<{
    email: string;
    name?: string;
    responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  }>;
  
  // Recurring event data
  isRecurring: boolean;
  recurringEventId?: string;
  recurrence?: string[];
  
  // Provider-specific
  htmlLink?: string;
  hangoutLink?: string;
  teamsLink?: string;
}

// ============================================
// Conflict Detection Types
// ============================================

export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflicts: CalendarConflict[];
  severity: ConflictSeverity;
}

export interface CalendarConflict {
  id: string;
  workEvent: SyncedWorkEvent;
  conflictingLesson?: {
    id: string;
    title: string;
    scheduled_start: string;
    scheduled_end: string;
    kid_id: string;
    kid_name: string;
  };
  conflictType: ConflictType;
  overlapDuration: number; // in minutes
  suggestedResolutions: ResolutionType[];
}

export interface ConflictDashboardData {
  totalConflicts: number;
  criticalConflicts: number;
  warningConflicts: number;
  upcomingConflicts: CalendarConflict[];
  pastConflicts: CalendarConflict[];
  unresolved: number;
}

// ============================================
// Sync Operation Types
// ============================================

export interface SyncOperation {
  connectionId: string;
  provider: CalendarProvider;
  syncStarted: Date;
  status: SyncStatus;
  progress?: {
    current: number;
    total: number;
    stage: 'fetching' | 'processing' | 'conflicts' | 'finalizing';
  };
}

export interface SyncResult {
  success: boolean;
  connectionId: string;
  summary: {
    eventsFetched: number;
    eventsCreated: number;
    eventsUpdated: number;
    eventsDeleted: number;
    conflictsDetected: number;
  };
  errors?: SyncError[];
  nextSyncAt?: Date;
}

export interface SyncError {
  code: string;
  message: string;
  eventId?: string;
  details?: Record<string, any>;
}

// ============================================
// Frontend Component Props
// ============================================

export interface CalendarConnectionCardProps {
  connection: CalendarConnection;
  onDisconnect: (connectionId: string) => Promise<void>;
  onToggleSync: (connectionId: string, enabled: boolean) => Promise<void>;
  onSync: (connectionId: string) => Promise<void>;
  onSettings: (connectionId: string) => void;
}

export interface ConflictListItemProps {
  conflict: CalendarConflict;
  onResolve: (conflictId: string, resolution: ResolutionType) => Promise<void>;
  onViewDetails: (conflictId: string) => void;
}

export interface CalendarSyncSettingsProps {
  connection: CalendarConnection;
  onUpdate: (settings: Partial<CalendarConnection>) => Promise<void>;
}

export interface OAuthConnectButtonProps {
  provider: CalendarProvider;
  onConnecting?: () => void;
  onSuccess?: (connection: CalendarConnection) => void;
  onError?: (error: Error) => void;
}

// ============================================
// Utility Types
// ============================================

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface ConflictResolutionPayload {
  conflictId: string;
  resolutionType: ResolutionType;
  notes?: string;
  newLessonTime?: Date;
  affectedLessonId?: string;
}

export interface CalendarSettings {
  syncInterval: number; // minutes
  lookbackDays: number;
  lookaheadDays: number;
  autoBlock: boolean;
  conflictNotifications: boolean;
  syncDirection: SyncDirection;
}

// ============================================
// API Endpoint Types
// ============================================

export interface ConnectCalendarRequest {
  provider: CalendarProvider;
  code: string;
  state: string;
  codeVerifier?: string;
}

export interface ConnectCalendarResponse {
  success: boolean;
  connection: CalendarConnection;
  availableCalendars: CalendarInfo[];
}

export interface SyncCalendarRequest {
  connectionId: string;
  forceFullSync?: boolean;
}

export interface SyncCalendarResponse {
  success: boolean;
  result: SyncResult;
}

export interface GetConflictsRequest {
  organizationId: string;
  startDate?: string;
  endDate?: string;
  severity?: ConflictSeverity;
  resolved?: boolean;
}

export interface GetConflictsResponse {
  conflicts: CalendarConflict[];
  total: number;
  dashboard: ConflictDashboardData;
}

export interface ResolveConflictRequest {
  workEventId: string;
  resolutionType: ResolutionType;
  notes?: string;
  newLessonTime?: string;
  affectedLessonId?: string;
}

export interface ResolveConflictResponse {
  success: boolean;
  resolution: CalendarConflictResolution;
}

// ============================================
// Error Types
// ============================================

export class CalendarIntegrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: CalendarProvider,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'CalendarIntegrationError';
  }
}

export class OAuthError extends CalendarIntegrationError {
  constructor(message: string, provider: CalendarProvider, details?: Record<string, any>) {
    super(message, 'OAUTH_ERROR', provider, details);
    this.name = 'OAuthError';
  }
}

export class SyncError extends CalendarIntegrationError {
  constructor(message: string, provider: CalendarProvider, details?: Record<string, any>) {
    super(message, 'SYNC_ERROR', provider, details);
    this.name = 'SyncError';
  }
}

export class ConflictError extends CalendarIntegrationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFLICT_ERROR', undefined, details);
    this.name = 'ConflictError';
  }
}