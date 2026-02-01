// src/lib/calendar/outlook-calendar.service.ts
// Microsoft Outlook/365 OAuth and Sync Service

import { Client } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication } from '@azure/msal-node';
import crypto from 'crypto';
import type {
  OAuthAuthorizationUrl,
  OAuthTokenResponse,
  CalendarInfo,
  CalendarListResponse,
  ExternalCalendarEvent,
  CalendarEventResponse,
} from '@/src/types/calendar';

export class OutlookCalendarService {
  private msalClient: ConfidentialClientApplication;
  private readonly SCOPES = [
    'Calendars.Read',
    'offline_access',
    'User.Read',
  ];

  constructor() {
    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID!,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
        authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}`,
      },
    });
  }

  /**
   * Generate OAuth authorization URL
   */
  async generateAuthUrl(userId: string): Promise<OAuthAuthorizationUrl> {
    const state = this.generateState(userId);

    const authUrl = await this.msalClient.getAuthCodeUrl({
      scopes: this.SCOPES,
      redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
      state: state,
      prompt: 'consent', // Force consent to get refresh token
    });

    return {
      url: authUrl,
      state: state,
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse> {
    try {
      const tokenResponse = await this.msalClient.acquireTokenByCode({
        code,
        scopes: this.SCOPES,
        redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
      }) as any;

      return {
        access_token: tokenResponse.accessToken || '',
        refresh_token: tokenResponse.refreshToken || undefined,
        expires_in: tokenResponse.expiresOn
          ? Math.floor((tokenResponse.expiresOn.getTime() - Date.now()) / 1000)
          : 3600,
        token_type: tokenResponse.tokenType || 'Bearer',
        scope: tokenResponse.scopes?.join(' ') || undefined,
      };
    } catch (error: any) {
      throw new Error(
        `Failed to exchange Outlook OAuth code: ${error.message}`
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    try {
      const tokenResponse = await this.msalClient.acquireTokenByRefreshToken({
        refreshToken,
        scopes: this.SCOPES,
      }) as any;

      return {
        access_token: tokenResponse.accessToken || '',
        refresh_token: tokenResponse.refreshToken || refreshToken,
        expires_in: tokenResponse.expiresOn
          ? Math.floor((tokenResponse.expiresOn.getTime() - Date.now()) / 1000)
          : 3600,
        token_type: tokenResponse.tokenType || 'Bearer',
        scope: tokenResponse.scopes?.join(' ') || undefined,
      };
    } catch (error: any) {
      throw new Error(
        `Failed to refresh Outlook access token: ${error.message}`
      );
    }
  }

  /**
   * Create Microsoft Graph client
   */
  private getGraphClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  /**
   * Get user's calendar list
   */
  async listCalendars(accessToken: string): Promise<CalendarListResponse> {
    try {
      const client = this.getGraphClient(accessToken);

      const response = await client
        .api('/me/calendars')
        .select('id,name,color,canEdit,isDefaultCalendar')
        .get();

      const calendars: CalendarInfo[] = response.value.map((cal: any) => ({
        id: cal.id,
        name: cal.name || 'Unnamed Calendar',
        isPrimary: cal.isDefaultCalendar || false,
        canWrite: cal.canEdit || false,
        color: cal.color || undefined,
      }));

      return {
        calendars,
        nextPageToken: response['@odata.nextLink'] || undefined,
      };
    } catch (error: any) {
      throw new Error(`Failed to list Outlook calendars: ${error.message}`);
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
      const client = this.getGraphClient(accessToken);

      const user = await client
        .api('/me')
        .select('id,displayName,mail,userPrincipalName')
        .get();

      return {
        email: user.mail || user.userPrincipalName,
        name: user.displayName,
        id: user.id,
      };
    } catch (error: any) {
      throw new Error(`Failed to get Outlook user profile: ${error.message}`);
    }
  }

  /**
   * Fetch calendar events with delta sync support
   */
  async fetchEvents(
    accessToken: string,
    calendarId: string,
    options: {
      timeMin?: Date;
      timeMax?: Date;
      deltaLink?: string;
      maxResults?: number;
    } = {}
  ): Promise<CalendarEventResponse> {
    try {
      const client = this.getGraphClient(accessToken);

      const {
        timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days ahead
        deltaLink,
        maxResults = 250,
      } = options;

      let request;

      if (deltaLink) {
        // Use delta link for incremental sync
        request = client.api(deltaLink);
      } else {
        // Initial sync with time range filter
        request = client
          .api(`/me/calendars/${calendarId}/calendarView/delta`)
          .query({
            startDateTime: timeMin.toISOString(),
            endDateTime: timeMax.toISOString(),
          })
          .top(maxResults)
          .select(
            'id,subject,bodyPreview,start,end,isAllDay,location,attendees,recurrence,isCancelled,onlineMeeting'
          );
      }

      const response = await request.get();

      const events: ExternalCalendarEvent[] = response.value
        .filter((event: any) => !event.isCancelled)
        .map((event: any) => this.transformOutlookEvent(event, calendarId));

      return {
        events,
        nextPageToken: response['@odata.nextLink'] || undefined,
        nextSyncToken: response['@odata.deltaLink'] || undefined,
      };
    } catch (error: any) {
      // Handle delta link expiration
      if ((error as any).statusCode === 410 && options.deltaLink) {
        // Delta link expired, need full sync
        return this.fetchEvents(accessToken, calendarId, {
          ...options,
          deltaLink: undefined,
        });
      }
      throw new Error(`Failed to fetch Outlook calendar events: ${error.message}`);
    }
  }

  /**
   * Transform Outlook event to our format
   */
  private transformOutlookEvent(
    event: any,
    calendarId: string
  ): ExternalCalendarEvent {
    const startTime = event.start.dateTime + 'Z';
    const endTime = event.end.dateTime + 'Z';

    return {
      id: event.id,
      calendarId,
      title: event.subject || '(No title)',
      description: event.bodyPreview || undefined,
      location: event.location?.displayName || undefined,
      startTime,
      endTime,
      isAllDay: event.isAllDay || false,
      status: event.isCancelled ? 'cancelled' : 'confirmed',
      isMeeting: (event.attendees?.length || 0) > 1 || !!event.onlineMeeting,
      attendees: event.attendees?.map((att: any) => ({
        email: att.emailAddress.address,
        name: att.emailAddress.name,
        responseStatus: att.status.response,
      })) || undefined,
      isRecurring: !!event.recurrence,
      recurrence: event.recurrence ? [JSON.stringify(event.recurrence)] : undefined,
      teamsLink: event.onlineMeeting?.joinUrl || undefined,
    };
  }

  /**
   * Revoke access (sign out)
   */
  async revokeAccess(accessToken: string): Promise<void> {
    try {
      // Microsoft doesn't have a direct revoke endpoint like Google
      // The user needs to revoke from their Microsoft account settings
      // We just clear our local tokens
      console.log('Outlook connection disconnected. User should revoke app access from Microsoft account settings.');
    } catch (error: any) {
      throw new Error(`Failed to revoke Outlook access: ${error.message}`);
    }
  }

  // ============================================
  // State Management
  // ============================================

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
let outlookCalendarService: OutlookCalendarService;

export function getOutlookCalendarService(): OutlookCalendarService {
  if (!outlookCalendarService) {
    outlookCalendarService = new OutlookCalendarService();
  }
  return outlookCalendarService;
}