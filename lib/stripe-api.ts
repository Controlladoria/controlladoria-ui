/**
 * Stripe API Client
 * Handles subscription-related API calls
 */

import axios from 'axios';
import { authTokens } from './auth-api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Stripe API types
export interface SubscriptionStatus {
  has_subscription: boolean;
  status: string | null;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  max_users: number;
  plan_tier: string;
  plan_name: string;
  features: Record<string, boolean>;
}

export interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
}

export interface PortalSessionResponse {
  portal_url: string;
}

export interface CancelSubscriptionResponse {
  message: string;
  canceled_at_period_end: boolean;
}

export interface PlanInfo {
  slug: string;
  display_name: string;
  description: string | null;
  max_users: number;
  price_monthly_brl: number;
  features: Record<string, boolean>;
  is_highlighted: boolean;
  sort_order: number;
}

// Create axios instance for Stripe
const stripeApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',  // CSRF protection
  },
});

// Request interceptor - add JWT token
stripeApi.interceptors.request.use(
  (config) => {
    const token = authTokens.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Stripe API client
export const stripeApiClient = {
  // Get available plans (public endpoint)
  async getPlans(): Promise<PlanInfo[]> {
    const response = await stripeApi.get<PlanInfo[]>('/stripe/plans');
    return response.data;
  },

  // Create checkout session for subscription
  async createCheckoutSession(plan: string = 'basic'): Promise<CheckoutSessionResponse> {
    const response = await stripeApi.post<CheckoutSessionResponse>(
      '/stripe/create-checkout-session',
      null,
      { params: { plan } }
    );
    return response.data;
  },

  // Create customer portal session
  async createPortalSession(): Promise<PortalSessionResponse> {
    const response = await stripeApi.post<PortalSessionResponse>('/stripe/create-portal-session');
    return response.data;
  },

  // Get subscription status
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    const response = await stripeApi.get<SubscriptionStatus>('/stripe/subscription-status');
    return response.data;
  },

  // Cancel subscription
  async cancelSubscription(immediate: boolean = false): Promise<CancelSubscriptionResponse> {
    const response = await stripeApi.post<CancelSubscriptionResponse>(
      '/stripe/cancel-subscription',
      null,
      {
        params: { immediate },
      }
    );
    return response.data;
  },
};

export default stripeApiClient;
