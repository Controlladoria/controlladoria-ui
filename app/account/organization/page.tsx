'use client';

/**
 * Organization Settings Page
 * Tabs: Company Info | Bank Accounts | Initial Balances
 * Only accessible to owners and admins.
 */

import { useState, useEffect } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { toast } from 'sonner';
import {
  Building2,
  Save,
  Loader2,
  Landmark,
  Plus,
  Trash2,
  Search,
  Edit3,
  X,
  Check,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  FileText,
  ImagePlus,
} from 'lucide-react';
import {
  orgSettingsApi,
  initialBalanceApi,
  type CompanyInfo,
  type CompanyInfoUpdate,
  type BankAccount,
  type BankInfo,
  type InitialBalanceData,
  createEmptyInitialBalance,
} from '@/lib/initial-balance-api';

type TabKey = 'company' | 'banks' | 'balances';

export default function OrganizationSettingsPage() {
  const { user } = useAuth();
  const { activeOrg } = useOrganization();
  const { planTier } = useSubscription();
  const canUploadLogo = planTier === 'pro' || planTier === 'max';
  const [activeTab, setActiveTab] = useState<TabKey>('company');
  const [isLoading, setIsLoading] = useState(true);

  // Company info state
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [companyEditing, setCompanyEditing] = useState(false);
  const [companyForm, setCompanyForm] = useState<CompanyInfoUpdate>({});
  const [companySaving, setCompanySaving] = useState(false);

  // Bank accounts state
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [allBanks, setAllBanks] = useState<BankInfo[]>([]);
  const [addingBank, setAddingBank] = useState(false);
  const [newBank, setNewBank] = useState<Partial<BankAccount>>({
    bank_code: '', bank_name: '', agency: '', account_number: '', account_type: 'checking', account_nickname: '',
  });
  const [bankSearch, setBankSearch] = useState('');
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);

  // Initial balance state
  const [initialBalance, setInitialBalance] = useState<InitialBalanceData | null>(null);
  const [balanceEditing, setBalanceEditing] = useState(false);
  const [balanceForm, setBalanceForm] = useState(createEmptyInitialBalance());
  const [balanceSaving, setBalanceSaving] = useState(false);

  // Logo state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeOrg]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [company, accounts, banks, balance, logoData] = await Promise.all([
        orgSettingsApi.getCompanyInfo().catch(() => null),
        orgSettingsApi.listBankAccounts().catch(() => []),
        orgSettingsApi.lookupBanks().catch(() => []),
        initialBalanceApi.get().catch(() => null),
        orgSettingsApi.getLogo().catch(() => null),
      ]);

      if (company) setCompanyInfo(company);
      setBankAccounts(accounts);
      setAllBanks(banks);
      if (balance) {
        setInitialBalance(balance);
        setBalanceForm(balance as any);
      }
      if (logoData?.logo_url) setLogoUrl(logoData.logo_url);
    } catch (error) {
      console.error('Error loading org settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Company info handlers
  const startEditCompany = () => {
    if (companyInfo) {
      setCompanyForm({
        company_name: companyInfo.company_name,
        trade_name: companyInfo.trade_name || '',
        company_address_street: companyInfo.company_address_street || '',
        company_address_number: companyInfo.company_address_number || '',
        company_address_complement: companyInfo.company_address_complement || '',
        company_address_district: companyInfo.company_address_district || '',
        company_address_city: companyInfo.company_address_city || '',
        company_address_state: companyInfo.company_address_state || '',
        company_address_zip: companyInfo.company_address_zip || '',
        company_phone: companyInfo.company_phone || '',
        company_email: companyInfo.company_email || '',
        regime_tributario: companyInfo.regime_tributario || '',
      });
    }
    setCompanyEditing(true);
  };

  const saveCompany = async () => {
    setCompanySaving(true);
    try {
      const updated = await orgSettingsApi.updateCompanyInfo(companyForm);
      setCompanyInfo(updated);
      setCompanyEditing(false);
      toast.success('Dados da empresa atualizados!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar dados.');
    } finally {
      setCompanySaving(false);
    }
  };

  // Bank account handlers
  const addBankAccount = async () => {
    if (!newBank.bank_code || !newBank.agency || !newBank.account_number) {
      toast.error('Preencha banco, agência e conta.');
      return;
    }
    setBankSaving(true);
    try {
      const saved = await orgSettingsApi.addBankAccount(newBank as any);
      setBankAccounts((prev) => [...prev, saved]);
      setAddingBank(false);
      setNewBank({ bank_code: '', bank_name: '', agency: '', account_number: '', account_type: 'checking', account_nickname: '' });
      toast.success('Conta bancária adicionada!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erro ao adicionar conta.');
    } finally {
      setBankSaving(false);
    }
  };

  const deleteBankAccount = async (id: number) => {
    try {
      await orgSettingsApi.deleteBankAccount(id);
      setBankAccounts((prev) => prev.filter((a) => a.id !== id));
      toast.success('Conta removida.');
    } catch (error: any) {
      toast.error('Erro ao remover conta.');
    }
  };

  // Balance handlers
  const saveBalance = async () => {
    setBalanceSaving(true);
    try {
      const saved = await initialBalanceApi.save({
        ...balanceForm,
        is_completed: true,
      });
      setInitialBalance(saved);
      setBalanceEditing(false);
      toast.success('Saldos iniciais atualizados!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar saldos.');
    } finally {
      setBalanceSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const result = await orgSettingsApi.uploadLogo(file);
      const logoData = await orgSettingsApi.getLogo().catch(() => null);
      setLogoUrl(logoData?.logo_url ?? null);
      toast.success('Logo atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erro ao fazer upload do logo.');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const handleLogoDelete = async () => {
    setLogoUploading(true);
    try {
      await orgSettingsApi.deleteLogo();
      setLogoUrl(null);
      toast.success('Logo removido.');
    } catch {
      toast.error('Erro ao remover logo.');
    } finally {
      setLogoUploading(false);
    }
  };

  const parseCurrencyInput = (value: string): number => {
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const filteredBanks = allBanks.filter(
    (b) =>
      b.code !== null &&
      (b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
        b.full_name.toLowerCase().includes(bankSearch.toLowerCase()) ||
        String(b.code).includes(bankSearch))
  );

  const BalanceField = ({ label, field }: { label: string; field: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm sm:text-base text-foreground">{label}</span>
      {balanceEditing ? (
        <div className="relative w-44">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
          <input
            type="text"
            value={(balanceForm as any)[field] === 0 ? '' : String((balanceForm as any)[field])}
            onChange={(e) =>
              setBalanceForm((prev) => ({ ...prev, [field]: parseCurrencyInput(e.target.value) }))
            }
            placeholder="0,00"
            className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-lg text-base text-right text-foreground focus:outline-none focus:ring-1 focus:ring-[#0d767b]"
          />
        </div>
      ) : (
        <span className="text-sm sm:text-base font-medium text-foreground">
          {formatBRL((initialBalance as any)?.[field] || 0)}
        </span>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden lg:pt-0">
        <div className="hidden lg:block h-2 bg-gradient-to-r from-[#095a5e] via-[#0d767b] to-[#1a9da3] dark:from-[#d15a12] dark:via-[#f86a15] dark:to-[#fa8c4a]" />

        <header className="bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 pt-16 lg:pt-4 pb-4 sm:py-6">
            <div className="flex flex-col lg:flex-row items-center gap-3 text-center lg:text-left">
              <div className="w-14 h-14 bg-gradient-to-br from-[#0d767b] to-[#095a5e] rounded-xl flex items-center justify-center text-white shadow-lg">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Configurações da Empresa
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                  {companyInfo?.company_name || activeOrg?.company_name || 'Empresa'}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="max-w-4xl mx-auto">
            {/* Tabs */}
            <div className="flex flex-wrap gap-1 mb-6 sm:mb-8 bg-accent/50 p-1.5 rounded-xl w-fit">
              {[
                { key: 'company' as TabKey, label: 'Dados da Empresa', icon: Building2 },
                { key: 'banks' as TabKey, label: 'Contas Bancárias', icon: Landmark },
                { key: 'balances' as TabKey, label: 'Saldos Iniciais', icon: DollarSign },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-card text-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <tab.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ==================== COMPANY INFO TAB ==================== */}
            {activeTab === 'company' && companyInfo && (
              <div className="bg-card rounded-xl shadow-xl p-6 sm:p-8 lg:p-10 border-2 border-border">
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground">Dados da Empresa</h2>
                  {companyEditing ? (
                    <div className="flex gap-2">
                      <button onClick={() => setCompanyEditing(false)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent">
                        <X className="w-4 h-4" />
                      </button>
                      <button onClick={saveCompany} disabled={companySaving} className="flex items-center gap-1.5 px-5 py-2 bg-[#0d767b] text-white rounded-lg text-sm sm:text-base font-medium hover:bg-[#095a5e] disabled:opacity-50">
                        {companySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar
                      </button>
                    </div>
                  ) : (
                    <button onClick={startEditCompany} className="flex items-center gap-1.5 px-5 py-2 text-sm sm:text-base font-medium text-[#0d767b] hover:bg-[#0d767b]/10 rounded-lg transition-colors">
                      <Edit3 className="w-4 h-4" />
                      Editar
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* CNPJ - read only */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">CNPJ</label>
                    <p className="text-base font-mono text-foreground bg-accent/50 px-4 py-3 rounded-lg">{companyInfo.cnpj}</p>
                  </div>

                  {/* Editable fields */}
                  {companyEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Razão Social</label>
                        <input value={companyForm.company_name || ''} onChange={(e) => setCompanyForm((p) => ({ ...p, company_name: e.target.value }))} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Nome Fantasia</label>
                        <input value={companyForm.trade_name || ''} onChange={(e) => setCompanyForm((p) => ({ ...p, trade_name: e.target.value }))} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50" />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Rua</label>
                          <input value={companyForm.company_address_street || ''} onChange={(e) => setCompanyForm((p) => ({ ...p, company_address_street: e.target.value }))} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Número</label>
                          <input value={companyForm.company_address_number || ''} onChange={(e) => setCompanyForm((p) => ({ ...p, company_address_number: e.target.value }))} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Cidade</label>
                          <input value={companyForm.company_address_city || ''} onChange={(e) => setCompanyForm((p) => ({ ...p, company_address_city: e.target.value }))} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Estado</label>
                          <input value={companyForm.company_address_state || ''} onChange={(e) => setCompanyForm((p) => ({ ...p, company_address_state: e.target.value }))} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50" maxLength={2} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Telefone</label>
                          <input value={companyForm.company_phone || ''} onChange={(e) => setCompanyForm((p) => ({ ...p, company_phone: e.target.value }))} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1.5">E-mail</label>
                          <input value={companyForm.company_email || ''} onChange={(e) => setCompanyForm((p) => ({ ...p, company_email: e.target.value }))} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <InfoRow icon={Building2} label="Razão Social" value={companyInfo.company_name} />
                      <InfoRow icon={FileText} label="Nome Fantasia" value={companyInfo.trade_name} />
                      <InfoRow icon={MapPin} label="Endereço" value={[companyInfo.company_address_street, companyInfo.company_address_number, companyInfo.company_address_city, companyInfo.company_address_state].filter(Boolean).join(', ')} />
                      <InfoRow icon={Phone} label="Telefone" value={companyInfo.company_phone} />
                      <InfoRow icon={Mail} label="E-mail" value={companyInfo.company_email} />
                      {companyInfo.regime_tributario && <InfoRow icon={FileText} label="Regime Tributário" value={companyInfo.regime_tributario} />}
                      {companyInfo.main_partner_name && <InfoRow icon={FileText} label="Sócio Principal" value={companyInfo.main_partner_name} />}
                    </div>
                  )}
                </div>

                {/* Logo Upload Section */}
                <div className="mt-8 pt-8 border-t border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Logo da Empresa</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Usado como marca d'água nos PDFs e Excels exportados</p>
                    </div>
                  </div>
                  {canUploadLogo ? (
                    <>
                      <div className="flex items-center gap-4">
                        {logoUrl ? (
                          <>
                            <img src={logoUrl} alt="Logo da empresa" className="h-14 w-auto object-contain rounded-lg border border-border bg-muted/20 p-1" />
                            <div className="flex gap-2">
                              <label className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors ${logoUploading ? 'opacity-50 pointer-events-none' : 'bg-[#0d767b]/10 text-[#0d767b] hover:bg-[#0d767b]/20'}`}>
                                <ImagePlus className="w-4 h-4" />
                                Trocar
                                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
                              </label>
                              <button onClick={handleLogoDelete} disabled={logoUploading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
                                {logoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Remover
                              </button>
                            </div>
                          </>
                        ) : (
                          <label className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-colors ${logoUploading ? 'opacity-50 pointer-events-none' : 'bg-[#0d767b] text-white hover:bg-[#095a5e]'}`}>
                            {logoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                            {logoUploading ? 'Enviando...' : 'Fazer Upload do Logo'}
                            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                          </label>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">PNG, JPEG ou WebP · máx. 2 MB</p>
                    </>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
                      <ImagePlus className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        Upload de logo disponível nos planos <strong>Pro</strong> e <strong>Max</strong>. Faça upgrade para personalizar seus relatórios.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ==================== BANK ACCOUNTS TAB ==================== */}
            {activeTab === 'banks' && (
              <div className="bg-card rounded-xl shadow-xl p-6 sm:p-8 lg:p-10 border-2 border-border">
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground">Contas Bancárias</h2>
                  <button
                    onClick={() => setAddingBank(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#0d767b] text-white rounded-lg text-sm sm:text-base font-medium hover:bg-[#095a5e] transition-colors"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    Nova Conta
                  </button>
                </div>

                {/* Add bank form */}
                {addingBank && (
                  <div className="bg-accent/30 rounded-xl p-4 border border-border mb-4 space-y-3">
                    <div className="relative">
                      <label className="block text-sm font-medium text-muted-foreground mb-1.5">Banco</label>
                      <input
                        type="text"
                        value={newBank.bank_name ? `${newBank.bank_code} - ${newBank.bank_name}` : bankSearch}
                        onChange={(e) => {
                          setBankSearch(e.target.value);
                          setShowBankDropdown(true);
                          if (!e.target.value) { setNewBank((p) => ({ ...p, bank_code: '', bank_name: '' })); }
                        }}
                        onFocus={() => setShowBankDropdown(true)}
                        placeholder="Buscar banco..."
                        className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50"
                      />
                      <Search className="absolute left-2.5 top-8 w-4 h-4 text-muted-foreground" />
                      {showBankDropdown && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                          {filteredBanks.slice(0, 30).map((bank) => (
                            <button key={bank.ispb} onClick={() => { setNewBank((p) => ({ ...p, bank_code: String(bank.code), bank_name: bank.full_name || bank.name })); setShowBankDropdown(false); setBankSearch(''); }} className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors">
                              <span className="font-medium">{bank.code}</span> — {bank.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Agência</label>
                        <input value={newBank.agency || ''} onChange={(e) => setNewBank((p) => ({ ...p, agency: e.target.value }))} placeholder="1234-5" className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Conta</label>
                        <input value={newBank.account_number || ''} onChange={(e) => setNewBank((p) => ({ ...p, account_number: e.target.value }))} placeholder="12345-6" className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Tipo</label>
                        <select value={newBank.account_type} onChange={(e) => setNewBank((p) => ({ ...p, account_type: e.target.value }))} className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d767b]/50">
                          <option value="checking">Corrente</option>
                          <option value="savings">Poupança</option>
                          <option value="investment">Investimento</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={addBankAccount} disabled={bankSaving} className="flex items-center gap-1.5 px-4 py-2 bg-[#0d767b] text-white rounded-lg text-sm font-medium hover:bg-[#095a5e] disabled:opacity-50">
                        {bankSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Adicionar
                      </button>
                      <button onClick={() => setAddingBank(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Bank accounts list */}
                {bankAccounts.length === 0 ? (
                  <div className="text-center py-16 bg-accent/30 rounded-xl border-2 border-dashed border-border">
                    <Landmark className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-base text-muted-foreground">Nenhuma conta bancária cadastrada</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bankAccounts.map((acc) => (
                      <div key={acc.id} className="flex items-center justify-between p-4 sm:p-5 bg-accent/30 rounded-xl border border-border">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#0d767b] to-[#095a5e] rounded-lg flex items-center justify-center text-white text-sm font-bold">
                            {acc.bank_code}
                          </div>
                          <div>
                            <p className="text-base font-semibold text-foreground">
                              {acc.bank_name}
                              {acc.account_nickname ? ` (${acc.account_nickname})` : ''}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Ag: {acc.agency} | Conta: {acc.account_number} | {acc.account_type === 'checking' ? 'Corrente' : acc.account_type === 'savings' ? 'Poupança' : 'Investimento'}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => acc.id && deleteBankAccount(acc.id)} className="text-destructive hover:text-destructive/80 p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==================== INITIAL BALANCES TAB ==================== */}
            {activeTab === 'balances' && (
              <div className="bg-card rounded-xl shadow-xl p-6 sm:p-8 lg:p-10 border-2 border-border">
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-foreground">Saldos Iniciais</h2>
                    {initialBalance?.reference_date && (
                      <p className="text-xs text-muted-foreground">
                        Data de referência: {new Date(initialBalance.reference_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  {balanceEditing ? (
                    <div className="flex gap-2">
                      <button onClick={() => setBalanceEditing(false)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent">
                        <X className="w-4 h-4" />
                      </button>
                      <button onClick={saveBalance} disabled={balanceSaving} className="flex items-center gap-1.5 px-5 py-2 bg-[#0d767b] text-white rounded-lg text-sm sm:text-base font-medium hover:bg-[#095a5e] disabled:opacity-50">
                        {balanceSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setBalanceEditing(true)} className="flex items-center gap-1.5 px-5 py-2 text-sm sm:text-base font-medium text-[#0d767b] hover:bg-[#0d767b]/10 rounded-lg transition-colors">
                      <Edit3 className="w-4 h-4" />
                      Editar
                    </button>
                  )}
                </div>

                {balanceEditing && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Data de Referência</label>
                    <DatePicker
                      value={balanceForm.reference_date ? new Date(balanceForm.reference_date + 'T12:00:00') : undefined}
                      onChange={(d) => setBalanceForm((p) => ({ ...p, reference_date: d ? format(d, 'yyyy-MM-dd') : '' }))}
                      placeholder="Selecione a data de referência"
                    />
                  </div>
                )}

                {!initialBalance && !balanceEditing ? (
                  <div className="text-center py-16 bg-accent/30 rounded-xl border-2 border-dashed border-border">
                    <DollarSign className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-base text-muted-foreground">Nenhum saldo inicial configurado</p>
                    <p className="text-sm text-muted-foreground mt-1">Clique em Editar para começar</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Section title="Ativo Circulante">
                      <BalanceField label="Caixa e Equivalentes" field="cash_and_equivalents" />
                      <BalanceField label="Aplicações Financeiras CP" field="short_term_investments" />
                      <BalanceField label="Contas a Receber" field="accounts_receivable" />
                      <BalanceField label="Estoques" field="inventory" />
                      <BalanceField label="Despesas Antecipadas" field="prepaid_expenses" />
                    </Section>

                    <Section title="Ativo Não Circulante">
                      <BalanceField label="Créditos LP" field="long_term_receivables" />
                      <BalanceField label="Investimentos LP" field="long_term_investments" />
                    </Section>

                    <Section title="Imobilizado">
                      <BalanceField label="Terrenos" field="fixed_assets_land" />
                      <BalanceField label="Prédios" field="fixed_assets_buildings" />
                      <BalanceField label="Máquinas" field="fixed_assets_machinery" />
                      <BalanceField label="Veículos" field="fixed_assets_vehicles" />
                      <BalanceField label="Móveis" field="fixed_assets_furniture" />
                      <BalanceField label="Computadores" field="fixed_assets_computers" />
                      <BalanceField label="Outros" field="fixed_assets_other" />
                      <BalanceField label="(-) Depreciação Acumulada" field="accumulated_depreciation" />
                    </Section>

                    <Section title="Intangível">
                      <BalanceField label="Ativos Intangíveis" field="intangible_assets" />
                      <BalanceField label="(-) Amortização Acumulada" field="accumulated_amortization" />
                    </Section>

                    <Section title="Passivo Circulante">
                      <BalanceField label="Fornecedores" field="suppliers_payable" />
                      <BalanceField label="Empréstimos CP" field="short_term_loans" />
                      <BalanceField label="Obrigações Trabalhistas" field="labor_obligations" />
                      <BalanceField label="Obrigações Fiscais" field="tax_obligations" />
                      <BalanceField label="Outras Contas a Pagar" field="other_current_liabilities" />
                    </Section>

                    <Section title="Passivo Não Circulante">
                      <BalanceField label="Empréstimos LP" field="long_term_loans" />
                      <BalanceField label="Financiamentos LP" field="long_term_financing" />
                    </Section>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper components
function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-3">
      <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-base text-foreground">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm sm:text-base font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</h3>
      <div className="bg-accent/30 rounded-xl px-4 sm:px-5">{children}</div>
    </div>
  );
}
