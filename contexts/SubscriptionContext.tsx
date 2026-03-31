'use client';

/**
 * Subscription Context
 * Provides subscription state and methods to all components
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { stripeApiClient, type SubscriptionStatus } from '@/lib/stripe-api';

interface SubscriptionContextType {
  subscription: SubscriptionStatus | null;
  isLoading: boolean;
  hasActiveSubscription: boolean;
  isTrialing: boolean;
  trialDaysLeft: number | null;
  planTier: string;
  planFeatures: Record<string, boolean>;
  refreshSubscription: () => Promise<void>;
  startCheckout: (plan?: string) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  cancelSubscription: (immediate?: boolean) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has active subscription (includes free trial)
  const hasActiveSubscription = Boolean(
    subscription &&
    subscription.has_subscription &&
    (subscription.status === 'active' || subscription.status === 'trialing')
  );

  // Plan tier and features from subscription
  const planTier = subscription?.plan_tier || 'basic';
  const planFeatures = subscription?.features || {};

  // Check if user is in trial period
  const isTrialing = React.useMemo(() => {
    if (isLoading) {
      return false;
    }

    // Primary source: Stripe subscription status
    if (subscription?.has_subscription && subscription.status === 'trialing') {
      return true;
    }

    // If user has a paid active subscription, they're not trialing
    if (subscription?.has_subscription && subscription.status === 'active') {
      return false;
    }

    // Fallback: check user.trial_end_date for users without any subscription record
    if (!subscription?.has_subscription && user?.trial_end_date) {
      const trialEndDate = new Date(user.trial_end_date);
      return trialEndDate > new Date();
    }

    return false;
  }, [subscription, user?.trial_end_date, isLoading]);

  // Calculate trial days left
  const trialDaysLeft = React.useMemo(() => {
    if (!isTrialing) {
      return null;
    }

    // Use subscription.trial_end (from Stripe) first, then user.trial_end_date as fallback
    const trialEndStr = subscription?.trial_end || user?.trial_end_date;
    if (!trialEndStr) {
      return null;
    }

    const trialEndDate = new Date(trialEndStr);
    const now = new Date();
    const diffTime = trialEndDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  }, [isTrialing, subscription?.trial_end, user?.trial_end_date]);

  // Load subscription status
  const loadSubscription = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      const status = await stripeApiClient.getSubscriptionStatus();
      setSubscription(status);
    } catch (error) {
      console.error('Failed to load subscription:', error);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      loadSubscription();
    }
  }, [authLoading, loadSubscription]);

  // Refresh subscription status
  const refreshSubscription = async () => {
    try {
      const status = await stripeApiClient.getSubscriptionStatus();
      setSubscription(status);
    } catch (error) {
      console.error('Failed to refresh subscription:', error);
      throw error;
    }
  };

  // Start Stripe Checkout
  const startCheckout = async (plan: string = 'basic') => {
    try {
      const { checkout_url } = await stripeApiClient.createCheckoutSession(plan);
      // Redirect to Stripe Checkout
      window.location.href = checkout_url;
    } catch (error) {
      console.error('Failed to start checkout:', error);
      throw error;
    }
  };

  // Open Stripe Customer Portal
  const openCustomerPortal = async () => {
    try {
      const { portal_url } = await stripeApiClient.createPortalSession();
      // Redirect to Stripe Customer Portal
      window.location.href = portal_url;
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      throw error;
    }
  };

  // Cancel subscription
  const cancelSubscription = async (immediate: boolean = false) => {
    try {
      await stripeApiClient.cancelSubscription(immediate);
      await refreshSubscription();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw error;
    }
  };

  const value: SubscriptionContextType = {
    subscription,
    isLoading,
    hasActiveSubscription,
    isTrialing,
    trialDaysLeft,
    planTier,
    planFeatures,
    refreshSubscription,
    startCheckout,
    openCustomerPortal,
    cancelSubscription,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

// Custom hook to use subscription context
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

export default SubscriptionContext;
