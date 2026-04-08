"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, FileSpreadsheet, Lock, Eye, Loader2, CalendarIcon } from "lucide-react";
import { InfoModal } from "@/components/ui/info-modal";
import { toast } from "sonner";
import { authTokens } from "@/lib/auth-api";
import { api } from "@/lib/api";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { DatePicker, MonthPicker, YearPicker } from "@/components/ui/date-picker";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

// DRE line item from /reports/dre endpoint
interface DRELine {
  code: string;
  description: string;
  amount: number;
  percentage_revenue: number | null;
  is_subtotal: boolean;
  is_total: boolean;
  level: number;
}

interface DREData {
  period_type: string;
  start_date: string;
  end_date: string;
  company_name: string | null;
  cnpj: string | null;
  detailed_lines: DRELine[];
  ratios: Record<string, number | null>;
  receita_bruta: number;
  lucro_liquido: number;
}

// Balance Sheet data (matches V2 API response)
interface BalanceSheetGroup {
  circulante: number;
  nao_circulante: number;
  imobilizado?: number;
  intangivel?: number;
  total: number;
}
interface BalanceSheetData {
  reference_date: string;
  company_name: string | null;
  cnpj: string | null;
  ativo: BalanceSheetGroup;
  passivo: BalanceSheetGroup;
  patrimonio_liquido: {
    total: number;
    capital_social?: number;
    reservas?: number;
    lucros_acumulados?: number;
  };
  is_balanced: boolean;
  balance_difference: number;
  detailed_lines?: Array<{
    code: string;
    description: string;
    amount: number;
    is_subtotal: boolean;
    is_total: boolean;
    level: number;
  }>;
}

// Cash Flow data from /reports/cash-flow endpoint
interface CashFlowSection {
  section_name: string;
  line_items: Record<string, number>;
  total: number;
}

interface CashFlowData {
  company_name: string | null;
  cnpj: string | null;
  period_type: string;
  start_date: string;
  end_date: string;
  method: string;
  operating_activities: CashFlowSection;
  investing_activities: CashFlowSection;
  financing_activities: CashFlowSection;
  net_cash_from_operations: number;
  net_cash_from_investments: number;
  net_cash_from_financing: number;
  net_increase_in_cash: number;
  cash_beginning: number;
  cash_ending: number;
}

// Detailed daily cash flow from /reports/cash-flow/detailed endpoint
interface DailyDREEntry {
  day: string;
  receita_bruta: number;
  total_deducoes: number;
  receita_liquida: number;
  total_custos_variaveis: number;
  margem_contribuicao: number;
  custos_fixos_administrativos: number;
  custos_fixos_comerciais: number;
  custos_fixos_producao: number;
  outras_despesas_fixas: number;
  total_custos_fixos: number;
  resultado_operacional: number;
  receitas_nao_operacionais: number;
  despesas_nao_operacionais: number;
  resultado_nao_operacional: number;
  resultado_liquido: number;
  resultado_acumulado: number;
}

interface CashFlowDetailedData {
  company_name: string | null;
  cnpj: string | null;
  start_date: string;
  end_date: string;
  period_type: string;
  bank_entries: Record<string, Array<{
    day: string;
    opening_balance: number;
    total_inflows: number;
    total_outflows: number;
    closing_balance: number;
  }>>;
  daily_dre: DailyDREEntry[];
  monthly_totals: Record<string, {
    receita_bruta: number;
    margem_contribuicao: number;
    resultado_operacional: number;
    resultado_liquido: number;
  }>;
  transactions?: Array<{
    date: string;
    description: string;
    category: string;
    amount: number;
    transaction_type: string;
  }>;
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

// Info descriptions for DRE lines (matched by normalized description)
const DRE_LINE_INFO: Record<string, string> = {
  "receita bruta": "Total das receitas geradas pelas vendas de produtos e serviços antes de qualquer dedução.",
  "receita bruta de vendas": "Total das receitas geradas pelas vendas de produtos e serviços antes de qualquer dedução.",
  "(-) deduções": "Impostos sobre vendas (ISS, ICMS, PIS, COFINS), devoluções e descontos concedidos sobre a receita bruta.",
  "deduções da receita": "Impostos sobre vendas (ISS, ICMS, PIS, COFINS), devoluções e descontos concedidos sobre a receita bruta.",
  "= receita líquida": "Receita Bruta menos todas as deduções. Representa o valor efetivamente recebido pela empresa.",
  "receita líquida": "Receita Bruta menos todas as deduções. Representa o valor efetivamente recebido pela empresa.",
  "(-) custos variáveis": "Custos diretamente relacionados à produção ou venda, que variam proporcionalmente com o volume (ex: CMV, CSP, comissões).",
  "custos variáveis": "Custos diretamente relacionados à produção ou venda, que variam proporcionalmente com o volume (ex: CMV, CSP, comissões).",
  "= margem de contribuição": "Receita Líquida menos Custos Variáveis. Indica quanto sobra para cobrir custos fixos e gerar lucro.",
  "margem de contribuição": "Receita Líquida menos Custos Variáveis. Indica quanto sobra para cobrir custos fixos e gerar lucro.",
  "(-) custos fixos": "Custos que não variam com o volume de vendas, como salários de produção, aluguel de fábrica e energia.",
  "(-) despesas fixas": "Despesas operacionais que não variam com as vendas, como salários administrativos, aluguel e softwares.",
  "(-) custos fixos e despesas fixas": "Somatório de custos e despesas que não variam com o volume de vendas.",
  "= ebitda": "Lucro antes de juros, impostos, depreciação e amortização. Mede a geração de caixa operacional da empresa.",
  "ebitda": "Lucro antes de juros, impostos, depreciação e amortização. Mede a geração de caixa operacional da empresa.",
  "(-) depreciação e amortização": "Redução contábil periódica do valor de ativos físicos (depreciação) e intangíveis (amortização).",
  "depreciação e amortização": "Redução contábil periódica do valor de ativos físicos (depreciação) e intangíveis (amortização).",
  "= resultado operacional": "Lucro gerado pelas operações da empresa após depreciação, antes do resultado financeiro e impostos. Também chamado de EBIT.",
  "resultado operacional": "Lucro gerado pelas operações da empresa após depreciação, antes do resultado financeiro e impostos. Também chamado de EBIT.",
  "= ebit": "Earnings Before Interest and Taxes — Lucro antes de juros e impostos. Mede o desempenho operacional.",
  "ebit": "Earnings Before Interest and Taxes — Lucro antes de juros e impostos. Mede o desempenho operacional.",
  "(+/-) resultado financeiro": "Diferença entre receitas financeiras (juros e aplicações recebidos) e despesas financeiras (juros pagos, tarifas bancárias).",
  "resultado financeiro": "Diferença entre receitas financeiras (juros e aplicações recebidos) e despesas financeiras (juros pagos, tarifas bancárias).",
  "= resultado antes dos impostos": "Lucro apurado antes da incidência de IRPJ e CSLL. Também chamado de LAIR.",
  "= lair": "Lucro Antes do Imposto de Renda — resultado apurado antes da incidência de IRPJ e CSLL.",
  "lair": "Lucro Antes do Imposto de Renda — resultado apurado antes da incidência de IRPJ e CSLL.",
  "(-) impostos sobre lucro": "IRPJ (Imposto de Renda Pessoa Jurídica) e CSLL (Contribuição Social sobre o Lucro Líquido) incidentes sobre o resultado.",
  "impostos sobre lucro": "IRPJ (Imposto de Renda Pessoa Jurídica) e CSLL (Contribuição Social sobre o Lucro Líquido) incidentes sobre o resultado.",
  "= lucro líquido": "Resultado final do período após todas as deduções. É o lucro que pertence aos sócios da empresa.",
  "lucro líquido": "Resultado final do período após todas as deduções. É o lucro que pertence aos sócios da empresa.",
  "= prejuízo líquido": "Resultado negativo do período — as despesas superaram as receitas.",
  "prejuízo líquido": "Resultado negativo do período — as despesas superaram as receitas.",
};

// Info descriptions for Balance Sheet sections
const BALANCE_SECTION_INFO: Record<string, string> = {
  "ativo circulante": "Bens e direitos que podem ser convertidos em dinheiro em até 12 meses (caixa, contas a receber, estoques).",
  "ativo não circulante": "Bens e direitos de longo prazo, realizáveis após 12 meses.",
  "imobilizado": "Bens físicos de uso permanente da empresa: máquinas, equipamentos, veículos, móveis e instalações.",
  "intangível": "Ativos sem forma física: marcas, patentes, softwares, licenças e fundo de comércio.",
  "total ativo": "Soma de todos os bens e direitos da empresa.",
  "passivo circulante": "Obrigações com vencimento em até 12 meses: fornecedores a pagar, salários, impostos e empréstimos de curto prazo.",
  "passivo não circulante": "Dívidas de longo prazo com vencimento superior a 12 meses: financiamentos e empréstimos de longo prazo.",
  "patrimônio líquido": "Diferença entre o total de ativos e passivos. Representa o valor líquido pertencente aos sócios.",
  "total passivo + pl": "Soma de todas as obrigações com o patrimônio líquido. Deve ser igual ao Total do Ativo.",
};

function DREInfoIcon({ description }: { description: string }) {
  const info = DRE_LINE_INFO[description.toLowerCase().trim()];
  if (!info) return null;
  return (
    <InfoModal title={description}>
      <p>{info}</p>
    </InfoModal>
  );
}

function BalanceInfoIcon({ label }: { label: string }) {
  const info = BALANCE_SECTION_INFO[label.toLowerCase().trim()];
  if (!info) return null;
  return (
    <InfoModal title={label}>
      <p>{info}</p>
    </InfoModal>
  );
}

function SaldoInicialHint({ description }: { description: string }) {
  if (!description.includes("(Saldo Inicial)")) return null;
  return (
    <span
      title="Você pode editar este valor em Empresa → Valores Iniciais"
      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-muted text-muted-foreground cursor-help flex-shrink-0 text-[9px] font-bold"
    >
      i
    </span>
  );
}

export default function AdvancedReports() {
  const { user } = useAuth();
  const { planFeatures } = useSubscription();
  const hasCashFlowAccess = planFeatures.cash_flow_direct === true;

  // User-configurable tab order (ensure indicadores is always present for users with old saved order)
  const savedOrder = (user?.report_tab_order || "dre,balanco,fluxo,indicadores").split(",") as string[];
  const tabOrder = savedOrder.includes("indicadores") ? savedOrder : [...savedOrder, "indicadores"];

  // Helper to get current month as YYYY-MM-01 (timezone-safe)
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  const getCurrentMonthInput = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // ===== UNIFIED DATE STATE (above all tabs) =====
  const [periodType, setPeriodType] = useState<string>("month");
  const [referenceDate, setReferenceDate] = useState<string>(getCurrentMonth());
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Cash flow method stays inside its tab
  const [cashFlowMethod, setCashFlowMethod] = useState<string>("indirect");

  // Loading states
  const [dreLoading, setDreLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [cashFlowLoading, setCashFlowLoading] = useState(false);
  const [allReportsLoading, setAllReportsLoading] = useState(false);

  // Indicators state
  const [indicatorsData, setIndicatorsData] = useState<any>(null);
  const [indicatorsLoading, setIndicatorsLoading] = useState(false);

  // Inline report display state
  const [dreData, setDreData] = useState<DREData | null>(null);
  const [drePrevData, setDrePrevData] = useState<DREData | null>(null);
  const [dreInlineLoading, setDreInlineLoading] = useState(false);
  const [balanceData, setBalanceData] = useState<BalanceSheetData | null>(null);
  const [balancePrevData, setBalancePrevData] = useState<BalanceSheetData | null>(null);
  const [balanceInlineLoading, setBalanceInlineLoading] = useState(false);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null);
  const [cashFlowInlineLoading, setCashFlowInlineLoading] = useState(false);
  const [cashFlowDetailedData, setCashFlowDetailedData] = useState<CashFlowDetailedData | null>(null);

  // Track if auto-load has run
  const autoLoaded = useRef(false);

  // Backward-compat aliases: reports use the unified date
  const drePeriodType = periodType;
  const dreReferenceDate = referenceDate;
  const dreStartDate = startDate;
  const dreEndDate = endDate;
  const cashFlowPeriodType = periodType;
  const cashFlowReferenceDate = referenceDate;
  const cashFlowStartDate = startDate;
  const cashFlowEndDate = endDate;
  const balanceDate = referenceDate ? referenceDate.slice(0, 7) : getCurrentMonthInput();
  const indicatorsDate = referenceDate ? referenceDate.slice(0, 7) : getCurrentMonthInput();

  // Export DRE
  const exportDRE = async (format: 'pdf' | 'excel' | 'csv') => {
    setDreLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('period_type', drePeriodType);

      if (drePeriodType === 'custom') {
        if (!dreStartDate || !dreEndDate) {
          toast.error('Informe as datas inicial e final para período customizado');
          setDreLoading(false);
          return;
        }
        params.append('start_date', dreStartDate);
        params.append('end_date', dreEndDate);
      } else if (dreReferenceDate) {
        params.append('reference_date', dreReferenceDate);
      }

      const endpoint = format === 'pdf'
        ? '/reports/dre/export/pdf'
        : format === 'excel'
        ? '/reports/dre/export/excel'
        : '/reports/dre/export/csv';

      const token = authTokens.getAccessToken();
      if (!token) {
        throw new Error('Não autenticado. Por favor, faça login novamente.');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao exportar DRE');
      }

      // Download file - use Content-Disposition filename from backend if available
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Build descriptive filename: DRE - Company - Period
      const company = user?.company_name || 'Empresa';
      const period = drePeriodType === 'custom'
        ? `${dreStartDate}_a_${dreEndDate}`
        : dreReferenceDate || new Date().toISOString().slice(0, 7);
      a.download = `DRE - ${company} - ${period}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`DRE exportado com sucesso em ${format.toUpperCase()}`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Erro ao exportar DRE');
    } finally {
      setDreLoading(false);
    }
  };

  // Export Balance Sheet
  const exportBalanceSheet = async (format: 'pdf' | 'excel' | 'csv') => {
    setBalanceLoading(true);
    try {
      const params = new URLSearchParams();
      if (balanceDate) {
        // balanceDate is YYYY-MM from month input; convert to YYYY-MM-01 for API
        params.append('reference_date', `${balanceDate}-01`);
      }

      const endpoint = format === 'pdf'
        ? '/reports/balance-sheet/export/pdf'
        : format === 'excel'
        ? '/reports/balance-sheet/export/excel'
        : '/reports/balance-sheet/export/csv';

      const token = authTokens.getAccessToken();
      if (!token) {
        throw new Error('Não autenticado. Por favor, faça login novamente.');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao exportar Balanço Gerencial');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const company = user?.company_name || 'Empresa';
      const period = balanceDate || new Date().toISOString().slice(0, 7);
      a.download = `Balanço Gerencial - ${company} - ${period}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Balanço Gerencial exportado com sucesso em ${format.toUpperCase()}`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Erro ao exportar Balanço Gerencial');
    } finally {
      setBalanceLoading(false);
    }
  };

  // Export Cash Flow
  const exportCashFlow = async (format: 'pdf' | 'excel' | 'csv') => {
    setCashFlowLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('period_type', cashFlowPeriodType);
      params.append('method', cashFlowMethod);

      if (cashFlowPeriodType === 'custom') {
        if (!cashFlowStartDate || !cashFlowEndDate) {
          toast.error('Informe as datas inicial e final para período customizado');
          setCashFlowLoading(false);
          return;
        }
        params.append('start_date', cashFlowStartDate);
        params.append('end_date', cashFlowEndDate);
      } else if (cashFlowReferenceDate) {
        params.append('reference_date', cashFlowReferenceDate);
      }

      const endpoint = format === 'pdf'
        ? '/reports/cash-flow/export/pdf'
        : format === 'excel'
        ? '/reports/cash-flow/export/excel'
        : '/reports/cash-flow/export/csv';

      const token = authTokens.getAccessToken();
      if (!token) {
        throw new Error('Não autenticado. Por favor, faça login novamente.');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao exportar Fluxo de Caixa');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const company = user?.company_name || 'Empresa';
      const period = cashFlowPeriodType === 'custom'
        ? `${cashFlowStartDate}_a_${cashFlowEndDate}`
        : cashFlowReferenceDate || new Date().toISOString().slice(0, 7);
      a.download = `Fluxo de Caixa - ${company} - ${period}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Fluxo de Caixa exportado com sucesso em ${format.toUpperCase()}`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Erro ao exportar Fluxo de Caixa');
    } finally {
      setCashFlowLoading(false);
    }
  };

  // Compute previous period reference date for comparison
  const getPreviousPeriodParams = (periodType: string, refDate: string, startDate: string, endDate: string): URLSearchParams | null => {
    const prevParams = new URLSearchParams();
    prevParams.append('period_type', periodType);

    if (periodType === 'custom') {
      // For custom, shift back by the same duration
      const start = new Date(startDate + 'T12:00:00');
      const end = new Date(endDate + 'T12:00:00');
      const durationMs = end.getTime() - start.getTime();
      const prevEnd = new Date(start.getTime() - 86400000); // day before start
      const prevStart = new Date(prevEnd.getTime() - durationMs);
      prevParams.append('start_date', prevStart.toISOString().slice(0, 10));
      prevParams.append('end_date', prevEnd.toISOString().slice(0, 10));
    } else if (periodType === 'month') {
      const d = new Date(refDate + 'T12:00:00');
      d.setMonth(d.getMonth() - 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      prevParams.append('reference_date', `${y}-${m}-01`);
    } else if (periodType === 'year') {
      const year = parseInt(refDate.slice(0, 4)) - 1;
      prevParams.append('reference_date', `${year}-01-01`);
    } else if (periodType === 'week') {
      const d = new Date(refDate + 'T12:00:00');
      d.setDate(d.getDate() - 7);
      prevParams.append('reference_date', d.toISOString().slice(0, 10));
    } else if (periodType === 'day') {
      const d = new Date(refDate + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      prevParams.append('reference_date', d.toISOString().slice(0, 10));
    }
    return prevParams;
  };

  // Load DRE inline (current + previous period)
  const loadDREInline = async () => {
    setDreInlineLoading(true);
    setDrePrevData(null);
    try {
      const params = new URLSearchParams();
      params.append('period_type', drePeriodType);
      if (drePeriodType === 'custom') {
        if (!dreStartDate || !dreEndDate) {
          toast.error('Informe as datas inicial e final');
          setDreInlineLoading(false);
          return;
        }
        params.append('start_date', dreStartDate);
        params.append('end_date', dreEndDate);
      } else if (dreReferenceDate) {
        params.append('reference_date', dreReferenceDate);
      }

      // Fetch current period
      const res = await api.get(`/reports/dre?${params.toString()}`);
      setDreData(res.data);

      // Fetch previous period for comparison (non-blocking)
      const refForPrev = dreReferenceDate || getCurrentMonth();
      const prevParams = getPreviousPeriodParams(drePeriodType, refForPrev, dreStartDate, dreEndDate);
      if (prevParams) {
        api.get(`/reports/dre?${prevParams.toString()}`)
          .then((prevRes: any) => setDrePrevData(prevRes.data))
          .catch(() => setDrePrevData(null));
      }
    } catch (error: any) {
      console.error('Error loading DRE:', error);
      toast.error(error.response?.data?.detail || 'Erro ao carregar DRE');
    } finally {
      setDreInlineLoading(false);
    }
  };

  // Load Balance Sheet inline (current + previous month)
  const loadBalanceInline = async () => {
    setBalanceInlineLoading(true);
    setBalancePrevData(null);
    try {
      const params = new URLSearchParams();
      const effectiveDate = balanceDate || getCurrentMonthInput();
      params.append('reference_date', `${effectiveDate}-01`);

      const res = await api.get(`/reports/balance-sheet?${params.toString()}`);
      setBalanceData(res.data);

      // Fetch previous month for comparison (non-blocking)
      const d = new Date(`${effectiveDate}-01T12:00:00`);
      d.setMonth(d.getMonth() - 1);
      const prevY = d.getFullYear();
      const prevM = String(d.getMonth() + 1).padStart(2, '0');
      const prevParams = new URLSearchParams();
      prevParams.append('reference_date', `${prevY}-${prevM}-01`);
      api.get(`/reports/balance-sheet?${prevParams.toString()}`)
        .then((prevRes: any) => setBalancePrevData(prevRes.data))
        .catch(() => setBalancePrevData(null));
    } catch (error: any) {
      console.error('Error loading balance sheet:', error);
      toast.error(error.response?.data?.detail || 'Erro ao carregar Balanço');
    } finally {
      setBalanceInlineLoading(false);
    }
  };

  // Load Cash Flow inline
  const loadCashFlowInline = async () => {
    setCashFlowInlineLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('period_type', cashFlowPeriodType);
      params.append('method', hasCashFlowAccess ? cashFlowMethod : 'indirect');
      if (cashFlowPeriodType === 'custom') {
        if (!cashFlowStartDate || !cashFlowEndDate) {
          toast.error('Informe as datas inicial e final');
          setCashFlowInlineLoading(false);
          return;
        }
        params.append('start_date', cashFlowStartDate);
        params.append('end_date', cashFlowEndDate);
      } else if (cashFlowReferenceDate) {
        params.append('reference_date', cashFlowReferenceDate);
      }
      const res = await api.get(`/reports/cash-flow?${params.toString()}`);
      setCashFlowData(res.data);

      // Also fetch detailed daily cash flow (non-blocking)
      const detailParams = new URLSearchParams(params);
      // Remove method param — detailed endpoint doesn't use it
      detailParams.delete('method');
      api.get(`/reports/cash-flow/detailed?${detailParams.toString()}`)
        .then((detailRes: any) => setCashFlowDetailedData(detailRes.data))
        .catch(() => setCashFlowDetailedData(null));
    } catch (error: any) {
      console.error('Error loading cash flow:', error);
      toast.error(error.response?.data?.detail || 'Erro ao carregar Fluxo de Caixa');
    } finally {
      setCashFlowInlineLoading(false);
    }
  };

  // Load Financial Indicators (now uses unified period)
  const loadIndicators = async () => {
    setIndicatorsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('period_type', periodType);
      if (periodType === 'custom') {
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
      } else if (referenceDate) {
        params.append('reference_date', referenceDate);
      }
      const res = await api.get(`/reports/indicators?${params.toString()}`);
      setIndicatorsData(res.data);
    } catch (error: any) {
      console.error('Error loading indicators:', error);
      toast.error(error.response?.data?.detail || 'Erro ao carregar indicadores');
    } finally {
      setIndicatorsLoading(false);
    }
  };

  // Load ALL reports at once (unified date picker action)
  const loadAllReports = async () => {
    setAllReportsLoading(true);
    try {
      await Promise.all([
        loadDREInline(),
        loadBalanceInline(),
        loadCashFlowInline(),
        loadIndicators(),
      ]);
    } finally {
      setAllReportsLoading(false);
    }
  };

  // Helper to render a cash flow section
  const renderCashFlowSection = (section: CashFlowSection, colorClass: string) => {
    const items = Object.entries(section.line_items).filter(([, v]) => v !== 0);
    if (items.length === 0 && section.total === 0) return null;
    return (
      <div className="mb-6">
        <h4 className={`text-base font-semibold ${colorClass} mb-2`}>{section.section_name}</h4>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {items.map(([label, value], i) => (
                <tr key={i} className="hover:bg-accent/30">
                  <td className="px-4 py-2 text-foreground pl-8">{label}</td>
                  <td className={`px-4 py-2 text-right tabular-nums w-40 ${value < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                    {formatBRL(value)}
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/30 font-semibold">
                <td className="px-4 py-2 text-foreground">Total {section.section_name}</td>
                <td className={`px-4 py-2 text-right tabular-nums w-40 ${section.total < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                  {formatBRL(section.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Auto-load all reports on mount
  useEffect(() => {
    if (autoLoaded.current) return;
    autoLoaded.current = true;
    loadAllReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* Header + Unified Date Picker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">📊 Relatórios Gerenciais</CardTitle>
          <CardDescription className="text-lg mt-2">
            Selecione o período e visualize todos os relatórios financeiros
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Period Type Selector */}
          <div>
            <label className="block text-base font-semibold text-foreground mb-3">Tipo de Período</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { value: 'day', label: '📅 Dia' },
                { value: 'week', label: '📆 Semana' },
                { value: 'month', label: '🗓️ Mês' },
                { value: 'year', label: '📊 Ano' },
                { value: 'custom', label: '🔧 Customizado' },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={periodType === option.value ? "default" : "outline"}
                  onClick={() => setPeriodType(option.value)}
                  className="text-base px-4 py-6 h-auto"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Conditional Date Inputs */}
          {periodType === 'custom' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Data Inicial</label>
                <DatePicker
                  value={startDate ? new Date(startDate + 'T12:00:00') : undefined}
                  onChange={(d) => setStartDate(d ? format(d, 'yyyy-MM-dd') : '')}
                  placeholder="Selecione a data inicial"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Data Final</label>
                <DatePicker
                  value={endDate ? new Date(endDate + 'T12:00:00') : undefined}
                  onChange={(d) => setEndDate(d ? format(d, 'yyyy-MM-dd') : '')}
                  placeholder="Selecione a data final"
                />
              </div>
            </div>
          ) : periodType === 'month' ? (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Selecione o Mês/Ano
              </label>
              <MonthPicker
                value={referenceDate ? referenceDate.slice(0, 7) : getCurrentMonthInput()}
                onChange={(v) => setReferenceDate(v ? `${v}-01` : getCurrentMonth())}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Todos os relatórios serão gerados para o mês selecionado
              </p>
            </div>
          ) : periodType === 'year' ? (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Selecione o Ano
              </label>
              <YearPicker
                value={referenceDate ? referenceDate.slice(0, 4) : String(new Date().getFullYear())}
                onChange={(v) => setReferenceDate(`${v}-01-01`)}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Todos os relatórios serão gerados para o ano selecionado
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                {periodType === 'week' ? 'Selecione qualquer dia da semana desejada' : 'Selecione o dia'}
              </label>
              <DatePicker
                value={referenceDate ? new Date(referenceDate + 'T12:00:00') : new Date()}
                onChange={(d) => setReferenceDate(d ? format(d, 'yyyy-MM-dd') : getCurrentMonth())}
                placeholder={periodType === 'week' ? 'Dia da semana desejada' : 'Selecione o dia'}
              />
              <p className="text-sm text-muted-foreground mt-2">
                {periodType === 'week' && 'Relatórios da semana (segunda a domingo) que contém esta data'}
                {periodType === 'day' && 'Relatórios deste dia específico'}
              </p>
            </div>
          )}

          {/* Unified Visualizar Button */}
          <div className="border-t pt-6">
            <Button
              onClick={loadAllReports}
              disabled={allReportsLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-6 h-auto w-full md:w-auto"
            >
              {allReportsLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Eye className="w-5 h-5 mr-2" />}
              {allReportsLoading ? 'Carregando todos os relatórios...' : 'Visualizar Relatórios'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={
        tabOrder[0] === "balanco" ? "balance" :
        tabOrder[0] === "fluxo" ? "cashflow" :
        tabOrder[0] === "indicadores" ? "indicators" : "dre"
      } className="space-y-6">
        <TabsList className="w-full p-3 h-auto bg-muted/50 border-2 border-border rounded-lg flex flex-col sm:flex-row gap-3">
          {tabOrder.map((tab) => {
            const triggerClass = "flex-1 text-lg px-6 py-6 font-bold gap-2.5 w-full rounded-md border-2 border-transparent data-[state=active]:border-[#0d767b] data-[state=active]:bg-[#0d767b]/10 dark:data-[state=active]:border-[#f86a15] dark:data-[state=active]:bg-[#f86a15]/10 data-[state=active]:shadow-md hover:bg-accent/80 transition-all";
            if (tab === "dre") return (
              <TabsTrigger key="dre" value="dre" className={triggerClass}>
                📈 DRE
                <InfoModal title="O que é a DRE?" iconSize="w-3.5 h-3.5">
                  <p>A <strong>Demonstração do Resultado do Exercício (DRE)</strong> mostra o desempenho financeiro da empresa em um período.</p>
                  <p>Ela apresenta a sequência: <strong>Receitas → Deduções → Custos → Despesas → Resultado Líquido</strong>, seguindo as normas CPC/IFRS brasileiras.</p>
                  <p>Use para entender se a empresa está tendo lucro ou prejuízo e identificar onde estão os maiores gastos.</p>
                </InfoModal>
              </TabsTrigger>
            );
            if (tab === "balanco") return (
              <TabsTrigger key="balance" value="balance" className={triggerClass}>
                ⚖️ Balanço Gerencial
                <InfoModal title="O que é o Balanço Gerencial?" iconSize="w-3.5 h-3.5">
                  <p>O <strong>Balanço Gerencial</strong> é uma fotografia da posição financeira da empresa em uma data específica.</p>
                  <p>Ele segue a equação fundamental: <strong>Ativos = Passivos + Patrimônio Líquido</strong>.</p>
                  <p>Mostra o que a empresa possui (ativos), o que deve (passivos) e o capital dos sócios (patrimônio líquido).</p>
                </InfoModal>
              </TabsTrigger>
            );
            if (tab === "fluxo") return (
              <TabsTrigger key="cashflow" value="cashflow" className={triggerClass}>
                💰 Fluxo de Caixa
                <InfoModal title="O que é o Fluxo de Caixa?" iconSize="w-3.5 h-3.5">
                  <p>A <strong>Demonstração do Fluxo de Caixa (DFC)</strong> mostra as entradas e saídas reais de dinheiro da empresa.</p>
                  <p>Divide-se em três atividades: <strong>Operacionais</strong> (dia a dia), <strong>Investimentos</strong> (compra/venda de ativos) e <strong>Financiamentos</strong> (empréstimos, capital).</p>
                  <p>O <strong>método direto</strong> lista pagamentos e recebimentos reais. O <strong>método indireto</strong> parte do lucro líquido e ajusta por itens não-caixa.</p>
                </InfoModal>
              </TabsTrigger>
            );
            if (tab === "indicadores") return (
              <TabsTrigger key="indicators" value="indicators" className={triggerClass}>
                📊 Indicadores
                <InfoModal title="O que são Indicadores Financeiros?" iconSize="w-3.5 h-3.5">
                  <p>Os <strong>Indicadores Financeiros</strong> são métricas calculadas a partir da DRE e do Balanço.</p>
                  <p>Incluem: <strong>Margens</strong> (bruta, EBITDA, líquida), <strong>Liquidez</strong> (corrente, seca), <strong>Endividamento</strong> e <strong>Rentabilidade</strong> (ROE, ROA).</p>
                  <p>Ajudam a avaliar rapidamente a saúde financeira da empresa.</p>
                </InfoModal>
              </TabsTrigger>
            );
            return null;
          })}
        </TabsList>

        {/* DRE Tab */}
        <TabsContent value="dre" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Demonstração do Resultado do Exercício (DRE)</CardTitle>
              <CardDescription className="text-base mt-2">
                Relatório de desempenho financeiro seguindo as normas contábeis brasileiras
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export Buttons */}
              <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => exportDRE('excel')}
                    disabled={dreLoading}
                    className="bg-green-600 hover:bg-green-700 text-white text-base px-6 py-6 h-auto"
                  >
                    <FileSpreadsheet className="w-5 h-5 mr-2" />
                    {dreLoading ? 'Gerando...' : 'Baixar XLSX'}
                  </Button>
                  <Button
                    onClick={() => exportDRE('pdf')}
                    disabled={dreLoading}
                    variant="outline"
                    className="text-base px-6 py-6 h-auto"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    {dreLoading ? 'Gerando...' : 'Baixar PDF'}
                  </Button>
              </div>

              {/* Inline DRE Table */}
              {dreData && (() => {
                // Build a lookup from previous period by line code
                const prevByCode: Record<string, DRELine> = {};
                if (drePrevData) {
                  for (const pl of drePrevData.detailed_lines) {
                    prevByCode[pl.code] = pl;
                  }
                }
                const prevLabel = drePrevData
                  ? `${new Date(drePrevData.start_date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`
                  : null;
                const currLabel = `${new Date(dreData.start_date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`;

                return (
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">
                      DRE — {new Date(dreData.start_date + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(dreData.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </h3>
                    {dreData.company_name && (
                      <span className="text-sm text-muted-foreground">{dreData.company_name}</span>
                    )}
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left px-4 py-3 font-semibold text-foreground">Descrição</th>
                          <th className="text-right px-4 py-3 font-semibold text-foreground w-36">
                            {currLabel}
                          </th>
                          <th className="text-right px-4 py-3 font-semibold text-foreground w-20">AV%</th>
                          {drePrevData && (
                            <>
                              <th className="text-right px-4 py-3 font-semibold text-muted-foreground w-36 border-l border-border">
                                {prevLabel}
                              </th>
                              <th className="text-right px-4 py-3 font-semibold text-muted-foreground w-20">AV%</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {dreData.detailed_lines.map((line, i) => {
                          const prev = prevByCode[line.code];
                          return (
                          <tr
                            key={i}
                            className={
                              line.is_total
                                ? "bg-blue-500/10 font-bold text-foreground"
                                : line.is_subtotal
                                ? "bg-muted/30 font-semibold text-foreground"
                                : "text-foreground hover:bg-accent/30"
                            }
                          >
                            <td
                              className="px-4 py-2"
                              style={{ paddingLeft: `${16 + line.level * 20}px` }}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                {line.description}
                                <DREInfoIcon description={line.description} />
                              </span>
                            </td>
                            <td className={`px-4 py-2 text-right tabular-nums ${line.amount < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                              {formatBRL(line.amount)}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                              {line.percentage_revenue != null
                                ? (Math.abs(line.percentage_revenue) > 999
                                  ? `${line.percentage_revenue > 0 ? '>' : '<-'}999%`
                                  : `${line.percentage_revenue.toFixed(1)}%`)
                                : ""}
                            </td>
                            {drePrevData && (
                              <>
                                <td className={`px-4 py-2 text-right tabular-nums border-l border-border ${prev && prev.amount < 0 ? "text-red-600/70 dark:text-red-400/70" : "text-muted-foreground"}`}>
                                  {prev ? formatBRL(prev.amount) : "—"}
                                </td>
                                <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                                  {prev?.percentage_revenue != null
                                    ? (Math.abs(prev.percentage_revenue) > 999
                                      ? `${prev.percentage_revenue > 0 ? '>' : '<-'}999%`
                                      : `${prev.percentage_revenue.toFixed(1)}%`)
                                    : ""}
                                </td>
                              </>
                            )}
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet Tab */}
        <TabsContent value="balance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Balanço Gerencial</CardTitle>
              <CardDescription className="text-base mt-2">
                Demonstração da posição financeira (Ativos, Passivos e Patrimônio Líquido)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export Buttons */}
              <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => exportBalanceSheet('excel')}
                    disabled={balanceLoading}
                    className="bg-green-600 hover:bg-green-700 text-white text-base px-6 py-6 h-auto"
                  >
                    <FileSpreadsheet className="w-5 h-5 mr-2" />
                    {balanceLoading ? 'Gerando...' : 'Baixar XLSX'}
                  </Button>
                  <Button
                    onClick={() => exportBalanceSheet('pdf')}
                    disabled={balanceLoading}
                    variant="outline"
                    className="text-base px-6 py-6 h-auto"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    {balanceLoading ? 'Gerando...' : 'Baixar PDF'}
                  </Button>
              </div>

              {/* Inline Balance Sheet — Side-by-side template layout */}
              {balanceData && (() => {
                const hasPrev = !!balancePrevData;
                const currLabel = new Date(balanceData.reference_date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
                const prevLabel = hasPrev ? new Date(balancePrevData!.reference_date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '';
                // Build lookup for prev detailed lines by code
                const prevLineByCode: Record<string, number> = {};
                if (hasPrev && balancePrevData!.detailed_lines) {
                  for (const l of balancePrevData!.detailed_lines) {
                    prevLineByCode[l.code] = l.amount;
                  }
                }
                const prevCell = (amount: number | undefined, isHeader?: boolean) => {
                  if (!hasPrev) return null;
                  const val = amount ?? 0;
                  return (
                    <td className={`px-4 ${isHeader ? 'py-2' : 'py-1.5'} text-right tabular-nums border-l border-border/30 ${isHeader ? 'font-bold' : ''} ${val < 0 ? "text-red-600/70 dark:text-red-400/70" : "text-muted-foreground"}`}>
                      {formatBRL(val)}
                    </td>
                  );
                };
                const prevLineAmount = (code: string) => prevLineByCode[code];

                return (
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">
                      Balanço Gerencial — {new Date(balanceData.reference_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </h3>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-green-500/10 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm font-medium text-muted-foreground">Ativos</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatBRL(balanceData.ativo?.total || 0)}</p>
                      {hasPrev && <p className="text-xs text-muted-foreground mt-1">{prevLabel}: {formatBRL(balancePrevData!.ativo?.total || 0)}</p>}
                    </div>
                    <div className="p-4 bg-red-500/10 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-sm font-medium text-muted-foreground">Passivos</p>
                      <p className="text-2xl font-bold text-red-700 dark:text-red-400">{formatBRL(balanceData.passivo?.total || 0)}</p>
                      {hasPrev && <p className="text-xs text-muted-foreground mt-1">{prevLabel}: {formatBRL(balancePrevData!.passivo?.total || 0)}</p>}
                    </div>
                    <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm font-medium text-muted-foreground">Patrimônio Líquido</p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{formatBRL(balanceData.patrimonio_liquido?.total || 0)}</p>
                      {hasPrev && <p className="text-xs text-muted-foreground mt-1">{prevLabel}: {formatBRL(balancePrevData!.patrimonio_liquido?.total || 0)}</p>}
                    </div>
                  </div>

                  {/* Two-column Balance Sheet */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* ========== LEFT: ATIVO ========== */}
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left px-4 py-3 font-bold text-foreground">ATIVO</th>
                            <th className="text-right px-4 py-3 font-bold text-foreground w-32">{currLabel}</th>
                            {hasPrev && <th className="text-right px-4 py-3 font-bold text-muted-foreground w-32 border-l border-border/30">{prevLabel}</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {/* Ativo Circulante */}
                          <tr className="bg-green-800 text-white">
                            <td className="px-4 py-2 font-bold text-sm"><span className="inline-flex items-center gap-1.5">Ativo Circulante<BalanceInfoIcon label="Ativo Circulante" /></span></td>
                            <td className="px-4 py-2 text-right tabular-nums font-bold">{formatBRL(balanceData.ativo?.circulante || 0)}</td>
                            {hasPrev && <td className="px-4 py-2 text-right tabular-nums font-bold border-l border-white/20">{formatBRL(balancePrevData!.ativo?.circulante || 0)}</td>}
                          </tr>
                          {balanceData.detailed_lines?.filter(l => l.code.startsWith('1.01')).map((line, i) => (
                            <tr key={`ac-${i}`} className="border-b border-border/50 hover:bg-accent/30">
                              <td className="px-4 py-1.5 text-foreground" style={{ paddingLeft: '28px' }}><span className="inline-flex items-center gap-1.5">{line.description}<SaldoInicialHint description={line.description} /></span></td>
                              <td className={`px-4 py-1.5 text-right tabular-nums ${line.amount < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                                {formatBRL(line.amount)}
                              </td>
                              {prevCell(prevLineAmount(line.code))}
                            </tr>
                          ))}

                          {/* Ativo Não Circulante */}
                          <tr className="bg-green-800 text-white">
                            <td className="px-4 py-2 font-bold text-sm"><span className="inline-flex items-center gap-1.5">Ativo Não Circulante<BalanceInfoIcon label="Ativo Não Circulante" /></span></td>
                            <td className="px-4 py-2 text-right tabular-nums font-bold">{formatBRL(balanceData.ativo?.nao_circulante || 0)}</td>
                            {hasPrev && <td className="px-4 py-2 text-right tabular-nums font-bold border-l border-white/20">{formatBRL(balancePrevData!.ativo?.nao_circulante || 0)}</td>}
                          </tr>
                          {balanceData.detailed_lines?.filter(l => l.code.startsWith('1.02.0') && !l.code.startsWith('1.02.02') && !l.code.startsWith('1.02.03')).map((line, i) => (
                            <tr key={`anc-${i}`} className="border-b border-border/50 hover:bg-accent/30">
                              <td className="px-4 py-1.5 text-foreground" style={{ paddingLeft: '28px' }}><span className="inline-flex items-center gap-1.5">{line.description}<SaldoInicialHint description={line.description} /></span></td>
                              <td className={`px-4 py-1.5 text-right tabular-nums ${line.amount < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                                {formatBRL(line.amount)}
                              </td>
                              {prevCell(prevLineAmount(line.code))}
                            </tr>
                          ))}

                          {/* Imobilizado */}
                          <tr className="bg-green-800 text-white">
                            <td className="px-4 py-2 font-bold text-sm"><span className="inline-flex items-center gap-1.5">Imobilizado<BalanceInfoIcon label="Imobilizado" /></span></td>
                            <td className="px-4 py-2 text-right tabular-nums font-bold">{formatBRL(balanceData.ativo?.imobilizado || 0)}</td>
                            {hasPrev && <td className="px-4 py-2 text-right tabular-nums font-bold border-l border-white/20">{formatBRL(balancePrevData!.ativo?.imobilizado || 0)}</td>}
                          </tr>
                          {balanceData.detailed_lines?.filter(l => l.code.startsWith('1.02.02')).map((line, i) => (
                            <tr key={`imob-${i}`} className="border-b border-border/50 hover:bg-accent/30">
                              <td className="px-4 py-1.5 text-foreground" style={{ paddingLeft: '28px' }}><span className="inline-flex items-center gap-1.5">{line.description}<SaldoInicialHint description={line.description} /></span></td>
                              <td className={`px-4 py-1.5 text-right tabular-nums ${line.amount < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                                {formatBRL(line.amount)}
                              </td>
                              {prevCell(prevLineAmount(line.code))}
                            </tr>
                          ))}

                          {/* Intangível */}
                          <tr className="bg-green-800 text-white">
                            <td className="px-4 py-2 font-bold text-sm"><span className="inline-flex items-center gap-1.5">Intangível<BalanceInfoIcon label="Intangível" /></span></td>
                            <td className="px-4 py-2 text-right tabular-nums font-bold">{formatBRL(balanceData.ativo?.intangivel || 0)}</td>
                            {hasPrev && <td className="px-4 py-2 text-right tabular-nums font-bold border-l border-white/20">{formatBRL(balancePrevData!.ativo?.intangivel || 0)}</td>}
                          </tr>
                          {balanceData.detailed_lines?.filter(l => l.code.startsWith('1.02.03')).map((line, i) => (
                            <tr key={`intg-${i}`} className="border-b border-border/50 hover:bg-accent/30">
                              <td className="px-4 py-1.5 text-foreground" style={{ paddingLeft: '28px' }}><span className="inline-flex items-center gap-1.5">{line.description}<SaldoInicialHint description={line.description} /></span></td>
                              <td className={`px-4 py-1.5 text-right tabular-nums ${line.amount < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                                {formatBRL(line.amount)}
                              </td>
                              {prevCell(prevLineAmount(line.code))}
                            </tr>
                          ))}

                          {/* TOTAL ATIVO */}
                          <tr className="bg-green-900 text-white font-bold">
                            <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1.5">TOTAL ATIVO<BalanceInfoIcon label="Total Ativo" /></span></td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{formatBRL(balanceData.ativo?.total || 0)}</td>
                            {hasPrev && <td className="px-4 py-2.5 text-right tabular-nums border-l border-white/20">{formatBRL(balancePrevData!.ativo?.total || 0)}</td>}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* ========== RIGHT: PASSIVO + PL ========== */}
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left px-4 py-3 font-bold text-foreground">PASSIVO + PL</th>
                            <th className="text-right px-4 py-3 font-bold text-foreground w-32">{currLabel}</th>
                            {hasPrev && <th className="text-right px-4 py-3 font-bold text-muted-foreground w-32 border-l border-border/30">{prevLabel}</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {/* Passivo Circulante */}
                          <tr className="bg-green-800 text-white">
                            <td className="px-4 py-2 font-bold text-sm"><span className="inline-flex items-center gap-1.5">Passivo Circulante<BalanceInfoIcon label="Passivo Circulante" /></span></td>
                            <td className="px-4 py-2 text-right tabular-nums font-bold">{formatBRL(balanceData.passivo?.circulante || 0)}</td>
                            {hasPrev && <td className="px-4 py-2 text-right tabular-nums font-bold border-l border-white/20">{formatBRL(balancePrevData!.passivo?.circulante || 0)}</td>}
                          </tr>
                          {balanceData.detailed_lines?.filter(l => l.code.startsWith('2.01')).map((line, i) => (
                            <tr key={`pc-${i}`} className="border-b border-border/50 hover:bg-accent/30">
                              <td className="px-4 py-1.5 text-foreground" style={{ paddingLeft: '28px' }}><span className="inline-flex items-center gap-1.5">{line.description}<SaldoInicialHint description={line.description} /></span></td>
                              <td className={`px-4 py-1.5 text-right tabular-nums ${line.amount < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                                {formatBRL(line.amount)}
                              </td>
                              {prevCell(prevLineAmount(line.code))}
                            </tr>
                          ))}

                          {/* Passivo Não Circulante */}
                          <tr className="bg-green-800 text-white">
                            <td className="px-4 py-2 font-bold text-sm"><span className="inline-flex items-center gap-1.5">Passivo Não Circulante<BalanceInfoIcon label="Passivo Não Circulante" /></span></td>
                            <td className="px-4 py-2 text-right tabular-nums font-bold">{formatBRL(balanceData.passivo?.nao_circulante || 0)}</td>
                            {hasPrev && <td className="px-4 py-2 text-right tabular-nums font-bold border-l border-white/20">{formatBRL(balancePrevData!.passivo?.nao_circulante || 0)}</td>}
                          </tr>
                          {balanceData.detailed_lines?.filter(l => l.code.startsWith('2.02')).map((line, i) => (
                            <tr key={`pnc-${i}`} className="border-b border-border/50 hover:bg-accent/30">
                              <td className="px-4 py-1.5 text-foreground" style={{ paddingLeft: '28px' }}><span className="inline-flex items-center gap-1.5">{line.description}<SaldoInicialHint description={line.description} /></span></td>
                              <td className={`px-4 py-1.5 text-right tabular-nums ${line.amount < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                                {formatBRL(line.amount)}
                              </td>
                              {prevCell(prevLineAmount(line.code))}
                            </tr>
                          ))}

                          {/* Patrimônio Líquido */}
                          <tr className="bg-green-800 text-white">
                            <td className="px-4 py-2 font-bold text-sm"><span className="inline-flex items-center gap-1.5">Patrimônio Líquido<BalanceInfoIcon label="Patrimônio Líquido" /></span></td>
                            <td className={`px-4 py-2 text-right tabular-nums font-bold`}>
                              {formatBRL(balanceData.patrimonio_liquido?.total || 0)}
                            </td>
                            {hasPrev && <td className="px-4 py-2 text-right tabular-nums font-bold border-l border-white/20">{formatBRL(balancePrevData!.patrimonio_liquido?.total || 0)}</td>}
                          </tr>
                          {/* Use detailed_lines when available, fallback to breakdown fields */}
                          {(balanceData.detailed_lines?.filter(l => l.code.startsWith('3.')).length ?? 0) > 0
                            ? balanceData.detailed_lines?.filter(l => l.code.startsWith('3.')).map((line, i) => (
                                <tr key={`pl-${i}`} className="border-b border-border/50 hover:bg-accent/30">
                                  <td className="px-4 py-1.5 text-foreground" style={{ paddingLeft: '28px' }}><span className="inline-flex items-center gap-1.5">{line.description}<SaldoInicialHint description={line.description} /></span></td>
                                  <td className={`px-4 py-1.5 text-right tabular-nums ${line.amount < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                                    {formatBRL(line.amount)}
                                  </td>
                                  {prevCell(prevLineAmount(line.code))}
                                </tr>
                              ))
                            : [
                                { label: 'Capital Social', value: balanceData.patrimonio_liquido?.capital_social ?? 0, prevValue: hasPrev ? (balancePrevData!.patrimonio_liquido?.capital_social ?? 0) : 0 },
                                { label: 'Reservas e Ajustes', value: balanceData.patrimonio_liquido?.reservas ?? 0, prevValue: hasPrev ? (balancePrevData!.patrimonio_liquido?.reservas ?? 0) : 0 },
                                { label: 'Lucro ou prejuízo do exercício', value: balanceData.patrimonio_liquido?.lucros_acumulados ?? 0, prevValue: hasPrev ? (balancePrevData!.patrimonio_liquido?.lucros_acumulados ?? 0) : 0 },
                              ].filter(item => item.value !== 0 || item.prevValue !== 0).map((item, i) => (
                                <tr key={`plf-${i}`} className="border-b border-border/50 hover:bg-accent/30">
                                  <td className="px-4 py-1.5 text-foreground" style={{ paddingLeft: '28px' }}>{item.label}</td>
                                  <td className={`px-4 py-1.5 text-right tabular-nums ${item.value < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                                    {formatBRL(item.value)}
                                  </td>
                                  {prevCell(item.prevValue)}
                                </tr>
                              ))
                          }

                          {/* TOTAL PASSIVO + PL */}
                          <tr className="bg-green-900 text-white font-bold">
                            <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1.5">TOTAL PASSIVO + PL<BalanceInfoIcon label="Total Passivo + PL" /></span></td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {formatBRL((balanceData.passivo?.total || 0) + (balanceData.patrimonio_liquido?.total || 0))}
                            </td>
                            {hasPrev && <td className="px-4 py-2.5 text-right tabular-nums border-l border-white/20">
                              {formatBRL((balancePrevData!.passivo?.total || 0) + (balancePrevData!.patrimonio_liquido?.total || 0))}
                            </td>}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Balance Check */}
                  <div className={`mt-4 p-3 rounded-lg text-sm font-semibold flex items-center justify-between ${balanceData.is_balanced ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'}`}>
                    <span>{balanceData.is_balanced ? '✅ Balanço equilibrado' : '⚠️ Diferença no balanço'}</span>
                    {!balanceData.is_balanced && <span className="tabular-nums">{formatBRL(balanceData.balance_difference || 0)}</span>}
                  </div>
                </div>
                );
              })()}

            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cashflow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Demonstração do Fluxo de Caixa (DFC)</CardTitle>
              <CardDescription className="text-base mt-2">
                Movimentações de entradas e saídas de caixa (Método Direto ou Indireto)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Method Selector (stays in this tab) */}
              <div>
                <label className="block text-base font-semibold text-foreground mb-3">Método de Cálculo (CPC 03)</label>
                {hasCashFlowAccess ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button
                        variant={cashFlowMethod === "indirect" ? "default" : "outline"}
                        onClick={() => setCashFlowMethod("indirect")}
                        className="text-base px-4 py-6 h-auto"
                      >
                        🔄 Método Indireto
                      </Button>
                      <Button
                        variant={cashFlowMethod === "direct" ? "default" : "outline"}
                        onClick={() => setCashFlowMethod("direct")}
                        className="text-base px-4 py-6 h-auto"
                      >
                        💵 Método Direto
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {cashFlowMethod === 'indirect'
                        ? 'Parte do Lucro Líquido e ajusta pelas variações patrimoniais (mais comum)'
                        : 'Mostra recebimentos e pagamentos reais em dinheiro'}
                    </p>
                  </>
                ) : (
                  <div className="relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-50 pointer-events-none">
                      <Button variant="outline" className="text-base px-4 py-6 h-auto">
                        🔄 Método Indireto
                      </Button>
                      <Button variant="outline" className="text-base px-4 py-6 h-auto">
                        💵 Método Direto
                      </Button>
                    </div>
                    <div className="mt-3 flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4">
                      <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        A escolha entre Método Direto e Indireto está disponível nos planos <strong>Pro</strong> e <strong>Max</strong>.
                        No plano Básico, o fluxo de caixa utiliza o método básico simplificado.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Export Buttons */}
              <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => exportCashFlow('excel')}
                    disabled={cashFlowLoading}
                    className="bg-green-600 hover:bg-green-700 text-white text-base px-6 py-6 h-auto"
                  >
                    <FileSpreadsheet className="w-5 h-5 mr-2" />
                    {cashFlowLoading ? 'Gerando...' : 'Baixar XLSX'}
                  </Button>
                  <Button
                    onClick={() => exportCashFlow('pdf')}
                    disabled={cashFlowLoading}
                    variant="outline"
                    className="text-base px-6 py-6 h-auto"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    {cashFlowLoading ? 'Gerando...' : 'Baixar PDF'}
                  </Button>
              </div>

              {/* Inline Cash Flow Display */}
              {cashFlowData && (
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">
                      Fluxo de Caixa ({cashFlowData.method === 'indirect' ? 'Método Indireto' : 'Método Direto'}) — {new Date(cashFlowData.start_date + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(cashFlowData.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </h3>
                    {cashFlowData.company_name && (
                      <span className="text-sm text-muted-foreground">{cashFlowData.company_name}</span>
                    )}
                  </div>

                  {/* Cash Position Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-muted/30 rounded-lg border border-border">
                      <p className="text-sm font-medium text-muted-foreground">Saldo Inicial</p>
                      <p className="text-xl font-bold text-foreground">{formatBRL(cashFlowData.cash_beginning)}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${cashFlowData.net_increase_in_cash >= 0 ? 'bg-green-500/10 border-green-200 dark:border-green-800' : 'bg-red-500/10 border-red-200 dark:border-red-800'}`}>
                      <p className="text-sm font-medium text-muted-foreground">Variação no Período</p>
                      <p className={`text-xl font-bold ${cashFlowData.net_increase_in_cash >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        {cashFlowData.net_increase_in_cash >= 0 ? '+' : ''}{formatBRL(cashFlowData.net_increase_in_cash)}
                      </p>
                    </div>
                    <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm font-medium text-muted-foreground">Saldo Final</p>
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{formatBRL(cashFlowData.cash_ending)}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${cashFlowData.net_cash_from_operations >= 0 ? 'bg-green-500/10 border-green-200 dark:border-green-800' : 'bg-amber-500/10 border-amber-200 dark:border-amber-800'}`}>
                      <p className="text-sm font-medium text-muted-foreground">Caixa Operacional</p>
                      <p className={`text-xl font-bold ${cashFlowData.net_cash_from_operations >= 0 ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                        {formatBRL(cashFlowData.net_cash_from_operations)}
                      </p>
                    </div>
                  </div>

                  {/* Sections */}
                  {renderCashFlowSection(cashFlowData.operating_activities, "text-green-700 dark:text-green-400")}
                  {renderCashFlowSection(cashFlowData.investing_activities, "text-blue-700 dark:text-blue-400")}
                  {renderCashFlowSection(cashFlowData.financing_activities, "text-purple-700 dark:text-purple-400")}

                  {/* Grand Total */}
                  <div className="overflow-x-auto rounded-lg border-2 border-foreground/20">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="bg-blue-500/10 font-bold">
                          <td className="px-4 py-3 text-foreground">Variação Líquida de Caixa</td>
                          <td className={`px-4 py-3 text-right tabular-nums w-40 ${cashFlowData.net_increase_in_cash < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                            {formatBRL(cashFlowData.net_increase_in_cash)}
                          </td>
                        </tr>
                        <tr className="bg-muted/30">
                          <td className="px-4 py-2 text-muted-foreground">Saldo Inicial de Caixa</td>
                          <td className="px-4 py-2 text-right tabular-nums w-40 text-foreground">{formatBRL(cashFlowData.cash_beginning)}</td>
                        </tr>
                        <tr className="bg-blue-500/10 font-bold">
                          <td className="px-4 py-3 text-foreground">Saldo Final de Caixa</td>
                          <td className="px-4 py-3 text-right tabular-nums w-40 text-blue-700 dark:text-blue-400">{formatBRL(cashFlowData.cash_ending)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Detailed Daily/Monthly Cash Flow Breakdown */}
              {cashFlowDetailedData && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    {periodType === 'year' ? 'Detalhamento Mensal' :
                     periodType === 'day' ? 'Transações do Dia' :
                     'Detalhamento Diário'}
                  </h3>

                  {/* Year view: monthly totals table */}
                  {periodType === 'year' && Object.keys(cashFlowDetailedData.monthly_totals).length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left px-4 py-3 font-semibold text-foreground">Mês</th>
                            <th className="text-right px-3 py-3 font-semibold text-foreground">Receita Bruta</th>
                            <th className="text-right px-3 py-3 font-semibold text-foreground">Margem Contrib.</th>
                            <th className="text-right px-3 py-3 font-semibold text-foreground">Res. Operacional</th>
                            <th className="text-right px-3 py-3 font-semibold text-foreground">Res. Líquido</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {Object.entries(cashFlowDetailedData.monthly_totals)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([monthKey, data]) => (
                            <tr key={monthKey} className="hover:bg-accent/30">
                              <td className="px-4 py-2 font-medium text-foreground">
                                {format(new Date(monthKey + '-01T12:00:00'), 'MMM/yyyy', { locale: ptBR })}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">{formatBRL(data.receita_bruta)}</td>
                              <td className={`px-3 py-2 text-right tabular-nums ${data.margem_contribuicao < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                {formatBRL(data.margem_contribuicao)}
                              </td>
                              <td className={`px-3 py-2 text-right tabular-nums ${data.resultado_operacional < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                {formatBRL(data.resultado_operacional)}
                              </td>
                              <td className={`px-3 py-2 text-right tabular-nums font-semibold ${data.resultado_liquido < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {formatBRL(data.resultado_liquido)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Day view: transaction list */}
                  {periodType === 'day' && cashFlowDetailedData.transactions && (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left px-4 py-3 font-semibold text-foreground">Descrição</th>
                            <th className="text-left px-3 py-3 font-semibold text-foreground">Categoria</th>
                            <th className="text-left px-3 py-3 font-semibold text-foreground">Tipo</th>
                            <th className="text-right px-4 py-3 font-semibold text-foreground">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {cashFlowDetailedData.transactions.map((txn, i) => (
                            <tr key={i} className="hover:bg-accent/30">
                              <td className="px-4 py-2 text-foreground">{txn.description || '-'}</td>
                              <td className="px-3 py-2 text-muted-foreground text-xs">{txn.category}</td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  ['receita', 'income'].includes(txn.transaction_type)
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {txn.transaction_type}
                                </span>
                              </td>
                              <td className={`px-4 py-2 text-right tabular-nums font-semibold ${
                                ['receita', 'income'].includes(txn.transaction_type)
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {formatBRL(txn.amount)}
                              </td>
                            </tr>
                          ))}
                          {cashFlowDetailedData.transactions.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                Nenhuma transação encontrada para este dia
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Month/Week/Custom view: daily breakdown table */}
                  {!['year', 'day'].includes(periodType) && cashFlowDetailedData.daily_dre.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left px-3 py-3 font-semibold text-foreground sticky left-0 bg-muted/50">Dia</th>
                            <th className="text-right px-2 py-3 font-semibold text-foreground whitespace-nowrap">Rec. Bruta</th>
                            <th className="text-right px-2 py-3 font-semibold text-foreground whitespace-nowrap">Deduções</th>
                            <th className="text-right px-2 py-3 font-semibold text-foreground whitespace-nowrap">Rec. Líq.</th>
                            <th className="text-right px-2 py-3 font-semibold text-foreground whitespace-nowrap">Custos Var.</th>
                            <th className="text-right px-2 py-3 font-semibold text-foreground whitespace-nowrap">Margem C.</th>
                            <th className="text-right px-2 py-3 font-semibold text-foreground whitespace-nowrap">Custos Fix.</th>
                            <th className="text-right px-2 py-3 font-semibold text-foreground whitespace-nowrap">Res. Op.</th>
                            <th className="text-right px-2 py-3 font-semibold text-foreground whitespace-nowrap">Res. Líq.</th>
                            <th className="text-right px-2 py-3 font-semibold text-foreground whitespace-nowrap">Acumulado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {cashFlowDetailedData.daily_dre.map((entry, i) => {
                            const hasData = entry.receita_bruta !== 0 || entry.total_custos_variaveis !== 0 ||
                              entry.total_custos_fixos !== 0 || entry.receitas_nao_operacionais !== 0 ||
                              entry.despesas_nao_operacionais !== 0;
                            return (
                              <tr key={i} className={`${hasData ? 'hover:bg-accent/30' : 'opacity-40'}`}>
                                <td className="px-3 py-1.5 font-medium text-foreground sticky left-0 bg-card whitespace-nowrap">
                                  {format(new Date(entry.day + 'T12:00:00'), 'dd/MM (EEE)', { locale: ptBR })}
                                </td>
                                <td className="px-2 py-1.5 text-right tabular-nums">{entry.receita_bruta ? formatBRL(entry.receita_bruta) : '-'}</td>
                                <td className="px-2 py-1.5 text-right tabular-nums text-red-600 dark:text-red-400">{entry.total_deducoes ? formatBRL(-entry.total_deducoes) : '-'}</td>
                                <td className="px-2 py-1.5 text-right tabular-nums">{entry.receita_liquida ? formatBRL(entry.receita_liquida) : '-'}</td>
                                <td className="px-2 py-1.5 text-right tabular-nums text-red-600 dark:text-red-400">{entry.total_custos_variaveis ? formatBRL(-entry.total_custos_variaveis) : '-'}</td>
                                <td className={`px-2 py-1.5 text-right tabular-nums ${entry.margem_contribuicao < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                  {entry.margem_contribuicao ? formatBRL(entry.margem_contribuicao) : '-'}
                                </td>
                                <td className="px-2 py-1.5 text-right tabular-nums text-red-600 dark:text-red-400">{entry.total_custos_fixos ? formatBRL(-entry.total_custos_fixos) : '-'}</td>
                                <td className={`px-2 py-1.5 text-right tabular-nums font-medium ${entry.resultado_operacional < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                  {entry.resultado_operacional ? formatBRL(entry.resultado_operacional) : '-'}
                                </td>
                                <td className={`px-2 py-1.5 text-right tabular-nums font-semibold ${entry.resultado_liquido < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                  {entry.resultado_liquido ? formatBRL(entry.resultado_liquido) : '-'}
                                </td>
                                <td className={`px-2 py-1.5 text-right tabular-nums font-bold ${entry.resultado_acumulado < 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                  {formatBRL(entry.resultado_acumulado)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Info Box */}
              <div className="bg-green-500/5 border border-green-200 dark:border-green-800 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-foreground mb-2">ℹ️ Sobre o Fluxo de Caixa</h4>
                <p className="text-muted-foreground">
                  O Fluxo de Caixa mostra todas as movimentações financeiras em três categorias:
                </p>
                <ul className="list-disc list-inside mt-3 text-muted-foreground space-y-1">
                  <li><strong className="text-foreground">Operacionais:</strong> Atividades principais do negócio</li>
                  <li><strong className="text-foreground">Investimentos:</strong> Compra/venda de ativos fixos</li>
                  <li><strong className="text-foreground">Financiamentos:</strong> Empréstimos, dividendos, capital social</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Indicators Tab */}
        <TabsContent value="indicators" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Indicadores Financeiros</CardTitle>
              <CardDescription className="text-base mt-2">
                KPIs calculados a partir da DRE e do Balanço Gerencial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {indicatorsData && (
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Período: {indicatorsData.period}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {['margens', 'liquidez', 'endividamento', 'rentabilidade', 'operacional'].map((groupKey) => {
                      const group = indicatorsData[groupKey];
                      if (!group) return null;
                      return (
                        <div key={groupKey} className="rounded-xl border-2 border-border bg-card p-4 space-y-3">
                          <h3 className="text-lg font-bold text-foreground">{group.title}</h3>
                          <div className="space-y-2">
                            {group.items.map((item: any, i: number) => (
                              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{item.formula}</p>
                                  {item.description && <p className="text-xs text-muted-foreground italic">{item.description}</p>}
                                </div>
                                <div className="text-right ml-3">
                                  {item.value !== null && item.value !== undefined ? (
                                    <span className={`text-lg font-bold tabular-nums ${
                                      item.value < 0 ? 'text-red-600 dark:text-red-400' :
                                      groupKey === 'margens' && item.value > 20 ? 'text-green-600 dark:text-green-400' :
                                      groupKey === 'liquidez' && item.value >= 1 ? 'text-green-600 dark:text-green-400' :
                                      groupKey === 'liquidez' && item.value < 1 ? 'text-red-600 dark:text-red-400' :
                                      'text-foreground'
                                    }`}>
                                      {item.is_currency
                                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)
                                        : `${item.value}${item.suffix}`
                                      }
                                    </span>
                                  ) : (
                                    <span className="text-sm text-muted-foreground" title="Dados insuficientes para calcular este indicador no período selecionado">N/A</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
