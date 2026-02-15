// src/lib/calendar/google-calendar.service.ts
// Google Calendar OAuth and Sync Service

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import type {
  OAuthAuthorizationUrl,
  OAuthTokenResponse,
  CalendarInfo,
  CalendarListResponse,
  ExternalCalendarEvent,
  CalendarEventResponse,
} from '@/src/types/calendar';

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI
    );
  }

  /**
   * Generate OAuth authorization URL with PKCE
   */
  generateAuthUrl(userId: string): OAuthAuthorizationUrl {
    // Generate PKCE code verifier and challenge
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    // Generate state parameter for CSRF protection
    const state = this.generateState(userId);

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request refresh token
      scope: this.SCOPES,
      state: state,
      prompt: 'consent', // Force consent screen to get refresh token
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    } as any);

    return {
      url: authUrl,
      state: state,
      codeVerifier: codeVerifier,
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForTokens(
    code: string,
    codeVerifier: string
  ): Promise<OAuthTokenResponse> {
    try {
      const { tokens } = await this.oauth2Client.getToken({
        code,
        codeVerifier,
      });

      return {
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token || undefined,
        expires_in: tokens.expiry_date
          ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
          : 3600,
        token_type: tokens.token_type || 'Bearer',
        scope: tokens.scope,
      };
    } catch (error: any) {
      throw new Error(
        `Failed to exchange Google OAuth code: ${error.message}`
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      return {
        access_token: credentials.access_token!,
        refresh_token: credentials.refresh_token || refreshToken,
        expires_in: credentials.expiry_date
          ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
          : 3600,
        token_type: credentials.token_type || 'Bearer',
        scope: credentials.scope,
      };
    } catch (error: any) {
      throw new Error(
        `Failed to refresh Google access token: ${error.message}`
      );
    }
  }

  /**
   * Get user's calendar list
   */
  async listCalendars(accessToken: string): Promise<CalendarListResponse> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const response = await calendar.calendarList.list({
        showHidden: false,
        showDeleted: false,
      });

      const calendars: CalendarInfo[] = (response.data.items || []).map((cal) => ({
        id: cal.id!,
        name: cal.summary || 'Unnamed Calendar',
        description: cal.description || undefined,
        isPrimary: cal.primary || false,
        canWrite: cal.accessRole === 'owner' || cal.accessRole === 'writer',
        color: cal.backgroundColor || undefined,
      }));

      return {
        calendars,
        nextPageToken: response.data.nextPageToken || undefined,
      };
    } catch (error: any) {
      throw new Error(`Failed to list Google calendars: ${error.message}`);
    }
  }

  /**
   * Get user profile info
   */
  async getUserProfile(accessToken: string): Promise<{
    email: string;
    name: string;
    id: string;
  }> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const response = await calendar.calendarList.get({
        calendarId: 'primary',
      });

      return {
        email: response.data.id || '',
        name: response.data.summary || 'Unknown',
        id: response.data.id || '',
      };
    } catch (error: any) {
      throw new Error(`Failed to get Google user profile: ${error.message}`);
    }
  }

  /**
   * Fetch calendar events with incremental sync support
   */
  async fetchEvents(
    accessToken: string,
    calendarId: string,
    options: {
      timeMin?: Date;
      timeMax?: Date;
      syncToken?: string;
      pageToken?: string;
      maxResults?: number;
    } = {}
  ): Promise<CalendarEventResponse> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const {
        timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days ahead
        syncToken,
        pageToken,
        maxResults = 250,
      } = options;

      const params: any = {
        calendarId,
        maxResults,
      };

     // Use sync token for incremental sync if available
if (syncToken) {
  // ✅ When using syncToken, ONLY pass syncToken (no singleEvents, no orderBy)
  params.syncToken = syncToken;
} else {
  // ✅ Only use these params for full sync
  params.singleEvents = true;
  params.orderBy = 'startTime';
  params.timeMin = timeMin.toISOString();
  params.timeMax = timeMax.toISOString();
}

if (pageToken) {
  params.pageToken = pageToken;
}
      const response = await calendar.events.list(params);

      const events: ExternalCalendarEvent[] = (response.data.items || [])
        .filter((event) => event.status !== 'cancelled')
        .map((event) => this.transformGoogleEvent(event, calendarId));

      return {
        events,
        nextPageToken: response.data.nextPageToken || undefined,
        nextSyncToken: response.data.nextSyncToken || undefined,
      };
    } catch (error: any) {
      // Handle sync token expiration
      if ((error as any).code === 410 && options.syncToken) {
        // Sync token expired, need full sync
        return this.fetchEvents(accessToken, calendarId, {
          ...options,
          syncToken: undefined,
        });
      }
      throw new Error(`Failed to fetch Google calendar events: ${error.message}`);
    }
  }

  /**
   * Transform Google Calendar event to our format
   */
  private transformGoogleEvent(
    event: any,
    calendarId: string
  ): ExternalCalendarEvent {
    const start = event.start?.dateTime || event.start?.date;
    const end = event.end?.dateTime || event.end?.date;
    const isAllDay = !event.start?.dateTime;

    return {
      id: event.id,
      calendarId,
      title: event.summary || '(No title)',
      description: event.description,
      location: event.location,
      startTime: start,
      endTime: end,
      isAllDay,
      status: event.status || 'confirmed',
      isMeeting: (event.attendees?.length || 0) > 0 || !!event.conferenceData,
      attendees: event.attendees?.map((att: any) => ({
        email: att.email,
        name: att.displayName,
        responseStatus: att.responseStatus,
      })),
      isRecurring: !!event.recurringEventId,
      recurringEventId: event.recurringEventId,
      recurrence: event.recurrence,
      htmlLink: event.htmlLink,
      hangoutLink: event.hangoutLink,
    };
  }

  /**
   * Revoke access token (disconnect)
   */
  async revokeAccess(accessToken: string): Promise<void> {
    try {
      await this.oauth2Client.revokeToken(accessToken);
    } catch (error: any) {
      throw new Error(`Failed to revoke Google access: ${error.message}`);
    }
  }

  // ============================================
  // PKCE Helpers
  // ============================================

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
  }

  private generateState(userId: string): string {
    const stateData = {
      userId,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex'),
    };
    return Buffer.from(JSON.stringify(stateData)).toString('base64url');
  }

  public parseState(state: string): { userId: string; timestamp: number } {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error('Invalid state parameter');
    }
  }

  /**
   * Validate state parameter
   */
  public validateState(state: string, maxAge: number = 600000): boolean {
    try {
      const parsed = this.parseState(state);
      const age = Date.now() - parsed.timestamp;
      return age < maxAge; // Default 10 minutes
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
let googleCalendarService: GoogleCalendarService;

export function getGoogleCalendarService(): GoogleCalendarService {
  if (!googleCalendarService) {
    googleCalendarService = new GoogleCalendarService();
  }
  return googleCalendarService;
}