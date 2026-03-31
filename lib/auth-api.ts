/**
 * Authentication API Client
 * Handles all auth-related API calls
 */

import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Auth API types
export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
  company_name?: string;
  cnpj?: string;
  agreed_to_terms?: boolean;
  agreed_to_privacy?: boolean;
  // Company data (auto-filled from CNPJ lookup)
  trade_name?: string;
  cnae_code?: string;
  cnae_description?: string;
  company_address_street?: string;
  company_address_number?: string;
  company_address_complement?: string;
  company_address_district?: string;
  company_address_city?: string;
  company_address_state?: string;
  company_address_zip?: string;
  capital_social?: number;
  company_size?: string;
  legal_nature?: string;
  company_phone?: string;
  company_email?: string;
  company_status?: string;
  company_opened_at?: string;
  is_simples_nacional?: boolean;
  is_mei?: boolean;
  // Additional company data (from BrasilAPI full response)
  qsa_partners?: Array<{ nome?: string; qualificacao?: string; data_entrada?: string; cpf_cnpj?: string; faixa_etaria?: string }>;
  cnaes_secundarios?: Array<{ codigo?: number; descricao?: string }>;
  company_address_type?: string;
  is_headquarters?: boolean;
  ibge_code?: string;
  regime_tributario?: string;
  simples_desde?: string;
  simples_excluido_em?: string;
  main_partner_name?: string;
  main_partner_qualification?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserResponse {
  id: number;
  email: string;
  full_name?: string;
  company_name?: string;
  cnpj?: string;
  is_active: boolean;
  is_verified: boolean;
  is_admin: boolean;
  role: string;
  parent_user_id?: number | null;
  active_org_id?: number | null;
  created_at: string;
  trial_end_date?: string | null;
  theme_preference?: string;
  font_size_mobile?: string;
  font_size_desktop?: string;
  report_tab_order?: string;
  // Company data from CNPJ lookup
  trade_name?: string;
  cnae_code?: string;
  cnae_description?: string;
  company_address_street?: string;
  company_address_number?: string;
  company_address_complement?: string;
  company_address_district?: string;
  company_address_city?: string;
  company_address_state?: string;
  company_address_zip?: string;
  capital_social?: number;
  company_size?: string;
  legal_nature?: string;
  company_phone?: string;
  company_email?: string;
  company_status?: string;
  company_opened_at?: string;
  is_simples_nacional?: boolean;
  is_mei?: boolean;
  // Additional company data
  qsa_partners?: Array<{ nome?: string; qualificacao?: string; data_entrada?: string; cpf_cnpj?: string; faixa_etaria?: string }>;
  cnaes_secundarios?: Array<{ codigo?: number; descricao?: string }>;
  company_address_type?: string;
  is_headquarters?: boolean;
  ibge_code?: string;
  regime_tributario?: string;
  simples_desde?: string;
  simples_excluido_em?: string;
  main_partner_name?: string;
  main_partner_qualification?: string;
}

export interface RegisterResponse extends UserResponse {
  access_token: string;
  refresh_token: string;
}

// Create axios instance for auth
const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',  // CSRF protection
  },
});

// Token management
export const authTokens = {
  getAccessToken: (): string | undefined => {
    return Cookies.get('access_token');
  },

  getRefreshToken: (): string | undefined => {
    return Cookies.get('refresh_token');
  },

  setTokens: (accessToken: string, refreshToken: string) => {
    // Store tokens in HTTP-only cookies (simulated with secure flag)
    Cookies.set('access_token', accessToken, {
      expires: 1/48, // 30 minutes
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    Cookies.set('refresh_token', refreshToken, {
      expires: 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
  },

  clearTokens: () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
  },
};

// Auth API client
export const authApiClient = {
  // Register new user
  async register(data: RegisterData): Promise<RegisterResponse> {
    const response = await authApi.post<RegisterResponse>('/auth/register', data);

    // Store tokens
    if (response.data.access_token && response.data.refresh_token) {
      authTokens.setTokens(response.data.access_token, response.data.refresh_token);
    }

    return response.data;
  },

  // Login user
  async login(data: LoginData): Promise<TokenResponse | any> {
    const response = await authApi.post<TokenResponse | any>('/auth/login', data);

    // Check if MFA is required
    if (response.data.mfa_required) {
      return response.data; // Return MFA required response
    }

    // Store tokens for normal login
    authTokens.setTokens(response.data.access_token, response.data.refresh_token);

    return response.data;
  },

  // Logout user
  async logout(): Promise<void> {
    const token = authTokens.getAccessToken();

    if (token) {
      try {
        await authApi.post('/auth/logout', null, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    // Clear tokens regardless of API call success
    authTokens.clearTokens();
  },

  // Refresh access token
  async refreshToken(): Promise<TokenResponse> {
    const refreshToken = authTokens.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await authApi.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });

    // Update tokens
    authTokens.setTokens(response.data.access_token, response.data.refresh_token);

    return response.data;
  },

  // Get current user
  async getCurrentUser(): Promise<UserResponse> {
    const token = authTokens.getAccessToken();

    if (!token) {
      throw new Error('No access token available');
    }

    const response = await authApi.get<UserResponse>('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  },

  // Update user profile
  async updateProfile(data: {
    full_name?: string;
    company_name?: string;
    cnpj?: string;
  }): Promise<UserResponse> {
    const token = authTokens.getAccessToken();

    if (!token) {
      throw new Error('No access token available');
    }

    const response = await authApi.patch<UserResponse>('/auth/me', data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  },

  // Request password reset
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const response = await authApi.post('/auth/password-reset/request', { email });
    return response.data;
  },

  // Confirm password reset
  async confirmPasswordReset(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await authApi.post('/auth/password-reset/confirm', {
      token,
      new_password: newPassword,
    });
    return response.data;
  },

  // Resend verification email
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const response = await authApi.post('/auth/resend-verification', { email });
    return response.data;
  },
};

export default authApiClient;
