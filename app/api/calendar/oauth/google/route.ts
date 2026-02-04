// app/api/calendar/oauth/google/route.ts
// Google Calendar OAuth Flow

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { getGoogleCalendarService } from '@/src/lib/calendar/google-calendar-service';
import { getOrganizationId } from '@/src/lib/auth-helpers'

const googleService = getGoogleCalendarService();

/**
 * GET /api/calendar/oauth/google
 * Initiate OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user and their organization
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const organizationId = await getOrganizationId()
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id;

    // Generate OAuth URL
    const { url, state, codeVerifier } = googleService.generateAuthUrl(userId);

    // Store code verifier in session/cookie for PKCE
    const response = NextResponse.redirect(url);
    response.cookies.set('google_code_verifier', codeVerifier!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error: any) {
    console.error('OAuth initiation failed:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle OAuth callback
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state } = body;

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing authorization code or state' },
        { status: 400 }
      );
    }

    // Get code verifier from cookie
    const codeVerifier = request.cookies.get('google_code_verifier')?.value;
    if (!codeVerifier) {
      return NextResponse.json(
        { error: 'Missing code verifier' },
        { status: 400 }
      );
    }

    // Validate state and extract user ID
    if (!googleService.validateState(state)) {
      return NextResponse.json(
        { error: 'Invalid or expired state parameter' },
        { status: 400 }
      );
    }

    const { userId } = googleService.parseState(state);

    // Exchange code for tokens
    const tokens = await googleService.exchangeCodeForTokens(code, codeVerifier);

    // Get user's calendar info
    const profile = await googleService.getUserProfile(tokens.access_token);
    const calendars = await googleService.listCalendars(tokens.access_token);
    const primaryCalendar = calendars.calendars.find(cal => cal.isPrimary);

    // Get organization from authenticated user
    const supabase = await createClient();
    const { data: userProfile } = await supabase
      .from('user_profiles')  
      .select('organization_id')
      .eq('id', userId)
      .single();
    
    if (!userProfile?.organization_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 400 }
      );
    }

    const organizationId = userProfile.organization_id;

    // Save connection to database
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { data: connection, error: dbError } = await supabase
      .from('calendar_connections')
      .upsert({
        user_id: userId,
        organization_id: organizationId,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        provider_account_id: profile.id,
        provider_account_email: profile.email,
        calendar_id: primaryCalendar?.id || 'primary',
        calendar_name: primaryCalendar?.name || 'Primary Calendar',
        sync_enabled: true,
        auto_block_enabled: false,
        conflict_notification_enabled: true,
        last_sync_status: 'pending',
      }, {
        onConflict: 'organization_id,provider,provider_account_id'
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Clear code verifier cookie
    const response = NextResponse.json({
      success: true,
      connection,
    });
    
    response.cookies.delete('google_code_verifier');
    
    return response;
  } catch (error: any) {
    console.error('OAuth callback failed:', error);
    return NextResponse.json(
      { error: 'OAuth callback failed', details: error.message },
      { status: 500 }
    );
  }
}