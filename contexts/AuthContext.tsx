'use client';

/**
 * Authentication Context
 * Provides auth state and methods to all components
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Load user from token on mount
  const loadUser = useCallback(async () => {
    const token = authTokens.getAccessToken();

    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await authApiClient.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
      authTokens.clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Login
  const login = async (data: LoginData) => {
    setIsLoading(true);
    try {
      const response = await authApiClient.login(data);

      // Check if MFA is required
      if (response && 'mfa_required' in response && response.mfa_required) {
        setIsLoading(false);
        return response as MFARequiredResponse;
      }

      // Normal login success
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
      setUser(response);
    } catch (error) {
      setIsLoading(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    setIsLoading(true);
    try {
      await authApiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const userData = await authApiClient.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      throw error;
    }
  };

  // Update profile
  const updateProfile = async (data: { full_name?: string; company_name?: string; cnpj?: string }) => {
    try {
      const updatedUser = await authApiClient.updateProfile(data);
      setUser(updatedUser);
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
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

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
