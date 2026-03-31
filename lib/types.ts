/**
 * TypeScript types matching the FastAPI backend models
 */

export interface CompanyInfo {
  name?: string;
  legal_name?: string;
  tax_id?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: string;
  total_price?: string;
  product_code?: string;
}

export interface PaymentInfo {
  status: "paid" | "unpaid" | "partial" | "pending";
  method?: string;
  due_date?: string;
  payment_date?: string;
}

export interface FinancialDocument {
  document_type: "invoice" | "receipt" | "expense" | "statement" | "transaction_ledger" | "other";
  document_number?: string;
  issue_date?: string;
  transaction_type: "receita" | "despesa" | "custo" | "investimento" | "perda" | "income" | "expense";
  category?: string;
  issuer?: CompanyInfo;
  recipient?: CompanyInfo;
  line_items: LineItem[];
  transactions?: Transaction[];
  total_items?: number;
  subtotal?: string;
  tax_amount?: string;
  tax_rate?: number;
  discount?: string;
  total_amount: string;
  currency: string;
  payment_info?: PaymentInfo;
  is_cancellation?: boolean;
  original_document_number?: string;
  notes?: string;
  raw_text?: string;
  confidence_score?: number;
}

export interface Transaction {
  date?: string;
  description?: string;
  category?: string;
  amount: string;
  transaction_type: "receita" | "despesa" | "custo" | "investimento" | "perda" | "income" | "expense";
  counterparty?: string;
  reference?: string;
  account?: string;
  notes?: string;
}

export interface CategorySummary {
  category: string;
  total_amount: string;
  count: number;
  transaction_type: string;
  percentage?: number;
}

export interface DateRangeSummary {
  start_date?: string;
  end_date?: string;
  total_days?: number;
}

export interface TransactionLedger {
  document_type: "transaction_ledger";
  file_name: string;
  total_transactions: number;
  date_range: DateRangeSummary;
  total_income: string;
  total_expense: string;
  net_balance: string;
  currency: string;
  by_category: CategorySummary[];
  transactions: Transaction[];
  notes?: string;
  confidence_score?: number;
}

export interface DocumentRecord {
  id: number;
  file_name: string;
  file_type: string;
  file_size?: number;
  upload_date: string;
  status: "pending" | "processing" | "pending_validation" | "completed" | "failed" | "cancelled";
  error_message?: string;
  extracted_data?: FinancialDocument | TransactionLedger;
  processed_date?: string;
  client_id?: number;
  client_name?: string;
  client_type?: string;
  cnpj_mismatch?: boolean;
  cnpj_warning_message?: string;
  retry_count?: number;
  max_retries_exhausted?: boolean;
  last_retry_at?: string;
}

export interface LedgerTransactionsResponse {
  document_id: number;
  total: number;
  skip: number;
  limit: number;
  transactions: Transaction[];
  ledger_summary: {
    total_income: string;
    total_expense: string;
    net_balance: string;
    total_transactions: number;
    date_range?: DateRangeSummary;
  };
}

export interface DocumentListResponse {
  total: number;
  documents: DocumentRecord[];
}

export interface DocumentUploadResponse {
  id: number;
  file_name: string;
  status: string;
  message: string;
}

export interface Stats {
  total_documents: number;
  completed: number;
  failed: number;
  pending: number;
  processing: number;
}

export interface FinancialSummary {
  period: {
    date_from?: string;
    date_to?: string;
  };
  summary: {
    total_income: string;
    total_expense: string;
    net_balance: string;
    income_count: number;
    expense_count: number;
  };
  by_document_type: {
    invoice: number;
    receipt: number;
    expense: number;
    statement: number;
    other: number;
  };
  currency: string;
}

export interface CategoryBreakdown {
  period: {
    date_from?: string;
    date_to?: string;
  };
  filter: {
    transaction_type?: string;
  };
  categories: Array<{
    category: string;
    total_amount: string;
    count: number;
    transaction_type: string;
  }>;
  total_categories: number;
  currency: string;
}

export interface MonthlyReport {
  period: {
    year: number;
    month: number;
    date_from: string;
    date_to: string;
  };
  summary: {
    total_income: string;
    total_expense: string;
    net_balance: string;
    transaction_count: number;
  };
  transactions: Array<{
    document_id: number;
    date: string;
    document_type: string;
    transaction_type: string;
    category?: string;
    amount: string;
    issuer?: string;
    recipient?: string;
  }>;
  currency: string;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface ValidationResult {
  document_id: number;
  validation: {
    is_valid: boolean;
    error_count: number;
    warning_count: number;
    info_count: number;
    total_issues: number;
    errors: ValidationError[];
  };
}
