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
//
// Storage lifetime is deliberately NOT the same as token lifetime. The JWT
// carries its own `exp` and the server is the authority on whether it is still
// valid; the cookie is just where we keep it. Previously the access_token
// cookie was set to expire in 30 minutes — exactly when the JWT expired — so
// the moment the token went stale it also vanished from the browser. With no
// token left to present, nothing could trigger the 401-refresh path, and the
// session watchdog saw "no token" and logged the user out. Keeping the cookie
// for as long as the refresh token means a stale access token is still
// *present*, so it can be exchanged for a fresh one.
const ACCESS_TOKEN_COOKIE_DAYS = 7;
const REFRESH_TOKEN_COOKIE_DAYS = 7;

/** Refresh this many seconds before the JWT actually expires. */
const REFRESH_SKEW_SECONDS = 120;

const cookieOptions = (days: number) => ({
  expires: days,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
});

/** Read `exp`/`iat` without verifying — we only use them to time refreshes. */
function readTokenTimes(token: string | undefined): { exp: number; iat: number | null } | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp !== 'number') return null;
    return { exp: payload.exp, iat: typeof payload.iat === 'number' ? payload.iat : null };
  } catch {
    return null;
  }
}

/**
 * How long before expiry to renew.
 *
 * Clamped to half the token's own lifetime. Without this, a deployment that
 * shortens ACCESS_TOKEN_EXPIRE_MINUTES below the skew would make every single
 * request look "about to expire" and trigger its own refresh — a refresh storm
 * against /auth/refresh. With the clamp, a 30-minute token renews in its last
 * 2 minutes and a 1-minute token in its last 30 seconds.
 */
function effectiveSkew(exp: number, iat: number | null): number {
  if (iat === null) return REFRESH_SKEW_SECONDS;
  const lifetime = exp - iat;
  if (lifetime <= 0) return REFRESH_SKEW_SECONDS;
  return Math.min(REFRESH_SKEW_SECONDS, Math.floor(lifetime / 2));
}

export const authTokens = {
  getAccessToken: (): string | undefined => {
    return Cookies.get('access_token');
  },

  getRefreshToken: (): string | undefined => {
    return Cookies.get('refresh_token');
  },

  /** True when the access token is missing, unreadable, or about to expire. */
  needsRefresh: (): boolean => {
    const times = readTokenTimes(Cookies.get('access_token'));
    if (times === null) return true;
    return Date.now() / 1000 >= times.exp - effectiveSkew(times.exp, times.iat);
  },

  setTokens: (accessToken: string, refreshToken: string) => {
    Cookies.set('access_token', accessToken, cookieOptions(ACCESS_TOKEN_COOKIE_DAYS));
    // Impersonation passes an empty refresh token — don't clobber a real one
    // with an empty cookie.
    if (refreshToken) {
      Cookies.set('refresh_token', refreshToken, cookieOptions(REFRESH_TOKEN_COOKIE_DAYS));
    }
  },

  clearTokens: () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
  },
};

// Shared promise so concurrent callers await one refresh, not many.
let inFlightRefresh: Promise<string> | null = null;

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

  /**
   * Return a usable access token, refreshing first if the current one is
   * missing or about to expire.
   *
   * Single-flight: a burst of parallel requests (a dashboard fires several at
   * once) shares one refresh instead of each firing its own and racing to
   * overwrite the cookie — which would invalidate the winners' refresh tokens.
   *
   * Returns null when there is nothing to refresh with, i.e. genuinely logged out.
   */
  async ensureFreshToken(): Promise<string | null> {
    if (!authTokens.needsRefresh()) {
      return authTokens.getAccessToken() ?? null;
    }

    if (!authTokens.getRefreshToken()) {
      return null;
    }

    if (!inFlightRefresh) {
      inFlightRefresh = authApiClient
        .refreshToken()
        .then((tokens) => tokens.access_token)
        .finally(() => {
          inFlightRefresh = null;
        });
    }

    try {
      return await inFlightRefresh;
    } catch {
      return null;
    }
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
