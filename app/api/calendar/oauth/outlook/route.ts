// app/api/calendar/oauth/outlook/route.ts
// Microsoft Outlook OAuth Routes

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { getOutlookCalendarService } from '@/src/lib/calendar/outlook-calendar-service';
import { getOrganizationId } from '@/src/lib/auth-helpers'


// Conditionally initialize Outlook service only if credentials exist
let outlookService: any = null;

try {
  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    outlookService = getOutlookCalendarService();
    console.log('✅ Outlook OAuth service initialized');
  } else {
    console.warn('⚠️ Microsoft OAuth credentials not configured - Outlook integration disabled');
  }
} catch (error) {
  console.warn('⚠️ Failed to initialize Outlook OAuth:', error);
}

/**
 * POST /api/calendar/oauth/outlook
 * Initiate Outlook OAuth flow
 */
export async function POST(request: NextRequest) {
  if (!outlookService) {
    return NextResponse.json(
      { error: 'Outlook integration not configured' },
      { status: 503 }
    );
  }

  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Generate OAuth URL
    const { url, state } = await outlookService.generateAuthUrl(user.id);

    return NextResponse.json({
      authUrl: url,
      state,
    });
  } catch (error: any) {
    console.error('Failed to initiate Outlook OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authorization', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calendar/oauth/outlook/callback
 * Handle Outlook OAuth callback
 */
export async function GET(request: NextRequest) {
  if (!outlookService) {
    return NextResponse.json(
      { error: 'Outlook integration not configured' },
      { status: 503 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL(
          `/calendar/connect?error=${encodeURIComponent(error)}&details=${encodeURIComponent(errorDescription || '')}`,
          request.url
        )
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          '/calendar/connect?error=missing_parameters',
          request.url
        )
      );
    }

    // Validate state parameter
    if (!outlookService.validateState(state)) {
      return NextResponse.redirect(
        new URL(
          '/calendar/connect?error=invalid_state',
          request.url
        )
      );
    }

    const { userId } = outlookService.parseState(state);

    // Exchange code for tokens
    const tokens = await outlookService.exchangeCodeForTokens(code);

    // Get user profile
    const profile = await outlookService.getUserProfile(tokens.access_token);

    // Get calendars
    const calendars = await outlookService.listCalendars(tokens.access_token);

    // Store connection in database
    const supabase = await createClient();

    // Get organization from authenticated user
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();
    
    if (!userProfile?.organization_id) {
      return NextResponse.redirect(
        new URL(
          '/calendar/connect?error=user_organization_not_found',
          request.url
        )
      );
    }

    const organizationId = userProfile.organization_id;

    // Calculate token expiration
    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    // Find primary calendar
    const primaryCalendar = calendars?.calendars?.find((c: any) => c.isPrimary) ||
      calendars?.calendars?.[0] ||
      null;

    if (!primaryCalendar) {
      console.error('No calendars found for Outlook account');
      return NextResponse.redirect(
        new URL(
          '/calendar/connect?error=no_calendars_found',
          request.url
        )
      );
    }

    // Upsert calendar connection
    const { data: connection, error: dbError } = await supabase
      .from('calendar_connections')
      .upsert(
        {
          organization_id: organizationId,  // ✅ Now using real org ID
          user_id: userId,
          provider: 'outlook',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
          provider_account_id: profile.id,
          provider_account_email: profile.email,
          calendar_id: primaryCalendar?.id,
          calendar_name: primaryCalendar?.name || 'Calendar',
          sync_enabled: true,
          auto_block_enabled: true,
          conflict_notification_enabled: true,
          last_sync_status: 'pending',
        },
        {
          onConflict: 'organization_id,provider,provider_account_id',
        }
      )
      .select()
      .single();

    if (dbError || !connection) {
      console.error('Failed to save calendar connection:', dbError);
      return NextResponse.redirect(
        new URL(
          '/calendar/connect?error=save_failed',
          request.url
        )
      );
    }

    return NextResponse.redirect(
      new URL('/calendar/connect?success=true', request.url)
    );
  } catch (error: any) {
    console.error('Outlook OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/calendar/connect?error=${encodeURIComponent(error.message)}`,
        request.url
      )
    );
  }
}