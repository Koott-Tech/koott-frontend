'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '../lib/supabaseClient';

export default function GoogleSignIn({ onSuccess, onError, returnUrl }) {
  const { login, isRemembered } = useAuth();
  const router = useRouter();

  // Get singleton Supabase client
  const supabase = getSupabaseClient();
  const popupRef = useRef(null);
  const returnUrlRef = useRef(null);

  const resolvedReturnUrl = useMemo(() => {
    if (returnUrl) return returnUrl;
    if (typeof window === 'undefined') return '/';
    return window.location.href;
  }, [returnUrl]);

  useEffect(() => {
    returnUrlRef.current = resolvedReturnUrl;
  }, [resolvedReturnUrl]);

  useEffect(() => {
    const handleAuthResult = (event) => {
      if (!event?.data || typeof window === 'undefined') return;
      if (!event.data?.type?.startsWith?.('supabase:auth-')) return;

      const allowedOrigins = [window.location.origin];
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        try {
          const supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
          allowedOrigins.push(supabaseOrigin);
        } catch (error) {
          console.warn('Unable to parse Supabase origin for message verification:', error);
        }
      }

      if (!allowedOrigins.includes(event.origin)) {
        console.warn('Blocked message from untrusted origin:', event.origin);
        return;
      }

      const { type, success, payload } = event.data;
      if (type !== 'supabase:auth-result') return;

      if (success) {
        if (popupRef.current && !popupRef.current.closed) {
          try {
            popupRef.current.close();
          } catch (closeError) {
            console.warn('Unable to close auth popup:', closeError);
          }
        }
        try {
          if (payload?.user && payload?.token) {
            login(payload.user, payload.token, { remember: isRemembered ?? true });
          }
        } catch (error) {
          console.warn('Unable to hydrate AuthContext from popup result:', error);
        }

        onSuccess?.();

        const targetUrl = payload?.returnUrl || returnUrlRef.current || (typeof window !== 'undefined' ? window.location.href : '/');
        if (typeof window !== 'undefined') {
          if (targetUrl && targetUrl !== window.location.href) {
            window.location.href = targetUrl;
          } else {
            router.refresh();
          }
        } else {
          router.refresh();
        }
      } else {
        const message = payload?.error || 'Google Sign-In failed.';
        onError?.(new Error(message));
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('message', handleAuthResult);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('message', handleAuthResult);
      }
    };
  }, [login, onError, onSuccess, router]);

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      console.error('❌ Supabase client not available');
      console.error('Check environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
      onError?.(new Error('Supabase configuration missing'));
      return;
    }
    
    try {
      console.log('🔍 Starting Supabase Google Sign-In');
      console.log('🔍 Redirect URL:', `${window.location.origin}/auth/callback`);
      console.log('🔍 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      
      const popupFeatures = 'toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=480,height=640';
      let popupWindow = null;
      if (typeof window !== 'undefined') {
        const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
        const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;
        const width = window.innerWidth || document.documentElement.clientWidth || screen.width;
        const height = window.innerHeight || document.documentElement.clientHeight || screen.height;

        const popupWidth = 480;
        const popupHeight = 640;
        const left = width / 2 - popupWidth / 2 + dualScreenLeft;
        const top = height / 2 - popupHeight / 2 + dualScreenTop;

        popupWindow = window.open(
          '',
          'koott-google-auth',
          `${popupFeatures},left=${left},top=${top}`
        );
      }

      const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
      callbackUrl.searchParams.set('mode', 'popup');
      if (typeof window !== 'undefined') {
        callbackUrl.searchParams.set('sourceOrigin', encodeURIComponent(window.location.origin));
      }
      callbackUrl.searchParams.set('returnUrl', encodeURIComponent(resolvedReturnUrl));

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: true,
        }
      });

      if (error) {
        console.error('❌ Supabase Google Sign-In error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        if (onError) onError(new Error(error.message));
        if (popupWindow && !popupWindow.closed) {
          popupWindow.close();
        }
        return;
      }

      if (data?.url) {
        if (popupWindow) {
          popupWindow.location.href = data.url;
          popupWindow.focus();
          popupRef.current = popupWindow;
        } else {
          window.location.href = data.url;
        }
      } else if (popupWindow && !popupWindow.closed) {
        popupWindow.close();
        onError?.(new Error('Unable to start Google Sign-In popup.'));
      }

      console.log('✅ Supabase Google Sign-In initiated:', data);
      // Note: User will be redirected to Google, so no further code will execute
      
    } catch (error) {
      console.error('❌ Google Sign-In error:', error);
      console.error('Error stack:', error.stack);
      if (onError) onError(error);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>
    </div>
  );
}