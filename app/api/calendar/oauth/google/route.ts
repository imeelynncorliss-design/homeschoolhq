// app/api/calendar/oauth/google/route.ts
// Google Calendar OAuth Flow

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { getGoogleCalendarService } from '@/src/lib/calendar/google-calendar-service';
import { getOrganizationId } from '@/src/lib/auth-helpers'

const googleService = getGoogleCalendarService();

/**
 * GET /api/calendar/oauth/google
 * Handles two scenarios:
 * 1. Initiate OAuth flow (no query params)
 * 2. Handle OAuth callback from Google (has code/state params)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // SCENARIO 2: OAuth callback from Google (has code/state)
  if (code || state || error) {
    console.log('🔍 OAuth redirect received from Google:', { hasCode: !!code, hasState: !!state, error });

    // Handle OAuth error
    if (error) {
      return NextResponse.redirect(
        new URL(`/calendar/connect?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    // Missing code or state
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/calendar/connect?error=missing_parameters', request.url)
      );
    }

    // Return HTML page that POSTs to our backend
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Connecting Calendar...</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f9fafb;
            }
            .container {
              text-align: center;
              background: white;
              padding: 2rem;
              border-radius: 0.5rem;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .spinner {
              border: 3px solid #f3f4f6;
              border-top: 3px solid #3b82f6;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .error {
              color: #dc2626;
              margin-top: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="spinner"></div>
            <h2>Connecting Your Calendar</h2>
            <p id="status">Please wait...</p>
            <p id="error" class="error" style="display: none;"></p>
          </div>
          <script>
            console.log('🚀 OAuth callback page loaded');
            console.log('📦 Code length:', '${code}'.length);
            console.log('📦 State length:', '${state}'.length);
            
            (async () => {
              try {
                document.getElementById('status').textContent = 'Exchanging authorization code for tokens...';
                
                console.log('📤 Sending POST to backend...');
                const response = await fetch('/api/calendar/oauth/google', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    code: '${code}',
                    state: '${state}'
                  })
                });
                
                console.log('📥 Response status:', response.status);
                const result = await response.json();
                console.log('📥 Response body:', result);
                
                if (response.ok) {
                  console.log('✅ OAuth successful');
                  document.getElementById('status').textContent = 'Success! Redirecting...';
                  setTimeout(() => {
                    window.location.href = '/calendar/connect?success=true';
                  }, 1000);
                } else {
                  throw new Error(result.error || result.details || 'Authentication failed');
                }
              } catch (err) {
                console.error('❌ OAuth error:', err);
                document.getElementById('status').style.display = 'none';
                document.getElementById('error').style.display = 'block';
                document.getElementById('error').textContent = err.message;
                setTimeout(() => {
                  window.location.href = '/calendar/connect?error=' + encodeURIComponent(err.message);
                }, 3000);
              }
            })();
          </script>
        </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }

  // SCENARIO 1: Initiate OAuth flow (no query params)
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
 * POST /api/calendar/oauth/google
 * Handle token exchange (called by the HTML page above)
 */
export async function POST(request: NextRequest) {
  console.log('🎯 POST request received to OAuth callback');
  console.log('🌐 Request URL:', request.url);
  console.log('📝 Request method:', request.method);
  
  try {
    // Try to parse the body and log what we get
    let body;
    const contentType = request.headers.get('content-type');
    console.log('📋 Content-Type:', contentType);
    
    try {
      const bodyText = await request.text();
      console.log('📄 Raw body length:', bodyText.length);
      
      if (!bodyText) {
        throw new Error('Empty request body');
      }
      
      body = JSON.parse(bodyText);
      console.log('✅ Body parsed successfully');
    } catch (parseError: any) {
      console.error('❌ Failed to parse request body:', parseError.message);
      return NextResponse.json(
        { error: 'Invalid request body', details: parseError.message },
        { status: 400 }
      );
    }
    
    const { code, state } = body;

    console.log('🔐 OAuth callback received:', { hasCode: !!code, hasState: !!state });

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing authorization code or state' },
        { status: 400 }
      );
    }

    // Get code verifier from cookie
    const codeVerifier = request.cookies.get('google_code_verifier')?.value;
    console.log('🍪 Code verifier from cookie:', codeVerifier ? 'Found' : 'Missing');
    
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
    console.log('👤 User ID from state:', userId);

    // Exchange code for tokens
    console.log('🔄 Exchanging code for tokens...');
    let tokens;
    try {
      tokens = await googleService.exchangeCodeForTokens(code, codeVerifier);
      console.log('✅ Token exchange successful');
    } catch (tokenError: any) {
      console.error('❌ Token exchange failed:', tokenError);
      console.error('❌ Error details:', {
        message: tokenError.message,
        response: tokenError.response?.data,
        status: tokenError.response?.status
      });
      return NextResponse.json(
        { 
          error: 'Failed to exchange authorization code', 
          details: tokenError.message,
          hint: 'Check Google Cloud Console: OAuth credentials, redirect URIs, and Calendar API enabled'
        },
        { status: 500 }
      );
    }

    // Get user's calendar info
    console.log('📅 Fetching user profile and calendars...');
    const profile = await googleService.getUserProfile(tokens.access_token);
    const calendars = await googleService.listCalendars(tokens.access_token);
    const primaryCalendar = calendars.calendars.find(cal => cal.isPrimary);

    // Get organization from authenticated user
    const supabase = await createClient();
    const { data: userProfile } = await supabase
      .from('user_profiles')  
      .select('organization_id')
      .eq('user_id', userId)
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

    console.log('💾 Saving connection to database...');
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
        calendar_email: profile.email,
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
      console.error('❌ Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('✅ Connection saved successfully');

    // Clear code verifier cookie
    const response = NextResponse.json({
      success: true,
      connection,
    });
    
    response.cookies.delete('google_code_verifier');
    
    return response;
  } catch (error: any) {
    console.error('❌ OAuth callback failed:', error);
    return NextResponse.json(
      { 
        error: 'OAuth callback failed', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}