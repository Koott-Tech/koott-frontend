"use client";
import { createContext, useContext, useState, useEffect } from 'react';
import { setRefreshTokenCallback } from '../lib/backendApi';
import { getSupabaseClient } from '../lib/supabaseClient';
import {
  clearAuthData,
  getStoredToken,
  loadAuthData,
  storeAuthData,
} from '@/lib/authStorage';
import { identifyUser, resetUser } from '@/lib/posthog';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [isRemembered, setIsRemembered] = useState(false);

  useEffect(() => {
    // Get singleton Supabase client
    const supabase = getSupabaseClient();
    setSupabaseClient(supabase);

    // Check for existing token and user data on app load
    const storedAuth = loadAuthData();
    
    console.log('🔍 Auth initialization - storedAuth:', {
      hasToken: !!storedAuth?.token,
      hasUser: !!storedAuth?.user,
      remember: storedAuth?.remember,
      tokenPreview: storedAuth?.token?.substring(0, 20) + '...'
    });
    
    if (storedAuth?.token && storedAuth?.user) {
      try {
        // Decode JWT to check expiration
        const tokenParts = storedAuth.token.split('.');
        let isTokenExpired = false;
        
        if (tokenParts.length === 3) {
          try {
            const payload = JSON.parse(atob(tokenParts[1]));
            const expirationDate = new Date(payload.exp * 1000);
            const now = new Date();
            isTokenExpired = now > expirationDate;
            console.log('🔍 Token expiration check:', {
              expiresAt: expirationDate.toISOString(),
              now: now.toISOString(),
              isExpired: isTokenExpired
            });
          } catch (parseError) {
            console.warn('Failed to parse token expiration:', parseError);
            // If we can't parse, assume it's valid
            isTokenExpired = false;
          }
        }
          
        // If token is expired AND "Remember Me" is NOT enabled - clear session storage
        if (isTokenExpired && !storedAuth.remember) {
          console.log('⚠️ Token expired and "Remember Me" not enabled - clearing session');
          clearAuthData();
          localStorage.setItem('auth_error', 'Your session has expired. Please log in again.');
          setIsLoading(false);
          return;
        }
        
        // If token is expired but "Remember Me" is enabled, still restore the session
        // The API layer will handle token refresh/re-authentication on next request
        if (isTokenExpired && storedAuth.remember) {
          console.log('✅ Token expired but "Remember Me" is active - restoring session. API will handle refresh on next request.');
        }
        
        // Restore the session (even if token is expired, if Remember Me is enabled)
        setToken(storedAuth.token);
        setUser(storedAuth.user);
        setIsRemembered(!!storedAuth.remember);

        const u = storedAuth.user;
        const distinctId = u?.email || u?.id || u?.user_id;
        if (distinctId) {
          identifyUser(distinctId, { email: u?.email, role: u?.role, name: u?.name });
        }

        console.log('✅ Auth session restored:', {
          hasToken: !!storedAuth.token,
          hasUser: !!storedAuth.user,
          remember: !!storedAuth.remember,
          userId: storedAuth.user?.id
        });
        
        // Skip Supabase token refresh since we're using backend JWT tokens
        // The backend handles token validation and refresh
      } catch (error) {
        console.error('❌ Error parsing stored user data:', error);
        // Only clear if it's a parsing error, not just token expiration
        clearAuthData();
      }
    } else {
      console.log('ℹ️ No stored auth data found - user not logged in');
    }
    
    setIsLoading(false);
  }, []);

  const refreshTokenIfNeeded = async (supabase, currentToken) => {
    if (!supabase) {
      return;
    }
    
    try {
      // First check if we have an existing session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        return;
      }
      
      if (!sessionData.session) {
        return;
      }
      
      // Try to refresh the session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Token refresh failed:', error);
        // If refresh fails, clear auth data
        logout();
        return;
      }
      
      if (data.session && data.session.access_token !== currentToken) {
        const updatedToken = data.session.access_token;
        const storedUser = user || loadAuthData()?.user || null;
        storeAuthData({ token: updatedToken, user: storedUser, remember: isRemembered });
        setToken(updatedToken);
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
    }
  };

  const refreshToken = async () => {
    // For backend JWT tokens, we don't need Supabase session refresh
    // The backend API handles token validation and refresh
    
    // Return the current token if available
    const currentToken = getStoredToken();
    if (currentToken) {
      return currentToken;
    }
    
    logout();
    return null;
  };

  // Set the refresh token callback for API requests after refreshToken is defined
  useEffect(() => {
    setRefreshTokenCallback(refreshToken);
  }, []);

  const login = (userData, authToken, options) => {
    // This login function works for ALL roles: client, admin, psychologist, finance, superadmin, event_organizer
    // All roles use the same authentication storage system with "Remember Me" functionality
    
    // Explicitly check if remember preference is provided
    let rememberPreference;
    if (typeof options === 'boolean') {
      rememberPreference = options;
    } else if (options && typeof options === 'object' && 'remember' in options) {
      // Explicitly check if remember is provided (even if false)
      rememberPreference = options.remember;
    } else {
      // Default to true if not specified (better UX - remember by default)
      rememberPreference = true;
    }

    setUser(userData);
    setToken(authToken);
    setIsRemembered(!!rememberPreference);
    storeAuthData({ token: authToken, user: userData, remember: !!rememberPreference });

    // PostHog: identify user so events are tied to this user
    const distinctId = userData?.email || userData?.id || userData?.user_id;
    if (distinctId) {
      identifyUser(distinctId, {
        email: userData?.email,
        role: userData?.role,
        name: userData?.name,
      });
    }

    console.log('✅ Login successful for role:', userData?.role || 'unknown', '- Remember Me:', !!rememberPreference);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsRemembered(false);
    clearAuthData();
    resetUser();
  };

  const isAuthenticated = () => {
    return !!token && !!user;
  };

  const hasRole = (role) => {
    if (!user) return false;
    // Superadmin has access to all roles
    if (user.role === 'superadmin') {
      return true;
    }
    return user.role === role;
  };

  const hasAnyRole = (roles) => {
    if (!user) return false;
    // Superadmin has access to all roles
    if (user.role === 'superadmin') {
      return true;
    }
    return roles.includes(user.role);
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    logout,
    refreshToken,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    isRemembered,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

