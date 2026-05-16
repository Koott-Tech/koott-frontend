"use client";
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';

function GoogleCalendarCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get authorization code from URL
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');

        if (errorParam) {
          setStatus('error');
          setError(`Authorization failed: ${errorParam}`);
          setTimeout(() => router.push('/psychologist/settings'), 3000);
          return;
        }

        if (!code) {
          setStatus('error');
          setError('No authorization code received');
          setTimeout(() => router.push('/psychologist/settings'), 3000);
          return;
        }

        // Send code to backend to exchange for tokens
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';
        const url = backendUrl.endsWith('/api') 
          ? `${backendUrl}/psychologists/google-calendar/connect`
          : `${backendUrl}/api/psychologists/google-calendar/connect`;
          
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            code,
            redirect_uri: `${window.location.origin}/auth/google-calendar/callback`
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          setTimeout(() => router.push('/psychologist/settings'), 2000);
        } else {
          setStatus('error');
          setError(data.message || 'Failed to connect Google Calendar');
          setTimeout(() => router.push('/psychologist/settings'), 3000);
        }
      } catch (error) {
        console.error('Error in Google Calendar callback:', error);
        setStatus('error');
        setError('An unexpected error occurred');
        setTimeout(() => router.push('/psychologist/settings'), 3000);
      }
    };

    if (token) {
      handleCallback();
    }
  }, [searchParams, token, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {status === 'processing' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Connecting Google Calendar...</h2>
            <p className="text-sm text-gray-600">Please wait while we complete the setup</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Successfully Connected!</h2>
            <p className="text-sm text-gray-600">Your Google Calendar is now synced with Koott</p>
            <p className="text-xs text-gray-500 mt-2">Redirecting to settings...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Failed</h2>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <p className="text-xs text-gray-500">Redirecting to settings...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleCalendarCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
          </div>
        </div>
      </div>
    }>
      <GoogleCalendarCallbackContent />
    </Suspense>
  );
}

