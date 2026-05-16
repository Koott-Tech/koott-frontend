'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { authApi, clientApi } from '@/lib/backendApi';
import { isClientContactComplete } from '@/lib/contactValidation';
import { storeAuthData } from '@/lib/authStorage';

export default function AuthCallback() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}

function AuthCallbackFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(null);
  const [showError, setShowError] = useState(false);
  const { login } = useAuth();

  const { returnUrl, mode, sourceOrigin } = useMemo(() => {
    if (!searchParams) {
      return { returnUrl: null, mode: null, sourceOrigin: null };
    }

    let rawReturnUrl = searchParams.get('returnUrl');
    const modeParam = searchParams.get('mode');
    let rawSourceOrigin = searchParams.get('sourceOrigin');

    if (rawReturnUrl) {
      try {
        rawReturnUrl = decodeURIComponent(rawReturnUrl);
      } catch (_) {
        // If decoding fails, fall back to original value
      }
    }

    if (rawSourceOrigin) {
      try {
        rawSourceOrigin = decodeURIComponent(rawSourceOrigin);
      } catch (_) {
        // Ignore decoding errors and keep the raw value
      }
    }

    return {
      returnUrl: rawReturnUrl,
      mode: modeParam,
      sourceOrigin: rawSourceOrigin,
    };
  }, [searchParams]);

  const targetOrigin = useMemo(() => {
    if (typeof window === 'undefined') return sourceOrigin || null;
    if (!sourceOrigin) return window.location.origin;
    try {
      const parsed = new URL(sourceOrigin);
      return parsed.origin;
    } catch (error) {
      console.warn('Invalid source origin received, falling back to current origin:', sourceOrigin);
      return window.location.origin;
    }
  }, [sourceOrigin]);

  const safeReturnUrl = useMemo(() => {
    if (!returnUrl) return returnUrl;
    try {
      const target = new URL(returnUrl, targetOrigin || undefined);
      if (typeof window !== 'undefined') {
        const currentOrigin = window.location.origin;
        if (target.origin === currentOrigin || (targetOrigin && target.origin === targetOrigin)) {
          return target.toString();
        }
      } else if (targetOrigin && target.origin === targetOrigin) {
        return target.toString();
      }
      if (returnUrl.startsWith('/')) {
        return returnUrl;
      }
      console.warn('Blocking unsafe return URL, falling back to home:', returnUrl);
      return '/';
    } catch (error) {
      if (returnUrl.startsWith('/')) {
        return returnUrl;
      }
      console.warn('Invalid return URL received, falling back to home:', returnUrl);
      return '/';
    }
  }, [returnUrl, targetOrigin]);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabase = getSupabaseClient();
        
        if (!supabase) {
          console.error('Supabase client not available');
          setStatus('Authentication configuration error. Please try again.');
          setShowError(true);
          localStorage.setItem('auth_error', 'Authentication configuration error. Please try again.');
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
          return;
        }

        // Get the session from URL hash
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setStatus('Authentication failed. Please try again.');
          setShowError(true);
          localStorage.setItem('auth_error', 'Authentication failed. Please try again.');
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
          return;
        }

        if (data.session && data.session.user) {
          console.log('🔍 Supabase auth successful:', data.session.user);

          const accessToken = data.session.access_token;
          const baseUserData = {
            id: data.session.user.id,
            email: data.session.user.email,
            name: data.session.user.user_metadata?.full_name || data.session.user.email,
            role: data.session.user.user_metadata?.role || null,
          };

          let resolvedUserData = { ...baseUserData };

          try {
            const profileResponse = await authApi.getProfile({ silent: true });
            const profileUser = profileResponse?.data?.user;
            if (profileUser) {
              const derivedRole =
                profileUser.role ||
                profileUser.profile?.role ||
                resolvedUserData.role ||
                'client';

              resolvedUserData = {
                ...resolvedUserData,
                name:
                  profileUser.profile?.full_name ||
                  profileUser.full_name ||
                  profileUser.name ||
                  resolvedUserData.name,
                role: derivedRole,
              };
            }
          } catch (profileLookupError) {
            console.warn('Unable to load auth profile after login:', profileLookupError);
            if (!resolvedUserData.role) {
              resolvedUserData.role = 'client';
            }
          }

          storeAuthData({ token: accessToken, user: resolvedUserData, remember: true });

          // Immediately hydrate AuthContext so downstream pages don't need a manual refresh
          try {
            login(resolvedUserData, accessToken, { remember: true });
          } catch (e) {
            console.warn('AuthContext login not available during callback, proceeding with redirect');
          }
          
          if (resolvedUserData.role === 'client') {
            try {
              const profileResponse = await clientApi.getProfile();
              const profile = profileResponse?.data;
              if (!isClientContactComplete(profile)) {
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('showQuickContact', 'true');
                }
              }
            } catch (profileError) {
              console.warn('Unable to verify contact details after login:', profileError);
            }
          } else {
            console.log('Skipping client contact verification for role:', resolvedUserData.role);
          }

          // Treat any callback with mode=popup as a true popup flow.
          // This avoids doing a full-page redirect inside the small popup window,
          // which previously caused the homepage to flash in the popup before close.
          const isPopupMode = mode === 'popup';

          if (isPopupMode) {
            try {
              const payload = {
                type: 'supabase:auth-result',
                success: true,
                payload: {
                  user: resolvedUserData,
                  token: data.session.access_token,
                  returnUrl: safeReturnUrl,
                },
              };
              const originToUse = targetOrigin || (typeof window !== 'undefined' ? window.location.origin : '*');
              window.opener?.postMessage(payload, originToUse);
              if (window.parent && window.parent !== window) {
                window.parent.postMessage(payload, originToUse);
              }
            } catch (postMessageError) {
              console.warn('Failed to post auth success message to opener:', postMessageError);
            }

            // Critical: in popup mode, do NOT navigate inside the popup window.
            // Just close it and let the opener handle navigation based on the message.
            window.close();
            return;
          } else {
            // On success: reload the original page instead of redirecting to /
            // Priority: 1) returnUrl from query params, 2) sessionStorage, 3) referrer (excluding Google)
            let redirectUrl = safeReturnUrl;
            
            if (!redirectUrl && typeof window !== 'undefined') {
              // Try to get from sessionStorage (stored before redirect)
              const storedUrl = sessionStorage.getItem('auth_return_url');
              if (storedUrl) {
                redirectUrl = storedUrl;
                sessionStorage.removeItem('auth_return_url');
              } else {
                // Try to get from referrer (avoid Google OAuth pages)
                const referrer = document.referrer;
                if (referrer && referrer.startsWith(window.location.origin)) {
                  try {
                    const referrerUrl = new URL(referrer);
                    // Only use referrer if it's not the callback page itself and not from Google
                    if (!referrerUrl.pathname.includes('/auth/callback') && 
                        !referrerUrl.hostname.includes('google') &&
                        !referrerUrl.hostname.includes('accounts.google')) {
                      redirectUrl = referrerUrl.pathname + referrerUrl.search;
                    }
                  } catch (e) {
                    // If parsing fails, fall through
                  }
                }
              }
            }
            
            // Always reload the page - use redirectUrl if we have it, otherwise reload home
            if (redirectUrl && redirectUrl !== '/auth/callback') {
              // Reload the original page
              window.location.href = redirectUrl;
            } else {
              // If no specific page found, reload home page (this is still a reload, not a router redirect)
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }
          }
        } else {
          console.log('No session found, redirecting to login');
          setStatus('No active session found. Please log in again.');
          setShowError(true);
          localStorage.setItem('auth_error', 'No active session found. Please log in again.');
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        const isPopupMode = mode === 'popup' && typeof window !== 'undefined' && (window.opener || window.parent !== window);

        if (isPopupMode) {
          try {
            const originToUse = targetOrigin || (typeof window !== 'undefined' ? window.location.origin : '*');
            window.opener?.postMessage(
              {
                type: 'supabase:auth-result',
                success: false,
                payload: { error: error?.message || 'Authentication failed.' },
              },
              originToUse
            );
            if (window.parent && window.parent !== window) {
              window.parent.postMessage(
                {
                  type: 'supabase:auth-result',
                  success: false,
                  payload: { error: error?.message || 'Authentication failed.' },
                },
                originToUse
              );
            }
          } catch (postMessageError) {
            console.warn('Failed to post auth error message to opener:', postMessageError);
          }
            window.close();
        } else {
          setStatus('Authentication failed. Please try again.');
          setShowError(true);
          localStorage.setItem('auth_error', 'Authentication failed. Please try again.');
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        }
      }
    };

    handleAuthCallback();
  }, [login, mode, router, safeReturnUrl, targetOrigin]);

  // Don't show any UI on success - just redirect silently
  // Only show error UI if there's an actual error
  if (!showError) {
    return null; // Return nothing while processing, will redirect on success
  }

  // Only show UI for errors
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">Authentication Failed</p>
        <p className="text-gray-600 mb-4">{status || 'An error occurred during authentication.'}</p>
        <p className="text-sm text-gray-500">Redirecting to home page...</p>
      </div>
    </div>
  );
}
