'use client';

/**
 * Authentication Context
 * Provides auth state and methods to all components.
 *
 * If the token is invalid or the user can't be loaded, we hard-redirect
 * to /login immediately. No half-authenticated states — ever.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authApiClient, authTokens, type UserResponse, type RegisterData, type LoginData } from '@/lib/auth-api';

interface MFARequiredResponse {
  mfa_required: boolean;
  mfa_method: 'totp' | 'email';
  temp_token: string;
  message: string;
}

interface AuthContextType {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<MFARequiredResponse | void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: { full_name?: string; company_name?: string; cnpj?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Hard redirect to login — clears everything, no half-states */
function forceLogout() {
  authTokens.clearTokens();
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tokenCheckRef = useRef<NodeJS.Timeout | null>(null);

  const isAuthenticated = !!user;

  // Load user from token on mount
  const loadUser = useCallback(async () => {
    // Refresh first when needed. On a reload after ~30 minutes the access token
    // is expired but the 7-day refresh token is still good — treating that as
    // logged out is what made a page refresh bounce people to /login.
    const token = await authApiClient.ensureFreshToken();

    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await authApiClient.getCurrentUser();

      // Validate the response has actual user data — not a partial/empty object
      if (!userData || !userData.email) {
        console.error('getCurrentUser returned invalid data:', userData);
        forceLogout();
        return;
      }

      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
      // Token is bad — force redirect immediately, don't leave user in limbo
      forceLogout();
      return;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle impersonation token passed via URL param from sysadmin
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const impersonationToken = params.get('impersonation_token');
    if (impersonationToken) {
      // Set as the active access_token cookie so the rest of the app treats it as a normal session
      authTokens.setTokens(impersonationToken, ''); // no refresh token for impersonation
      // Remove params from URL without a page reload
      params.delete('impersonation_token');
      params.delete('impersonation_session_id');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Periodic token health check — renew the session before it lapses.
  //
  // This used to call forceLogout() whenever the access token was absent, which
  // is what kicked people out mid-session: the access token legitimately goes
  // away every 30 minutes, and a refresh token being present means the user is
  // still signed in. "No access token" means "refresh", not "logged out". Only
  // a refresh that actually fails ends the session.
  useEffect(() => {
    if (!isAuthenticated) return;

    tokenCheckRef.current = setInterval(async () => {
      const token = await authApiClient.ensureFreshToken();
      if (!token) {
        forceLogout();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      if (tokenCheckRef.current) clearInterval(tokenCheckRef.current);
    };
  }, [isAuthenticated]);

  // Login
  const login = async (data: LoginData) => {
    setIsLoading(true);
    try {
      const response = await authApiClient.login(data);

      if (response && 'mfa_required' in response && response.mfa_required) {
        setIsLoading(false);
        return response as MFARequiredResponse;
      }

      await loadUser();
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  // Register
  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const response = await authApiClient.register(data);

      // Validate response
      if (!response || !response.email) {
        throw new Error('Registration returned invalid data');
      }

      setUser(response);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      await authApiClient.logout();
    } catch {
      // Ignore logout errors — we're clearing everything anyway
    }
    setUser(null);
    authTokens.clearTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const userData = await authApiClient.getCurrentUser();
      if (userData && userData.email) {
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // Don't throw — caller might not handle it and crash the UI
    }
  };

  // Update profile
  const updateProfile = async (data: { full_name?: string; company_name?: string; cnpj?: string }) => {
    const updatedUser = await authApiClient.updateProfile(data);
    if (updatedUser && updatedUser.email) {
      setUser(updatedUser);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
