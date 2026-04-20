"use client";

/**
 * Initial Balance Wizard
 * Multi-step modal form that collects opening balance sheet data.
 * Appears as a gate on report pages when no initial balance exists.
 *
 * Steps:
 * 1. Reference date + Bank accounts
 * 2. Current assets (cash, investments, receivables, inventory)
 * 3. Fixed assets (land, buildings, machinery, vehicles, furniture, computers)
 * 4. Liabilities (payables, loans, obligations)
 * 5. Optional items (intangibles, long-term, summary)
 */

import { useState, useEffect, useCallback } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Calendar,
  Landmark,
  Package,
  Truck,
  FileText,
  Plus,
  Trash2,
  Search,
  Info,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  initialBalanceApi,
  orgSettingsApi,
  createEmptyInitialBalance,
  type InitialBalanceData,
  type BankAccount,
  type BankAccountBalanceEntry,
  type BankInfo,
} from "@/lib/initial-balance-api";

interface InitialBalanceWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const STEPS = [
  { title: "Data e Contas Bancárias", icon: Calendar, description: "Data de referência e suas contas bancárias" },
  { title: "Ativos Circulantes", icon: Landmark, description: "Caixa, investimentos, recebíveis e estoques" },
  { title: "Ativos Fixos", icon: Truck, description: "Imobilizado: terrenos, prédios, veículos, equipamentos" },
  { title: "Passivos e Obrigações", icon: FileText, description: "Fornecedores, empréstimos e obrigações" },
  { title: "Itens Opcionais e Resumo", icon: Package, description: "Intangíveis, longo prazo e resumo final" },
];

const ACCOUNT_TYPES = [
  { value: "checking", label: "Conta Corrente" },
  { value: "savings", label: "Poupança" },
  { value: "investment", label: "Investimento" },
];

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

// Parse currency input (e.g. "1.000,50" -> 1000.50)
const parseCurrencyInput = (value: string): number => {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// Extracted outside the parent component so React keeps a stable reference
// and doesn't remount <input> on every keystroke.
function CurrencyField({
  label,
  field,
  helpText,
  value,
  onChange,
}: {
  label: string;
  field: string;
  helpText?: string;
  value: number;
  onChange: (field: string, value: number) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      {helpText && <p className="text-xs text-muted-foreground mb-1">{helpText}</p>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          R$
        </span>
        <input
          type="text"
          value={value === 0 ? "" : String(value)}
          onChange={(e) => onChange(field, parseCurrencyInput(e.target.value))}
          placeholder="0,00"
          className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50 focus:border-[#0d767b] text-right"
        />
      </div>
    </div>
  );
}

export default function InitialBalanceWizard({ onComplete, onSkip }: InitialBalanceWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState(createEmptyInitialBalance());

  // Bank accounts state
  const [bankAccounts, setBankAccounts] = useState<(BankAccount & { initialBalance: number })[]>([]);
  const [allBanks, setAllBanks] = useState<BankInfo[]>([]);
  const [bankSearch, setBankSearch] = useState("");
  const [showBankDropdown, setShowBankDropdown] = useState<number | null>(null);
  const [capitalSocial, setCapitalSocial] = useState(0);

  // Load existing data and bank list on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [existing, accounts, banks, companyInfo] = await Promise.all([
          initialBalanceApi.get().catch(() => null),
          orgSettingsApi.listBankAccounts().catch(() => []),
          orgSettingsApi.lookupBanks().catch(() => []),
          orgSettingsApi.getCompanyInfo().catch(() => null),
        ]);

        if (companyInfo?.capital_social) {
          setCapitalSocial(Number(companyInfo.capital_social));
        }

        if (existing) {
          setData({
            ...existing,
            bank_account_balances: existing.bank_account_balances || [],
          });

          // Map bank account balances to accounts
          const balanceMap = new Map(
            (existing.bank_account_balances || []).map((b: BankAccountBalanceEntry) => [b.bank_account_id, b.balance])
          );
          setBankAccounts(
            accounts.map((a: BankAccount) => ({
              ...a,
              initialBalance: balanceMap.get(a.id!) || 0,
            }))
          );
        } else {
          setBankAccounts(
            accounts.map((a: BankAccount) => ({ ...a, initialBalance: 0 }))
          );
        }

        setAllBanks(banks);
      } catch (error) {
        console.error("Error loading initial balance data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Update a field
  const updateField = useCallback((field: string, value: number) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // parseCurrencyInput is defined outside the component

  // Add bank account
  const addBankAccount = async () => {
    const newAccount: BankAccount & { initialBalance: number } = {
      bank_code: "",
      bank_name: "",
      agency: "",
      account_number: "",
      account_type: "checking",
      account_nickname: "",
      initialBalance: 0,
    };
    setBankAccounts((prev) => [...prev, newAccount]);
  };

  // Remove bank account
  const removeBankAccount = (index: number) => {
    setBankAccounts((prev) => prev.filter((_, i) => i !== index));
  };

  // Update bank account field
  const updateBankField = (index: number, field: string, value: any) => {
    setBankAccounts((prev) =>
      prev.map((acc, i) => (i === index ? { ...acc, [field]: value } : acc))
    );
  };

  // Select a bank from dropdown
  const selectBank = (index: number, bank: BankInfo) => {
    updateBankField(index, "bank_code", String(bank.code));
    updateBankField(index, "bank_name", bank.full_name || bank.name);
    setShowBankDropdown(null);
    setBankSearch("");
  };

  // Filter banks
  const filteredBanks = allBanks.filter(
    (b) =>
      b.code !== null &&
      (b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
        b.full_name.toLowerCase().includes(bankSearch.toLowerCase()) ||
        String(b.code).includes(bankSearch))
  );

  // Save progress (not completing)
  const saveProgress = async () => {
    setIsSaving(true);
    try {
      // Save bank accounts first
      for (const acc of bankAccounts) {
        if (!acc.bank_code || !acc.agency || !acc.account_number) continue;
        if (acc.id) {
          await orgSettingsApi.updateBankAccount(acc.id, {
            bank_code: acc.bank_code,
            bank_name: acc.bank_name,
            agency: acc.agency,
            account_number: acc.account_number,
            account_type: acc.account_type,
            account_nickname: acc.account_nickname,
          });
        } else {
          const saved = await orgSettingsApi.addBankAccount({
            bank_code: acc.bank_code,
            bank_name: acc.bank_name,
            agency: acc.agency,
            account_number: acc.account_number,
            account_type: acc.account_type,
            account_nickname: acc.account_nickname,
          });
          acc.id = saved.id;
        }
      }

      // Build bank balances
      const bankBalances: BankAccountBalanceEntry[] = bankAccounts
        .filter((a) => a.id)
        .map((a) => ({
          bank_account_id: a.id!,
          balance: a.initialBalance,
        }));

      await initialBalanceApi.save({
        ...data,
        bank_account_balances: bankBalances,
        is_completed: false,
      });

      toast.success("Progresso salvo!");
    } catch (error) {
      console.error("Error saving progress:", error);
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  // Complete wizard
  const completeWizard = async () => {
    setIsSaving(true);
    try {
      // Save bank accounts first
      for (const acc of bankAccounts) {
        if (!acc.bank_code || !acc.agency || !acc.account_number) continue;
        if (acc.id) {
          await orgSettingsApi.updateBankAccount(acc.id, {
            bank_code: acc.bank_code,
            bank_name: acc.bank_name,
            agency: acc.agency,
            account_number: acc.account_number,
            account_type: acc.account_type,
            account_nickname: acc.account_nickname,
          });
        } else {
          const saved = await orgSettingsApi.addBankAccount({
            bank_code: acc.bank_code,
            bank_name: acc.bank_name,
            agency: acc.agency,
            account_number: acc.account_number,
            account_type: acc.account_type,
            account_nickname: acc.account_nickname,
          });
          acc.id = saved.id;
        }
      }

      const bankBalances: BankAccountBalanceEntry[] = bankAccounts
        .filter((a) => a.id)
        .map((a) => ({
          bank_account_id: a.id!,
          balance: a.initialBalance,
        }));

      await initialBalanceApi.save({
        ...data,
        bank_account_balances: bankBalances,
        is_completed: true,
      });

      // Save capital social to org settings
      if (capitalSocial > 0) {
        try {
          await orgSettingsApi.updateCompanyInfo({ capital_social: capitalSocial });
        } catch (e) {
          console.warn("Failed to save capital social to org:", e);
        }
      }

      toast.success("Saldos iniciais configurados com sucesso!");
      onComplete();
    } catch (error) {
      console.error("Error completing wizard:", error);
      toast.error("Erro ao salvar saldos iniciais. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate summary totals
  const bankTotal = bankAccounts.reduce((sum, a) => sum + a.initialBalance, 0);

  const totalAtivoCirculante =
    data.cash_and_equivalents +
    data.short_term_investments +
    data.accounts_receivable +
    data.inventory +
    data.prepaid_expenses;

  const totalAtivoNaoCirculante =
    data.long_term_receivables + data.long_term_investments;

  const totalImobilizado =
    data.fixed_assets_land +
    data.fixed_assets_buildings +
    data.fixed_assets_machinery +
    data.fixed_assets_vehicles +
    data.fixed_assets_furniture +
    data.fixed_assets_computers +
    data.fixed_assets_other -
    data.accumulated_depreciation;

  const totalIntangivel =
    data.intangible_assets - data.accumulated_amortization;

  const totalAtivo =
    totalAtivoCirculante + totalAtivoNaoCirculante + totalImobilizado + totalIntangivel;

  const totalPassivoCirculante =
    data.suppliers_payable +
    data.short_term_loans +
    data.labor_obligations +
    data.tax_obligations +
    data.other_current_liabilities;

  const totalPassivoNaoCirculante =
    data.long_term_loans + data.long_term_financing +
    data.provisions_long_term + data.deferred_tax_liabilities;

  const totalPassivo = totalPassivoCirculante + totalPassivoNaoCirculante;
  const reservasEAjustes = data.reserves_and_adjustments;
  const lucrosAcumulados = totalAtivo - totalPassivo - capitalSocial - reservasEAjustes;
  const patrimonioLiquido = capitalSocial + reservasEAjustes + lucrosAcumulados;

  // Helper to render a CurrencyField bound to the current data/updateField.
  // This is NOT a component definition (no JSX function), just a shortcut that
  // renders the stable external CurrencyField with the right props.
  const renderCurrency = (label: string, field: string, helpText?: string) => (
    <CurrencyField
      key={field}
      label={label}
      field={field}
      helpText={helpText}
      value={(data as any)[field] ?? 0}
      onChange={updateField}
    />
  );

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-card rounded-2xl shadow-2xl p-8">
          <Loader2 className="w-8 h-8 animate-spin text-[#0d767b] mx-auto" />
          <p className="text-muted-foreground mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-border">
        {/* Header */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-[#0d767b]/10 to-transparent dark:from-[#0d767b]/20 rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#0d767b] to-[#095a5e] rounded-xl flex items-center justify-center text-white shadow-lg">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Saldos Iniciais</h2>
                <p className="text-sm text-muted-foreground">
                  Configure os saldos de abertura da sua empresa
                </p>
              </div>
            </div>
            {onSkip && (
              <button
                onClick={onSkip}
                className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-accent"
                title="Preencher depois"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-1">
            {STEPS.map((step, i) => (
              <div key={i} className="flex-1 flex items-center">
                <button
                  onClick={() => setCurrentStep(i)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all w-full ${
                    i === currentStep
                      ? "bg-[#0d767b] text-white shadow-md"
                      : i < currentStep
                      ? "bg-[#0d767b]/20 text-[#0d767b] dark:text-[#1a9da3]"
                      : "bg-accent/50 text-muted-foreground"
                  }`}
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-current flex-shrink-0">
                    {i < currentStep ? <Check className="w-3 h-3" /> : i + 1}
                  </span>
                  <span className="hidden lg:inline truncate">{step.title}</span>
                </button>
              </div>
            ))}
          </div>

          {/* Info note */}
          <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground bg-accent/50 rounded-lg p-3">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Os valores informados são <strong>aproximados</strong> e serão usados como ponto de
              partida para seus relatórios. Não precisam ser 100% exatos — você pode editá-los
              depois nas Configurações da Empresa.
            </span>
          </div>
        </div>

        {/* Step content — min-h-0 lets flexbox shrink this below content size so overflow scroll works */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {/* ==================== STEP 1: Date & Bank Accounts ==================== */}
          {currentStep === 0 && (
            <>
              {/* Reference date */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Data de Referência
                </label>
                <p className="text-sm text-muted-foreground mb-2">
                  Os saldos informados serão considerados a partir desta data.
                </p>
                <DatePicker
                  value={data.reference_date ? new Date(data.reference_date + 'T12:00:00') : undefined}
                  onChange={(d) => setData((prev) => ({ ...prev, reference_date: d ? format(d, 'yyyy-MM-dd') : '' }))}
                  placeholder="Selecione a data de referência"
                  className="w-full sm:w-64"
                />
              </div>

              {/* Bank accounts */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Contas Bancárias</h3>
                    <p className="text-xs text-muted-foreground">
                      Adicione suas contas bancárias e seus saldos atuais.
                      <span className="block mt-1 text-amber-600 dark:text-amber-400 font-medium">
                        Os saldos bancários serão somados ao valor de Caixa e Equivalentes na próxima etapa.
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={addBankAccount}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#0d767b] text-white rounded-lg text-sm font-medium hover:bg-[#095a5e] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Conta
                  </button>
                </div>

                {bankAccounts.length === 0 ? (
                  <div className="text-center py-8 bg-accent/30 rounded-xl border-2 border-dashed border-border">
                    <Landmark className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma conta bancária adicionada</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique em &quot;Adicionar Conta&quot; para começar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bankAccounts.map((acc, idx) => (
                      <div
                        key={idx}
                        className="bg-accent/30 rounded-xl p-4 border border-border space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">
                            Conta {idx + 1}
                            {acc.account_nickname ? ` — ${acc.account_nickname}` : ""}
                          </span>
                          <button
                            onClick={() => removeBankAccount(idx)}
                            className="text-destructive hover:text-destructive/80 p-1 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Bank selector */}
                          <div className="relative">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Banco
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={
                                  acc.bank_name
                                    ? `${acc.bank_code} - ${acc.bank_name}`
                                    : bankSearch
                                }
                                onChange={(e) => {
                                  setBankSearch(e.target.value);
                                  setShowBankDropdown(idx);
                                  if (!e.target.value) {
                                    updateBankField(idx, "bank_code", "");
                                    updateBankField(idx, "bank_name", "");
                                  }
                                }}
                                onFocus={() => setShowBankDropdown(idx)}
                                placeholder="Buscar banco..."
                                className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50"
                              />
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            </div>

                            {showBankDropdown === idx && (
                              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                {filteredBanks.slice(0, 30).map((bank) => (
                                  <button
                                    key={bank.ispb}
                                    onClick={() => selectBank(idx, bank)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                                  >
                                    <span className="font-medium">{bank.code}</span>
                                    <span className="text-muted-foreground"> — {bank.name}</span>
                                  </button>
                                ))}
                                {filteredBanks.length === 0 && (
                                  <p className="px-3 py-2 text-sm text-muted-foreground">
                                    Nenhum banco encontrado
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Account type */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Tipo
                            </label>
                            <select
                              value={acc.account_type}
                              onChange={(e) => updateBankField(idx, "account_type", e.target.value)}
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50"
                            >
                              {ACCOUNT_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Agency */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Agência
                            </label>
                            <input
                              type="text"
                              value={acc.agency}
                              onChange={(e) => updateBankField(idx, "agency", e.target.value)}
                              placeholder="1234-5"
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50"
                            />
                          </div>

                          {/* Account number */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Número da Conta
                            </label>
                            <input
                              type="text"
                              value={acc.account_number}
                              onChange={(e) =>
                                updateBankField(idx, "account_number", e.target.value)
                              }
                              placeholder="12345-6"
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50"
                            />
                          </div>

                          {/* Nickname */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Apelido (opcional)
                            </label>
                            <input
                              type="text"
                              value={acc.account_nickname || ""}
                              onChange={(e) =>
                                updateBankField(idx, "account_nickname", e.target.value)
                              }
                              placeholder="Ex: Conta Principal"
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50"
                            />
                          </div>

                          {/* Initial balance */}
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Saldo na Data de Referência
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                R$
                              </span>
                              <input
                                type="text"
                                value={acc.initialBalance === 0 ? "" : String(acc.initialBalance)}
                                onChange={(e) =>
                                  updateBankField(
                                    idx,
                                    "initialBalance",
                                    parseCurrencyInput(e.target.value)
                                  )
                                }
                                placeholder="0,00"
                                className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground text-right focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ==================== STEP 2: Current Assets ==================== */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Ativo Circulante</h3>
              <p className="text-sm text-muted-foreground">
                Valores que a empresa possui ou espera receber em até 12 meses.
              </p>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-foreground">
                  Caixa e Equivalentes de Caixa
                </label>

                {/* Bank total — read-only */}
                {bankTotal > 0 && (
                  <div className="flex items-center justify-between py-2.5 px-3 bg-accent/50 rounded-lg border border-border">
                    <span className="text-sm text-muted-foreground">Saldos Bancários (das contas informadas)</span>
                    <span className="text-sm font-bold text-foreground tabular-nums">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bankTotal)}</span>
                  </div>
                )}

                {/* Physical cash — editable */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Dinheiro Físico em Caixa</label>
                  <input
                    type="number"
                    step="0.01"
                    value={(data.cash_and_equivalents - bankTotal) > 0 ? (data.cash_and_equivalents - bankTotal) : (data.cash_and_equivalents && !bankTotal ? data.cash_and_equivalents : "")}
                    onChange={(e) => {
                      const physicalCash = parseFloat(e.target.value) || 0;
                      setData((prev) => ({ ...prev, cash_and_equivalents: physicalCash + bankTotal }));
                    }}
                    placeholder="0,00"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50"
                  />
                </div>

                {/* Total — auto-calculated */}
                <div className="flex items-center justify-between py-2.5 px-3 bg-green-500/10 rounded-lg border border-green-200 dark:border-green-800">
                  <span className="text-sm font-semibold text-foreground">Total Caixa e Equivalentes</span>
                  <span className="text-sm font-bold text-green-700 dark:text-green-400 tabular-nums">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.cash_and_equivalents || 0)}</span>
                </div>
              </div>

              {renderCurrency("Aplicações Financeiras (Curto Prazo)", "short_term_investments", "CDBs, fundos, títulos com vencimento em até 12 meses")}
              {renderCurrency("Clientes — Contas a Receber", "accounts_receivable", "Valores que clientes devem à empresa")}
              {renderCurrency("Estoques", "inventory", "Mercadorias, matéria-prima, produtos acabados")}
              {renderCurrency("Despesas Antecipadas", "prepaid_expenses", "Seguros pagos antecipadamente, aluguéis adiantados, etc.")}

              <div className="bg-[#0d767b]/10 dark:bg-[#0d767b]/20 rounded-xl p-4 border border-[#0d767b]/20">
                <p className="text-sm font-semibold text-foreground">
                  Total Ativo Circulante: {formatBRL(totalAtivoCirculante)}
                </p>
              </div>
            </div>
          )}

          {/* ==================== STEP 3: Fixed Assets ==================== */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Ativo Imobilizado</h3>
              <p className="text-sm text-muted-foreground">
                Bens de uso permanente da empresa. Informe o valor de aquisição (custo).
              </p>

              {renderCurrency("Terrenos", "fixed_assets_land")}
              {renderCurrency("Prédios e Construções", "fixed_assets_buildings")}
              {renderCurrency("Máquinas e Equipamentos", "fixed_assets_machinery")}
              {renderCurrency("Veículos", "fixed_assets_vehicles")}
              {renderCurrency("Móveis e Utensílios", "fixed_assets_furniture")}
              {renderCurrency("Computadores e Equipamentos de TI", "fixed_assets_computers")}
              {renderCurrency("Outros Imobilizados", "fixed_assets_other")}
              {renderCurrency("(-) Depreciação Acumulada", "accumulated_depreciation", "Valor total de depreciação já contabilizada (informe como valor positivo)")}

              <div className="bg-[#0d767b]/10 dark:bg-[#0d767b]/20 rounded-xl p-4 border border-[#0d767b]/20">
                <p className="text-sm font-semibold text-foreground">
                  Total Imobilizado Líquido: {formatBRL(totalImobilizado)}
                </p>
              </div>
            </div>
          )}

          {/* ==================== STEP 4: Liabilities ==================== */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Passivos e Obrigações</h3>
              <p className="text-sm text-muted-foreground">
                Dívidas e obrigações da empresa.
              </p>

              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">
                Passivo Circulante (até 12 meses)
              </h4>
              {renderCurrency("Fornecedores (Contas a Pagar)", "suppliers_payable", "Valores devidos a fornecedores")}
              {renderCurrency("Empréstimos de Curto Prazo", "short_term_loans", "Parcelas de empréstimos vencendo em até 12 meses")}
              {renderCurrency("Obrigações Trabalhistas e Sociais", "labor_obligations", "Salários, FGTS, INSS a pagar")}
              {renderCurrency("Obrigações Fiscais", "tax_obligations", "Impostos a pagar (IRPJ, CSLL, PIS, COFINS, ISS, etc.)")}
              {renderCurrency("Outras Contas a Pagar", "other_current_liabilities", "Aluguéis, contas de consumo, provisões de curto prazo")}

              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-6">
                Passivo Não Circulante (acima de 12 meses)
              </h4>
              {renderCurrency("Empréstimos de Longo Prazo", "long_term_loans", "Parcelas de empréstimos com vencimento acima de 12 meses")}
              {renderCurrency("Financiamentos de Longo Prazo", "long_term_financing", "Financiamentos de equipamentos, imóveis, etc.")}
              {renderCurrency("Provisões de Longo Prazo", "provisions_long_term", "Provisões para contingências, processos judiciais, etc.")}
              {renderCurrency("Passivos Fiscais Diferidos", "deferred_tax_liabilities", "Impostos diferidos sobre lucros futuros")}

              <div className="bg-[#0d767b]/10 dark:bg-[#0d767b]/20 rounded-xl p-4 border border-[#0d767b]/20 space-y-1">
                <p className="text-sm text-foreground">
                  Passivo Circulante: {formatBRL(totalPassivoCirculante)}
                </p>
                <p className="text-sm text-foreground">
                  Passivo Não Circulante: {formatBRL(totalPassivoNaoCirculante)}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  Total Passivo: {formatBRL(totalPassivo)}
                </p>
              </div>
            </div>
          )}

          {/* ==================== STEP 5: Optional & Summary ==================== */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Itens Opcionais</h3>
                <p className="text-sm text-muted-foreground">
                  Estes campos são opcionais. Preencha apenas se aplicável à sua empresa.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Ativo Não Circulante
                </h4>
                {renderCurrency("Créditos a Receber (Longo Prazo)", "long_term_receivables", "Valores a receber com prazo superior a 12 meses")}
                {renderCurrency("Investimentos (Longo Prazo)", "long_term_investments", "Participações societárias, imóveis para renda, etc.")}

                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">
                  Intangível
                </h4>
                {renderCurrency("Ativos Intangíveis", "intangible_assets", "Softwares, marcas, patentes, direitos autorais")}
                {renderCurrency("(-) Amortização Acumulada", "accumulated_amortization", "Amortização já contabilizada dos intangíveis")}

                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">
                  Patrimônio Líquido
                </h4>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Capital Social
                  </label>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Capital social registrado na constituição da empresa. Carregado do CNPJ, mas editável.
                  </p>
                  <input
                    type="number"
                    step="0.01"
                    value={capitalSocial || ""}
                    onChange={(e) => setCapitalSocial(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50"
                  />
                </div>
                {renderCurrency("Reservas e Ajustes", "reserves_and_adjustments", "Reservas de capital, reservas de lucros, ajustes de avaliação patrimonial.")}
                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground italic">Lucros/Prejuízos Acumulados</span>
                    <p className="text-xs text-muted-foreground">Calculado automaticamente: Ativo - Passivo - Capital Social - Reservas</p>
                  </div>
                  <span className={`text-base font-bold tabular-nums ${lucrosAcumulados < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lucrosAcumulados)}
                  </span>
                </div>
              </div>

              {/* ============ BALANÇO GERENCIAL SUMMARY ============ */}
              <div className="bg-accent/50 rounded-xl p-5 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">Resumo do Balanço Inicial</h3>
                  <span className="text-xs text-muted-foreground">
                    Ref.: {new Date(data.reference_date + "T12:00:00").toLocaleDateString("pt-BR")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-2">
                  {/* ========== LEFT: ATIVO ========== */}
                  <div className="border border-border rounded-lg overflow-hidden text-sm">
                    {/* Ativo Circulante */}
                    <div className="bg-green-800 text-white px-3 py-1.5 font-bold text-xs uppercase tracking-wide flex justify-between">
                      <span>Ativo Circulante</span>
                      <span>{formatBRL(totalAtivoCirculante)}</span>
                    </div>
                    <div className="divide-y divide-border/50">
                      {[
                        ["Caixa e Equivalentes de Caixa", data.cash_and_equivalents],
                        ...(bankTotal > 0 ? [["Saldos em Contas Bancárias", bankTotal]] : []),
                        ["Aplicações Financeiras (curto prazo)", data.short_term_investments],
                        ["Clientes (Contas a Receber)", data.accounts_receivable],
                        ["Estoques", data.inventory],
                        ["Despesas Antecipadas e Outros", data.prepaid_expenses],
                      ].map(([label, val], i) => (
                        <div key={`ac${i}`} className="flex justify-between px-3 py-1 text-xs">
                          <span className="text-muted-foreground">{label as string}</span>
                          <span className="tabular-nums text-foreground">{formatBRL(val as number)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Ativo Não Circulante */}
                    <div className="bg-green-800 text-white px-3 py-1.5 font-bold text-xs uppercase tracking-wide flex justify-between">
                      <span>Ativo Não Circulante</span>
                      <span>{formatBRL(totalAtivoNaoCirculante)}</span>
                    </div>
                    <div className="divide-y divide-border/50">
                      {[
                        ["Créditos Diversos (LP)", data.long_term_receivables],
                        ["Outros Créditos (LP)", data.long_term_investments],
                      ].map(([label, val], i) => (
                        <div key={`anc${i}`} className="flex justify-between px-3 py-1 text-xs">
                          <span className="text-muted-foreground">{label as string}</span>
                          <span className="tabular-nums text-foreground">{formatBRL(val as number)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Imobilizado */}
                    <div className="bg-green-800 text-white px-3 py-1.5 font-bold text-xs uppercase tracking-wide flex justify-between">
                      <span>Imobilizado</span>
                      <span>{formatBRL(totalImobilizado)}</span>
                    </div>
                    <div className="divide-y divide-border/50">
                      {[
                        ["Imobilizado (Custo)", data.fixed_assets_land + data.fixed_assets_buildings + data.fixed_assets_machinery + data.fixed_assets_vehicles + data.fixed_assets_furniture + data.fixed_assets_computers + data.fixed_assets_other],
                        ["(-) Depreciação Acumulada", -data.accumulated_depreciation],
                      ].map(([label, val], i) => (
                        <div key={`imob${i}`} className="flex justify-between px-3 py-1 text-xs">
                          <span className="text-muted-foreground">{label as string}</span>
                          <span className={`tabular-nums ${(val as number) < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                            {formatBRL(val as number)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Intangível */}
                    <div className="bg-green-800 text-white px-3 py-1.5 font-bold text-xs uppercase tracking-wide flex justify-between">
                      <span>Intangível</span>
                      <span>{formatBRL(totalIntangivel)}</span>
                    </div>
                    <div className="divide-y divide-border/50">
                      {[
                        ["Intangível (Custo)", data.intangible_assets],
                        ["(-) Amortização Acumulada", -data.accumulated_amortization],
                      ].map(([label, val], i) => (
                        <div key={`intg${i}`} className="flex justify-between px-3 py-1 text-xs">
                          <span className="text-muted-foreground">{label as string}</span>
                          <span className={`tabular-nums ${(val as number) < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                            {formatBRL(val as number)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* TOTAL ATIVO */}
                    <div className="bg-green-900 text-white px-3 py-2 font-bold text-sm flex justify-between">
                      <span>TOTAL ATIVO</span>
                      <span className="tabular-nums">{formatBRL(totalAtivo)}</span>
                    </div>
                  </div>

                  {/* ========== RIGHT: PASSIVO + PL ========== */}
                  <div className="border border-border rounded-lg overflow-hidden text-sm">
                    {/* Passivo Circulante */}
                    <div className="bg-green-800 text-white px-3 py-1.5 font-bold text-xs uppercase tracking-wide flex justify-between">
                      <span>Passivo Circulante</span>
                      <span>{formatBRL(totalPassivoCirculante)}</span>
                    </div>
                    <div className="divide-y divide-border/50">
                      {[
                        ["Fornecedores", data.suppliers_payable],
                        ["Empréstimos e Financiamentos (CP)", data.short_term_loans],
                        ["Obrigações Trabalhistas e Sociais", data.labor_obligations],
                        ["Obrigações Fiscais", data.tax_obligations],
                        ["Provisões e Outros", data.other_current_liabilities],
                      ].map(([label, val], i) => (
                        <div key={`pc${i}`} className="flex justify-between px-3 py-1 text-xs">
                          <span className="text-muted-foreground">{label as string}</span>
                          <span className="tabular-nums text-foreground">{formatBRL(val as number)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Passivo Não Circulante */}
                    <div className="bg-green-800 text-white px-3 py-1.5 font-bold text-xs uppercase tracking-wide flex justify-between">
                      <span>Passivo Não Circulante</span>
                      <span>{formatBRL(totalPassivoNaoCirculante)}</span>
                    </div>
                    <div className="divide-y divide-border/50">
                      {[
                        ["Empréstimos e Financiamentos (LP)", data.long_term_loans + data.long_term_financing],
                        ["Provisões (LP)", data.provisions_long_term],
                        ["Passivos Fiscais Diferidos", data.deferred_tax_liabilities],
                      ].map(([label, val], i) => (
                        <div key={`pnc${i}`} className="flex justify-between px-3 py-1 text-xs">
                          <span className="text-muted-foreground">{label as string}</span>
                          <span className="tabular-nums text-foreground">{formatBRL(val as number)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Patrimônio Líquido */}
                    <div className="bg-green-800 text-white px-3 py-1.5 font-bold text-xs uppercase tracking-wide flex justify-between">
                      <span>Patrimônio Líquido</span>
                      <span>{formatBRL(patrimonioLiquido)}</span>
                    </div>
                    <div className="divide-y divide-border/50">
                      {[
                        ["Capital Social", capitalSocial],
                        ["Reservas e Ajustes", reservasEAjustes],
                        [lucrosAcumulados >= 0 ? "Lucro ou prejuízo do exercício" : "Lucro ou prejuízo do exercício", lucrosAcumulados],
                      ].map(([label, val], i) => (
                        <div key={`pl${i}`} className="flex justify-between px-3 py-1 text-xs">
                          <span className="text-muted-foreground">{label as string}</span>
                          <span className={`tabular-nums ${(val as number) < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                            {formatBRL(val as number)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* TOTAL PASSIVO + PL */}
                    <div className="bg-green-900 text-white px-3 py-2 font-bold text-sm flex justify-between">
                      <span>TOTAL PASSIVO + PL</span>
                      <span className="tabular-nums">{formatBRL(totalPassivo + patrimonioLiquido)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Navigation */}
        <div className="p-4 border-t border-border bg-accent/30 rounded-b-2xl flex items-center justify-between">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {onSkip && (
              <button
                onClick={onSkip}
                className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent"
              >
                Preencher depois
              </button>
            )}

            <button
              onClick={saveProgress}
              disabled={isSaving}
              className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Progresso"}
            </button>

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={() => {
                  // When moving from step 0 (bank accounts) to step 1 (ativo circulante),
                  // pre-populate cash_and_equivalents with bank totals if not already set
                  if (currentStep === 0 && bankTotal > 0 && !data.cash_and_equivalents) {
                    setData((prev) => ({ ...prev, cash_and_equivalents: bankTotal }));
                  }
                  setCurrentStep((s) => s + 1);
                }}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#0d767b] text-white rounded-lg text-sm font-semibold hover:bg-[#095a5e] transition-colors shadow-md"
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={completeWizard}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-[#0d767b] to-[#095a5e] text-white rounded-lg text-sm font-semibold hover:from-[#095a5e] hover:to-[#074a4e] transition-all shadow-md disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Finalizar
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
