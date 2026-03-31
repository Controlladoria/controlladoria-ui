/**
 * Tests for AuthContext
 * Tests authentication context and hooks
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import * as authApi from '../lib/auth-api';

// Mock the auth API
jest.mock('../lib/auth-api');

const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('should provide auth context when used inside AuthProvider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('login');
      expect(result.current).toHaveProperty('register');
      expect(result.current).toHaveProperty('logout');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('isLoading');
    });
  });

  describe('Authentication flow', () => {
    it('should initialize with null user and not authenticated', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should login user successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        company_name: 'Test Company',
        is_active: true,
        is_admin: false,
      };

      const mockTokenResponse = {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        token_type: 'bearer',
      };

      mockedAuthApi.authApiClient.login.mockResolvedValue(mockTokenResponse);
      mockedAuthApi.authApiClient.getCurrentUser.mockResolvedValue(mockUser);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(mockedAuthApi.authApiClient.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle login failure', async () => {
      const loginError = new Error('Invalid credentials');
      mockedAuthApi.authApiClient.login.mockRejectedValue(loginError);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.login({
            email: 'test@example.com',
            password: 'wrong_password',
          });
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should register user successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'newuser@example.com',
        full_name: 'New User',
        company_name: 'New Company',
        is_active: true,
        is_admin: false,
      };

      const mockRegisterResponse = {
        user: mockUser,
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        token_type: 'bearer',
      };

      mockedAuthApi.authApiClient.register.mockResolvedValue(
        mockRegisterResponse
      );
      mockedAuthApi.authApiClient.getCurrentUser.mockResolvedValue(mockUser);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register({
          email: 'newuser@example.com',
          password: 'password123',
          full_name: 'New User',
          company_name: 'New Company',
        });
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should logout user successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        company_name: 'Test Company',
        is_active: true,
        is_admin: false,
      };

      mockedAuthApi.authApiClient.getCurrentUser.mockResolvedValue(mockUser);
      mockedAuthApi.authApiClient.logout.mockResolvedValue();

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // First set user (simulate logged in state)
      await act(async () => {
        await result.current.refreshUser();
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      await act(async () => {
        await result.current.logout();
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });

      expect(mockedAuthApi.authApiClient.logout).toHaveBeenCalled();
    });
  });

  describe('Loading states', () => {
    it('should show loading state during authentication check', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        company_name: 'Test Company',
        is_active: true,
        is_admin: false,
      };

      // Create a promise we can control
      let resolveGetUser: (value: any) => void;
      const getUserPromise = new Promise((resolve) => {
        resolveGetUser = resolve;
      });

      mockedAuthApi.authApiClient.getCurrentUser.mockReturnValue(
        getUserPromise as any
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Should be loading initially
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      act(() => {
        resolveGetUser!(mockUser);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Token management', () => {
    it('should load user from existing token on mount', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        company_name: 'Test Company',
        is_active: true,
        is_admin: false,
      };

      // Mock that we have a token stored
      mockedAuthApi.authTokens.getAccessToken.mockReturnValue(
        'existing_access_token'
      );
      mockedAuthApi.authApiClient.getCurrentUser.mockResolvedValue(mockUser);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should handle invalid token gracefully', async () => {
      // Mock that we have a token but it's invalid
      mockedAuthApi.authTokens.getAccessToken.mockReturnValue(
        'invalid_token'
      );
      mockedAuthApi.authApiClient.getCurrentUser.mockRejectedValue(
        new Error('Invalid token')
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });
    });
  });

  describe('Profile update', () => {
    it('should update user profile', async () => {
      const initialUser = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        company_name: 'Test Company',
        is_active: true,
        is_admin: false,
      };

      const updatedUser = {
        ...initialUser,
        full_name: 'Updated User',
        company_name: 'Updated Company',
      };

      mockedAuthApi.authApiClient.getCurrentUser.mockResolvedValue(
        initialUser
      );
      mockedAuthApi.authApiClient.updateProfile.mockResolvedValue(
        updatedUser
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial user load
      await waitFor(() => {
        expect(result.current.user).toEqual(initialUser);
      });

      // Update profile
      await act(async () => {
        await result.current.updateProfile({
          full_name: 'Updated User',
          company_name: 'Updated Company',
        });
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(updatedUser);
      });
    });
  });
});
