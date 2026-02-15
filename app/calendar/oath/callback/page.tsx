// app/calendar/oauth/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Processing authorization...');

  useEffect(() => {
    console.log('🚀 OAuth callback page loaded');
    console.log('🔗 Current URL:', window.location.href);
    
    const handleCallback = async () => {
      try {
        // Extract code and state from URL parameters
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        console.log('🔍 OAuth callback params:', { 
          hasCode: !!code, 
          hasState: !!state, 
          error,
          codeLength: code?.length,
          stateLength: state?.length
        });

        // Check for OAuth errors
        if (error) {
          console.error('❌ OAuth error from Google:', error);
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code || !state) {
          console.error('❌ Missing parameters - code:', !!code, 'state:', !!state);
          throw new Error('Missing authorization code or state parameter');
        }

        setStatus('Exchanging authorization code for tokens...');
        console.log('📤 About to POST to backend...');

        const requestBody = { code, state };
        console.log('📦 Request body:', requestBody);

        // Send code and state to backend
        const response = await fetch('/api/calendar/oauth/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log('📥 Backend response status:', response.status);

        const result = await response.json();
        console.log('📥 Backend response body:', result);

        if (!response.ok) {
          console.error('❌ Backend error:', result);
          throw new Error(result.error || result.details || 'Failed to complete OAuth');
        }

        console.log('✅ OAuth successful:', result);
        setStatus('Success! Redirecting...');

        // Redirect to calendar page
        setTimeout(() => {
          router.push('/calendar/connect?success=true');
        }, 1000);
      } catch (err: any) {
        console.error('❌ OAuth callback error:', err);
        console.error('❌ Error stack:', err.stack);
        setError(err.message);
        setStatus('Authentication failed');
        
        // Redirect to calendar page with error after 3 seconds
        setTimeout(() => {
          router.push('/calendar/connect?error=' + encodeURIComponent(err.message));
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {!error ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connecting Your Calendar
              </h2>
              <p className="text-gray-600">{status}</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Authentication Failed
              </h2>
              <p className="text-red-600 mb-4">{error}</p>
              <p className="text-gray-600 text-sm">Redirecting back to calendar settings...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}