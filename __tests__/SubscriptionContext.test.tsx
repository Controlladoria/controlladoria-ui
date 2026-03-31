/**
 * Tests for SubscriptionContext
 * Tests subscription state management
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { SubscriptionProvider, useSubscription } from '../contexts/SubscriptionContext';
import { AuthProvider } from '../contexts/AuthContext';
import * as stripeApi from '../lib/stripe-api';
import * as authApi from '../lib/auth-api';

// Mock the APIs
jest.mock('../lib/stripe-api');
jest.mock('../lib/auth-api');

const mockedStripeApi = stripeApi as jest.Mocked<typeof stripeApi>;
const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('SubscriptionContext', () => {
  const mockAuthUser = {
    id: 1,
    email: 'test@example.com',
    full_name: 'Test User',
    company_name: 'Test Company',
    is_active: true,
    is_admin: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock authenticated user
    mockedAuthApi.authTokens.getAccessToken.mockReturnValue('mock_token');
    mockedAuthApi.authApiClient.getCurrentUser.mockResolvedValue(mockAuthUser);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <SubscriptionProvider>{children}</SubscriptionProvider>
    </AuthProvider>
  );

  describe('useSubscription hook', () => {
    it('should throw error when used outside SubscriptionProvider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useSubscription());
      }).toThrow('useSubscription must be used within a SubscriptionProvider');

      consoleSpy.mockRestore();
    });

    it('should provide subscription context', async () => {
      const mockSubscription = {
        has_subscription: false,
        status: null,
        trial_start: null,
        trial_end: null,
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
      };

      mockedStripeApi.stripeApiClient.getSubscriptionStatus.mockResolvedValue(
        mockSubscription
      );

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current).toHaveProperty('subscription');
        expect(result.current).toHaveProperty('isLoading');
        expect(result.current).toHaveProperty('hasActiveSubscription');
        expect(result.current).toHaveProperty('isTrialing');
        expect(result.current).toHaveProperty('trialDaysLeft');
        expect(result.current).toHaveProperty('startCheckout');
        expect(result.current).toHaveProperty('openCustomerPortal');
      });
    });
  });

  describe('Subscription status', () => {
    it('should load subscription status on mount', async () => {
      const mockSubscription = {
        has_subscription: true,
        status: 'active' as const,
        trial_start: null,
        trial_end: null,
        current_period_start: '2026-01-01T00:00:00Z',
        current_period_end: '2026-02-01T00:00:00Z',
        cancel_at_period_end: false,
      };

      mockedStripeApi.stripeApiClient.getSubscriptionStatus.mockResolvedValue(
        mockSubscription
      );

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.subscription).toEqual(mockSubscription);
        expect(result.current.hasActiveSubscription).toBe(true);
        expect(result.current.isTrialing).toBe(false);
      });
    });

    it('should detect trialing status', async () => {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 10); // 10 days from now

      const mockSubscription = {
        has_subscription: true,
        status: 'trialing' as const,
        trial_start: '2026-01-01T00:00:00Z',
        trial_end: trialEnd.toISOString(),
        current_period_start: '2026-01-01T00:00:00Z',
        current_period_end: '2026-02-01T00:00:00Z',
        cancel_at_period_end: false,
      };

      mockedStripeApi.stripeApiClient.getSubscriptionStatus.mockResolvedValue(
        mockSubscription
      );

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.isTrialing).toBe(true);
        expect(result.current.hasActiveSubscription).toBe(true);
        expect(result.current.trialDaysLeft).toBeGreaterThan(9);
        expect(result.current.trialDaysLeft).toBeLessThanOrEqual(10);
      });
    });

    it('should calculate trial days left correctly', async () => {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 3); // 3 days from now

      const mockSubscription = {
        has_subscription: true,
        status: 'trialing' as const,
        trial_start: '2026-01-01T00:00:00Z',
        trial_end: trialEnd.toISOString(),
        current_period_start: '2026-01-01T00:00:00Z',
        current_period_end: '2026-02-01T00:00:00Z',
        cancel_at_period_end: false,
      };

      mockedStripeApi.stripeApiClient.getSubscriptionStatus.mockResolvedValue(
        mockSubscription
      );

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.trialDaysLeft).toBe(3);
      });
    });

    it('should handle expired trial', async () => {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() - 1); // Yesterday

      const mockSubscription = {
        has_subscription: true,
        status: 'trialing' as const,
        trial_start: '2026-01-01T00:00:00Z',
        trial_end: trialEnd.toISOString(),
        current_period_start: '2026-01-01T00:00:00Z',
        current_period_end: '2026-02-01T00:00:00Z',
        cancel_at_period_end: false,
      };

      mockedStripeApi.stripeApiClient.getSubscriptionStatus.mockResolvedValue(
        mockSubscription
      );

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.trialDaysLeft).toBe(0);
      });
    });

    it('should handle no subscription', async () => {
      const mockSubscription = {
        has_subscription: false,
        status: null,
        trial_start: null,
        trial_end: null,
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
      };

      mockedStripeApi.stripeApiClient.getSubscriptionStatus.mockResolvedValue(
        mockSubscription
      );

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasActiveSubscription).toBe(false);
        expect(result.current.isTrialing).toBe(false);
        expect(result.current.trialDaysLeft).toBeNull();
      });
    });
  });

  describe('Subscription actions', () => {
    it('should start checkout', async () => {
      const mockCheckoutResponse = {
        checkout_url: 'https://checkout.stripe.com/test123',
      };

      mockedStripeApi.stripeApiClient.createCheckoutSession.mockResolvedValue(
        mockCheckoutResponse
      );
      mockedStripeApi.stripeApiClient.getSubscriptionStatus.mockResolvedValue({
        has_subscription: false,
        status: null,
        trial_start: null,
        trial_end: null,
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
      });

      // Mock window.location.href
      delete (window as any).location;
      window.location = { href: '' } as any;

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.startCheckout();
      });

      expect(
        mockedStripeApi.stripeApiClient.createCheckoutSession
      ).toHaveBeenCalled();
      expect(window.location.href).toBe('https://checkout.stripe.com/test123');
    });

    it('should open customer portal', async () => {
      const mockPortalResponse = {
        portal_url: 'https://billing.stripe.com/portal123',
      };

      mockedStripeApi.stripeApiClient.createPortalSession.mockResolvedValue(
        mockPortalResponse
      );
      mockedStripeApi.stripeApiClient.getSubscriptionStatus.mockResolvedValue({
        has_subscription: true,
        status: 'active' as const,
        trial_start: null,
        trial_end: null,
        current_period_start: '2026-01-01T00:00:00Z',
        current_period_end: '2026-02-01T00:00:00Z',
        cancel_at_period_end: false,
      });

      delete (window as any).location;
      window.location = { href: '' } as any;

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.openCustomerPortal();
      });

      expect(
        mockedStripeApi.stripeApiClient.createPortalSession
      ).toHaveBeenCalled();
      expect(window.location.href).toBe(
        'https://billing.stripe.com/portal123'
      );
    });

    it('should refresh subscription after change', async () => {
      const initialSubscription = {
        has_subscription: false,
        status: null,
        trial_start: null,
        trial_end: null,
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
      };

      const updatedSubscription = {
        has_subscription: true,
        status: 'active' as const,
        trial_start: null,
        trial_end: null,
        current_period_start: '2026-01-01T00:00:00Z',
        current_period_end: '2026-02-01T00:00:00Z',
        cancel_at_period_end: false,
      };

      mockedStripeApi.stripeApiClient.getSubscriptionStatus
        .mockResolvedValueOnce(initialSubscription)
        .mockResolvedValueOnce(updatedSubscription);

      const { result } = renderHook(() => useSubscription(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.hasActiveSubscription).toBe(false);
      });

      // Refresh subscription
      await act(async () => {
        await result.current.refreshSubscription();
      });

      await waitFor(() => {
        expect(result.current.hasActiveSubscription).toBe(true);
      });
    });
  });

  describe('Loading states', () => {
    it('should show loading state while fetching subscription', async () => {
      let resolveSubscription: (value: any) => void;
      const subscriptionPromise = new Promise((resolve) => {
        resolveSubscription = resolve;
      });

      mockedStripeApi.stripeApiClient.getSubscriptionStatus.mockReturnValue(
        subscriptionPromise as any
      );

      const { result } = renderHook(() => useSubscription(), { wrapper });

      // Should be loading initially
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      act(() => {
        resolveSubscription!({
          has_subscription: false,
          status: null,
          trial_start: null,
          trial_end: null,
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
