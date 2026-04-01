/**
 * API Client for ControlladorIA FastAPI Backend
 */

import axios from 'axios';
import { authTokens, authApiClient } from './auth-api';
import type {
  DocumentListResponse,
  DocumentRecord,
  DocumentUploadResponse,
  Stats,
  FinancialSummary,
  CategoryBreakdown,
  MonthlyReport,
  ValidationResult,
  LedgerTransactionsResponse,
} from './types';

// API base URL - adjust for production
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',  // CSRF protection: required by backend on mutating requests
  },
});

// Add API key if configured (legacy support)
const apiKey = process.env.NEXT_PUBLIC_API_KEY;
if (apiKey) {
  api.defaults.headers.common['X-API-Key'] = apiKey;
}

// Request interceptor - add JWT token to all requests
api.interceptors.request.use(
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

// Response interceptor - handle 401 and refresh token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Check if refresh token exists before attempting refresh
      const refreshToken = authTokens.getRefreshToken();
      if (!refreshToken) {
        // No refresh token - redirect to login immediately
        authTokens.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
          return new Promise(() => {});
        }
        return Promise.reject(new Error('No refresh token available'));
      }

      try {
        // Attempt to refresh token
        await authApiClient.refreshToken();
        const newToken = authTokens.getAccessToken();

        processQueue(null, newToken);

        // Retry original request with new token
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        processQueue(refreshError, null);
        authTokens.clearTokens();

        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/login';

          // Return a never-resolving promise to prevent error propagation
          // The redirect will complete before any component code runs
          return new Promise(() => {});
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// API client
export const apiClient = {
  // Health check
  async healthCheck() {
    const response = await api.get('/');
    return response.data;
  },

  // Upload document
  async uploadDocument(file: File): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<DocumentUploadResponse>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // List documents with filters
  async listDocuments(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    document_type?: string;
    transaction_type?: string;
    category?: string;
    date_from?: string;
    date_to?: string;
    amount_min?: number;
    amount_max?: number;
    search?: string;
    client_id?: number;
  }): Promise<DocumentListResponse> {
    const response = await api.get<DocumentListResponse>('/documents', { params });
    return response.data;
  },

  // Get document by ID
  async getDocument(id: number): Promise<DocumentRecord> {
    const response = await api.get<DocumentRecord>(`/documents/${id}`);
    return response.data;
  },

  // Retry failed document
  async retryDocument(id: number): Promise<{ document_id: number; status: string; message: string }> {
    const response = await api.post(`/documents/${id}/retry`);
    return response.data;
  },

  // Delete document
  async deleteDocument(id: number): Promise<{ message: string; id: number }> {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },

  // Create manual document
  async createManualDocument(data: any): Promise<DocumentRecord> {
    const response = await api.post<DocumentRecord>('/documents/manual', data);
    return response.data;
  },

  // Update document
  async updateDocument(id: number, data: any): Promise<any> {
    const response = await api.patch(`/documents/${id}`, data);
    return response.data;
  },

  // Get document audit log
  async getDocumentAuditLog(id: number, limit?: number): Promise<any> {
    const response = await api.get(`/documents/${id}/audit-log`, { params: { limit } });
    return response.data;
  },

  // Get all audit logs
  async getAllAuditLogs(params?: {
    skip?: number;
    limit?: number;
    action?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<any> {
    const response = await api.get('/audit-log', { params });
    return response.data;
  },

  // Validate document
  async validateDocument(id: number): Promise<ValidationResult> {
    const response = await api.get<ValidationResult>(`/documents/${id}/validate`);
    return response.data;
  },

  // Get ledger transactions with pagination and filtering
  async getLedgerTransactions(
    documentId: number,
    params?: {
      skip?: number;
      limit?: number;
      category?: string;
      transaction_type?: string;
      date_from?: string;
      date_to?: string;
      search?: string;
    }
  ): Promise<LedgerTransactionsResponse> {
    const response = await api.get<LedgerTransactionsResponse>(
      `/documents/${documentId}/ledger/transactions`,
      { params }
    );
    return response.data;
  },

  // Get stats
  async getStats(): Promise<Stats> {
    const response = await api.get<Stats>('/stats');
    return response.data;
  },

  // Get financial summary
  async getFinancialSummary(params?: {
    date_from?: string;
    date_to?: string;
  }): Promise<FinancialSummary> {
    const response = await api.get<FinancialSummary>('/reports/summary', { params });
    return response.data;
  },

  // Get category breakdown
  async getCategoryBreakdown(params?: {
    transaction_type?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<CategoryBreakdown> {
    const response = await api.get<CategoryBreakdown>('/reports/by-category', { params });
    return response.data;
  },

  // Get monthly report
  async getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
    const response = await api.get<MonthlyReport>('/reports/monthly', {
      params: { year, month },
    });
    return response.data;
  },

  // Submit contact form
  async submitContactForm(data: {
    name: string;
    email: string;
    phone?: string;
    message: string;
  }): Promise<{ success: boolean; message: string; submission_id?: number }> {
    const response = await api.post('/contact', data);
    return response.data;
  },

  // List clients/suppliers/customers
  async listClients(params?: {
    skip?: number;
    limit?: number;
    client_type?: string;
    search?: string;
  }): Promise<{
    clients: Array<{
      id: number;
      name: string;
      legal_name?: string;
      tax_id?: string;
      email?: string;
      phone?: string;
      address?: string;
      client_type: string;
      is_active: boolean;
      notes?: string;
      created_at: string;
      updated_at: string;
    }>;
    total: number;
  }> {
    const response = await api.get('/clients', { params });
    return response.data;
  },
};

export default apiClient;
