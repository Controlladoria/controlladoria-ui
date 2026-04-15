/**
 * Payment API Client — Asaas integration
 * Handles subscription, billing history, and plan management.
 */

import axios from 'axios';
import { authTokens } from './auth-api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

export interface CheckoutResponse {
  checkout_url: string;
  subscription_id: string;
}

export interface CancelResponse {
  message: string;
  canceled_at_period_end: boolean;
}

export interface ChangePlanResponse {
  message: string;
  plan: string;
  price: number;
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

export interface PaymentRecord {
  id: string;
  date: string;
  due_date: string;
  value: number;
  net_value: number | null;
  status: string;
  billing_type: string;
  invoice_url: string | null;
  description: string;
}

const paymentApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

paymentApi.interceptors.request.use(
  (config) => {
    const token = authTokens.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const paymentApiClient = {
  async getPlans(): Promise<PlanInfo[]> {
    const response = await paymentApi.get<PlanInfo[]>('/billing/plans');
    return response.data;
  },

  async createCheckout(plan: string = 'basic'): Promise<CheckoutResponse> {
    const response = await paymentApi.post<CheckoutResponse>(
      '/billing/create-checkout',
      null,
      { params: { plan } }
    );
    return response.data;
  },

  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    const response = await paymentApi.get<SubscriptionStatus>('/billing/subscription-status');
    return response.data;
  },

  async cancelSubscription(immediate: boolean = false): Promise<CancelResponse> {
    const response = await paymentApi.post<CancelResponse>(
      '/billing/cancel',
      null,
      { params: { immediate } }
    );
    return response.data;
  },

  async getBillingHistory(): Promise<PaymentRecord[]> {
    const response = await paymentApi.get<PaymentRecord[]>('/billing/history');
    return response.data;
  },

  async changePlan(planSlug: string): Promise<ChangePlanResponse> {
    const response = await paymentApi.post<ChangePlanResponse>(
      '/billing/change-plan',
      null,
      { params: { plan: planSlug } }
    );
    return response.data;
  },
};

// Backward compat: re-export with old name so existing imports still work
export const stripeApiClient = paymentApiClient;
export type { SubscriptionStatus as StripeSubscriptionStatus };

export default paymentApiClient;
