/**
 * Initial Balance & Org Settings API Client
 * Handles bank accounts, initial balances, company info, and bank lookup.
 */

import { api } from './api';

// =============================================================================
// TYPES
// =============================================================================

export interface BankAccount {
  id?: number;
  bank_code: string;
  bank_name: string;
  agency: string;
  account_number: string;
  account_type: string; // checking / savings / investment
  account_nickname?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BankAccountBalanceEntry {
  bank_account_id: number;
  balance: number;
}

export interface InitialBalanceData {
  id?: number;
  organization_id?: number;
  reference_date: string; // YYYY-MM-DD

  // Ativo Circulante
  cash_and_equivalents: number;
  short_term_investments: number;
  accounts_receivable: number;
  inventory: number;
  prepaid_expenses: number;

  // Ativo Não Circulante
  long_term_receivables: number;
  long_term_investments: number;

  // Imobilizado
  fixed_assets_land: number;
  fixed_assets_buildings: number;
  fixed_assets_machinery: number;
  fixed_assets_vehicles: number;
  fixed_assets_furniture: number;
  fixed_assets_computers: number;
  fixed_assets_other: number;
  accumulated_depreciation: number;

  // Intangível
  intangible_assets: number;
  accumulated_amortization: number;

  // Passivo Circulante
  suppliers_payable: number;
  short_term_loans: number;
  labor_obligations: number;
  tax_obligations: number;
  other_current_liabilities: number;

  // Passivo Não Circulante
  long_term_loans: number;
  long_term_financing: number;
  provisions_long_term: number;
  deferred_tax_liabilities: number;

  // Patrimônio Líquido (user input)
  reserves_and_adjustments: number;
  retained_earnings: number;

  // Bank account balances
  bank_account_balances?: BankAccountBalanceEntry[];

  // Metadata
  is_completed: boolean;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InitialBalanceStatus {
  has_initial_balance: boolean;
  is_completed: boolean;
  reference_date: string | null;
  initial_balance_id: number | null;
}

export interface BankInfo {
  ispb: string;
  name: string;
  code: number | null;
  full_name: string;
}

export interface CompanyInfo {
  id: number;
  company_name: string;
  cnpj: string;
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
  regime_tributario?: string;
  main_partner_name?: string;
}

export interface CompanyInfoUpdate {
  company_name?: string;
  trade_name?: string;
  company_address_street?: string;
  company_address_number?: string;
  company_address_complement?: string;
  company_address_district?: string;
  company_address_city?: string;
  company_address_state?: string;
  company_address_zip?: string;
  company_phone?: string;
  company_email?: string;
  regime_tributario?: string;
  capital_social?: number;
}

// =============================================================================
// INITIAL BALANCE API
// =============================================================================

export const initialBalanceApi = {
  /** Check if org has completed the initial balance questionnaire */
  async getStatus(): Promise<InitialBalanceStatus> {
    const response = await api.get('/initial-balance/status');
    return response.data;
  },

  /** Get the full initial balance data */
  async get(): Promise<InitialBalanceData | null> {
    const response = await api.get('/initial-balance');
    return response.data;
  },

  /** Save (create or update) initial balance */
  async save(data: Omit<InitialBalanceData, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'completed_at'>): Promise<InitialBalanceData> {
    const response = await api.post('/initial-balance', data);
    return response.data;
  },

  /** Update a specific initial balance record */
  async update(balanceId: number, data: Omit<InitialBalanceData, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'completed_at'>): Promise<InitialBalanceData> {
    const response = await api.put(`/initial-balance/${balanceId}`, data);
    return response.data;
  },
};

// =============================================================================
// ORG SETTINGS API
// =============================================================================

export const orgSettingsApi = {
  /** Get company info for active org */
  async getCompanyInfo(): Promise<CompanyInfo> {
    const response = await api.get('/org-settings/company');
    return response.data;
  },

  /** Update company info */
  async updateCompanyInfo(data: CompanyInfoUpdate): Promise<CompanyInfo> {
    const response = await api.put('/org-settings/company', data);
    return response.data;
  },

  /** List bank accounts */
  async listBankAccounts(): Promise<BankAccount[]> {
    const response = await api.get('/org-settings/bank-accounts');
    return response.data;
  },

  /** Add bank account */
  async addBankAccount(data: Omit<BankAccount, 'id' | 'is_active' | 'created_at' | 'updated_at'>): Promise<BankAccount> {
    const response = await api.post('/org-settings/bank-accounts', data);
    return response.data;
  },

  /** Update bank account */
  async updateBankAccount(id: number, data: Partial<BankAccount>): Promise<BankAccount> {
    const response = await api.put(`/org-settings/bank-accounts/${id}`, data);
    return response.data;
  },

  /** Delete (deactivate) bank account */
  async deleteBankAccount(id: number): Promise<void> {
    await api.delete(`/org-settings/bank-accounts/${id}`);
  },

  /** Lookup Brazilian banks via BrasilAPI */
  async lookupBanks(): Promise<BankInfo[]> {
    const response = await api.get('/org-settings/banks/lookup');
    return response.data;
  },

  /** Get org logo URL */
  async getLogo(): Promise<{ logo_url: string | null; has_logo: boolean }> {
    const response = await api.get('/org-settings/logo');
    return response.data;
  },

  /** Upload org logo (PNG/JPEG, max 2MB) */
  async uploadLogo(file: File): Promise<{ logo_url: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/org-settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** Delete org logo */
  async deleteLogo(): Promise<void> {
    await api.delete('/org-settings/logo');
  },
};

// =============================================================================
// HELPER: Create empty initial balance data
// =============================================================================

export function createEmptyInitialBalance(): Omit<InitialBalanceData, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'completed_at'> {
  const today = new Date().toISOString().split('T')[0];
  return {
    reference_date: today,
    cash_and_equivalents: 0,
    short_term_investments: 0,
    accounts_receivable: 0,
    inventory: 0,
    prepaid_expenses: 0,
    long_term_receivables: 0,
    long_term_investments: 0,
    fixed_assets_land: 0,
    fixed_assets_buildings: 0,
    fixed_assets_machinery: 0,
    fixed_assets_vehicles: 0,
    fixed_assets_furniture: 0,
    fixed_assets_computers: 0,
    fixed_assets_other: 0,
    accumulated_depreciation: 0,
    intangible_assets: 0,
    accumulated_amortization: 0,
    suppliers_payable: 0,
    short_term_loans: 0,
    labor_obligations: 0,
    tax_obligations: 0,
    other_current_liabilities: 0,
    long_term_loans: 0,
    long_term_financing: 0,
    provisions_long_term: 0,
    deferred_tax_liabilities: 0,
    reserves_and_adjustments: 0,
    retained_earnings: 0,
    bank_account_balances: [],
    is_completed: false,
  };
}
