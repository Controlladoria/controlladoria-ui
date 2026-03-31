'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import { toast } from 'sonner';
import { User, Building2, Hash, Save, X, Sun, Moon, Monitor, Type, ArrowUpDown, GripVertical, ChevronUp, ChevronDown, MapPin, Phone, Mail, Calendar, Briefcase, Users, Shield, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

function ProfilePageContent() {
  const { user, updateProfile, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { fontSize, setFontSize } = useFontSize();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    company_name: user?.company_name || '',
    cnpj: user?.cnpj || '',
  });
  const [reportTabOrder, setReportTabOrder] = useState<string[]>(
    ((user as any)?.report_tab_order || 'dre,balanco,fluxo,indicadores').split(',')
  );
  const [mfaStatus, setMfaStatus] = useState<{ enabled: boolean; method: string | null; backup_codes_remaining: number } | null>(null);

  // Fetch MFA status on mount
  useEffect(() => {
    api.get('/auth/mfa/status')
      .then(res => setMfaStatus(res.data))
      .catch(() => setMfaStatus({ enabled: false, method: null, backup_codes_remaining: 0 }));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile(formData);
      toast.success('Perfil atualizado com sucesso!');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error(error.response?.data?.detail || 'Erro ao atualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: user?.full_name || '',
      company_name: user?.company_name || '',
      cnpj: user?.cnpj || '',
    });
    setIsEditing(false);
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return value;
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setFormData({ ...formData, cnpj: formatted });
  };

  const tabLabels: Record<string, string> = {
    dre: 'DRE',
    balanco: 'Balanço Gerencial',
    fluxo: 'Fluxo de Caixa',
    indicadores: 'Indicadores',
  };

  const moveTab = async (index: number, direction: 'up' | 'down') => {
    const newOrder = [...reportTabOrder];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    setReportTabOrder(newOrder);
    try {
      await api.patch('/auth/me/report-tab-order', { order: newOrder.join(',') });
      // Refresh user context so other pages pick up the new order
      await refreshUser();
    } catch (error) {
      console.error('Failed to save report tab order:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-accent/20 to-accent/40 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden lg:pt-0">
        {/* Top Header */}
        <header className="bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 pt-16 lg:pt-4 pb-4 sm:py-6">
            <div className="text-center lg:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Meu Perfil</h1>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-1">Gerencie suas informações e preferências</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
            {/* Account Info Card */}
            <div className="bg-card rounded-xl shadow-xl p-6 sm:p-8 lg:p-10 border-2 border-border">
              <div className="flex flex-col sm:flex-row items-start justify-between mb-6 sm:mb-8 gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Informações da Conta</h2>
                  <p className="text-muted-foreground text-base sm:text-lg">Atualize seus dados cadastrais</p>
                </div>
                {!isEditing && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-gradient-to-r from-[#0d767b] to-[#095a5e] hover:from-[#095a5e] hover:to-[#084a4e] text-white text-base sm:text-lg font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-xl w-full sm:w-auto whitespace-nowrap"
                  >
                    Editar Perfil
                  </Button>
                )}
              </div>

              <div className="space-y-6">
                {/* Email (Read-only) */}
                <div className="bg-muted/50 rounded-lg p-6 border-2 border-border">
                  <label className="flex items-center gap-2 text-base font-semibold text-foreground mb-3">
                    E-mail
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="email"
                      value={user.email}
                      disabled
                      className="text-lg font-medium bg-muted cursor-not-allowed"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      (não editável)
                    </span>
                  </div>
                </div>

                {/* Full Name */}
                <div className={`rounded-lg p-6 border-2 ${isEditing ? 'bg-blue-500/10 border-blue-500/30 dark:bg-blue-500/20 dark:border-blue-500/40' : 'bg-muted/50 border-border'}`}>
                  <label className="flex items-center gap-2 text-base font-semibold text-foreground mb-3">
                    <User className="w-5 h-5" />
                    Nome Completo
                  </label>
                  <Input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    disabled={!isEditing}
                    className={`text-lg font-medium ${!isEditing ? 'bg-background cursor-default' : 'bg-background'}`}
                    placeholder="Seu nome completo"
                  />
                </div>

                {/* Company Name */}
                <div className={`rounded-lg p-6 border-2 ${isEditing ? 'bg-blue-500/10 border-blue-500/30 dark:bg-blue-500/20 dark:border-blue-500/40' : 'bg-muted/50 border-border'}`}>
                  <label className="flex items-center gap-2 text-base font-semibold text-foreground mb-3">
                    <Building2 className="w-5 h-5" />
                    Nome da Empresa
                  </label>
                  <Input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    disabled={!isEditing}
                    className={`text-lg font-medium ${!isEditing ? 'bg-background cursor-default' : 'bg-background'}`}
                    placeholder="Nome da sua empresa"
                  />
                </div>

                {/* CNPJ */}
                <div className={`rounded-lg p-6 border-2 ${isEditing ? 'bg-blue-500/10 border-blue-500/30 dark:bg-blue-500/20 dark:border-blue-500/40' : 'bg-muted/50 border-border'}`}>
                  <label className="flex items-center gap-2 text-base font-semibold text-foreground mb-3">
                    <Hash className="w-5 h-5" />
                    CNPJ
                  </label>
                  <Input
                    type="text"
                    value={formData.cnpj}
                    onChange={handleCNPJChange}
                    disabled={!isEditing}
                    className={`text-lg font-medium ${!isEditing ? 'bg-background cursor-default' : 'bg-background'}`}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                </div>

                {/* Company Data (from CNPJ lookup) */}
                {(user as any)?.cnae_code || (user as any)?.company_address_city ? (
                  <div className="bg-[#0d767b]/5 dark:bg-[#0d767b]/10 rounded-xl p-6 border-2 border-[#0d767b]/20">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-[#0d767b] mb-4">
                      <Briefcase className="w-5 h-5" />
                      Dados da Empresa (Receita Federal)
                    </h3>
                    <div className="space-y-4">
                      {/* Row: Trade Name + Status */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(user as any)?.trade_name && (
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Nome Fantasia</label>
                            <p className="text-sm text-foreground bg-card rounded-lg px-3 py-2 border border-border">{(user as any).trade_name}</p>
                          </div>
                        )}
                        {(user as any)?.company_status && (
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Situação Cadastral</label>
                            <p className={`text-sm rounded-lg px-3 py-2 border font-medium ${(user as any).company_status?.toLowerCase().includes('ativa') ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                              {(user as any).company_status}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Row: CNAE + Legal Nature */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(user as any)?.cnae_code && (
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">CNAE Principal</label>
                            <p className="text-sm text-foreground bg-card rounded-lg px-3 py-2 border border-border">
                              {(user as any).cnae_code}{(user as any).cnae_description ? ` — ${(user as any).cnae_description}` : ''}
                            </p>
                          </div>
                        )}
                        {(user as any)?.legal_nature && (
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Natureza Jurídica</label>
                            <p className="text-sm text-foreground bg-card rounded-lg px-3 py-2 border border-border">{(user as any).legal_nature}</p>
                          </div>
                        )}
                      </div>

                      {/* Address */}
                      {((user as any)?.company_address_street || (user as any)?.company_address_city) && (
                        <div>
                          <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mb-1">
                            <MapPin className="w-3 h-3" />Endereço
                          </label>
                          <p className="text-sm text-foreground bg-card rounded-lg px-3 py-2 border border-border">
                            {[
                              (user as any).company_address_street,
                              (user as any).company_address_number,
                              (user as any).company_address_complement,
                              (user as any).company_address_district,
                              (user as any).company_address_city && (user as any).company_address_state
                                ? `${(user as any).company_address_city}/${(user as any).company_address_state}`
                                : (user as any).company_address_city,
                              (user as any).company_address_zip,
                            ].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      )}

                      {/* Row: Size + Capital + Opening Date */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(user as any)?.company_size && (
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Porte</label>
                            <p className="text-sm text-foreground bg-card rounded-lg px-3 py-2 border border-border">{(user as any).company_size}</p>
                          </div>
                        )}
                        {(user as any)?.capital_social != null && (
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Capital Social</label>
                            <p className="text-sm text-foreground bg-card rounded-lg px-3 py-2 border border-border">
                              R$ {Number((user as any).capital_social).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}
                        {(user as any)?.company_opened_at && (
                          <div>
                            <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mb-1">
                              <Calendar className="w-3 h-3" />Abertura
                            </label>
                            <p className="text-sm text-foreground bg-card rounded-lg px-3 py-2 border border-border">{(user as any).company_opened_at}</p>
                          </div>
                        )}
                      </div>

                      {/* Row: Simples + MEI + Phone + Email */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(user as any)?.is_simples_nacional != null && (
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Simples</label>
                            <p className={`text-sm rounded-lg px-3 py-2 border font-medium ${(user as any).is_simples_nacional ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'text-muted-foreground bg-card border-border'}`}>
                              {(user as any).is_simples_nacional ? 'Sim' : 'Não'}
                            </p>
                          </div>
                        )}
                        {(user as any)?.is_mei != null && (
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">MEI</label>
                            <p className={`text-sm rounded-lg px-3 py-2 border font-medium ${(user as any).is_mei ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'text-muted-foreground bg-card border-border'}`}>
                              {(user as any).is_mei ? 'Sim' : 'Não'}
                            </p>
                          </div>
                        )}
                        {(user as any)?.company_phone && (
                          <div>
                            <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mb-1">
                              <Phone className="w-3 h-3" />Telefone
                            </label>
                            <p className="text-sm text-foreground bg-card rounded-lg px-3 py-2 border border-border">{(user as any).company_phone}</p>
                          </div>
                        )}
                        {(user as any)?.company_email && (
                          <div>
                            <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mb-1">
                              <Mail className="w-3 h-3" />Email
                            </label>
                            <p className="text-sm text-foreground bg-card rounded-lg px-3 py-2 border border-border truncate">{(user as any).company_email}</p>
                          </div>
                        )}
                      </div>

                      {/* Headquarters indicator */}
                      {(user as any)?.is_headquarters != null && (
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo de Estabelecimento</label>
                          <p className="text-sm text-foreground bg-card rounded-lg px-3 py-2 border border-border">
                            {(user as any).is_headquarters ? '🏢 Matriz' : '🏪 Filial'}
                          </p>
                        </div>
                      )}

                      {/* Main Partner */}
                      {(user as any)?.main_partner_name && (
                        <div className="border-t border-[#0d767b]/20 pt-4">
                          <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mb-1">
                            <Users className="w-3 h-3" />Sócio-Administrador Principal
                          </label>
                          <p className="text-sm text-foreground bg-card rounded-lg px-3 py-2 border border-border">
                            {(user as any).main_partner_name}
                            {(user as any)?.main_partner_qualification && (
                              <span className="text-xs text-muted-foreground ml-2">({(user as any).main_partner_qualification})</span>
                            )}
                          </p>
                        </div>
                      )}

                      {/* All QSA Partners */}
                      {(user as any)?.qsa_partners && (user as any).qsa_partners.length > 1 && (
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-2">
                            Quadro Societário ({(user as any).qsa_partners.length} sócios)
                          </label>
                          <div className="space-y-1.5">
                            {(user as any).qsa_partners.map((partner: any, idx: number) => (
                              <div key={idx} className="text-xs text-foreground bg-card rounded px-3 py-1.5 border border-border flex justify-between items-center">
                                <span className="font-medium">{partner.nome}</span>
                                <span className="text-muted-foreground">{partner.qualificacao}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Secondary CNAEs */}
                      {(user as any)?.cnaes_secundarios && (user as any).cnaes_secundarios.length > 0 && (
                        <div className="border-t border-[#0d767b]/20 pt-4">
                          <label className="block text-xs font-semibold text-muted-foreground mb-2">
                            CNAEs Secundários ({(user as any).cnaes_secundarios.length})
                          </label>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {(user as any).cnaes_secundarios.map((cnae: any, idx: number) => (
                              <p key={idx} className="text-xs text-muted-foreground bg-card rounded px-3 py-1 border border-border">
                                <span className="font-mono">{cnae.codigo}</span>{' — '}{cnae.descricao}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Action Buttons (when editing) */}
                {isEditing && (
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-base sm:text-lg font-bold py-4 sm:py-6 rounded-xl shadow-lg"
                    >
                      <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      className="flex-1 text-base sm:text-lg font-bold py-4 sm:py-6 rounded-xl border-2"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Preferences Card */}
            <div className="bg-card rounded-xl shadow-xl p-6 sm:p-8 lg:p-10 border-2 border-border">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">Preferências</h2>

              <div className="space-y-8">
                {/* Dark Mode */}
                <div>
                  <label className="flex items-center gap-2 text-base font-semibold text-foreground mb-4">
                    <Sun className="w-5 h-5" />
                    Tema
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        theme === 'light'
                          ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/20'
                          : 'border-border hover:border-blue-300'
                      }`}
                    >
                      <Sun className={`w-6 h-6 ${theme === 'light' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${theme === 'light' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>
                        Claro
                      </span>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        theme === 'dark'
                          ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/20'
                          : 'border-border hover:border-blue-300'
                      }`}
                    >
                      <Moon className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>
                        Escuro
                      </span>
                    </button>
                    <button
                      onClick={() => setTheme('system')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        theme === 'system'
                          ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/20'
                          : 'border-border hover:border-blue-300'
                      }`}
                    >
                      <Monitor className={`w-6 h-6 ${theme === 'system' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${theme === 'system' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>
                        Sistema
                      </span>
                    </button>
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <label className="flex items-center gap-2 text-base font-semibold text-foreground mb-4">
                    <Type className="w-5 h-5" />
                    Tamanho da Fonte
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setFontSize('small')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        fontSize === 'small'
                          ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/20'
                          : 'border-border hover:border-blue-300'
                      }`}
                    >
                      <span className={`text-xs font-bold ${fontSize === 'small' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>
                        Aa
                      </span>
                      <span className={`text-sm font-medium ${fontSize === 'small' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>
                        Pequeno
                      </span>
                    </button>
                    <button
                      onClick={() => setFontSize('medium')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        fontSize === 'medium'
                          ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/20'
                          : 'border-border hover:border-blue-300'
                      }`}
                    >
                      <span className={`text-base font-bold ${fontSize === 'medium' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>
                        Aa
                      </span>
                      <span className={`text-sm font-medium ${fontSize === 'medium' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>
                        Médio
                      </span>
                    </button>
                    <button
                      onClick={() => setFontSize('large')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        fontSize === 'large'
                          ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/20'
                          : 'border-border hover:border-blue-300'
                      }`}
                    >
                      <span className={`text-xl font-bold ${fontSize === 'large' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>
                        Aa
                      </span>
                      <span className={`text-sm font-medium ${fontSize === 'large' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>
                        Grande
                      </span>
                    </button>
                  </div>
                </div>

                {/* Report Tab Order */}
                <div>
                  <label className="flex items-center gap-2 text-base font-semibold text-foreground mb-4">
                    <ArrowUpDown className="w-5 h-5" />
                    Ordem dos Relatórios
                  </label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Defina a ordem das abas na página de Relatórios
                  </p>
                  <div className="space-y-2">
                    {reportTabOrder.map((tab, index) => (
                      <div
                        key={tab}
                        className="flex items-center gap-3 p-3 rounded-xl border-2 border-border bg-muted/50"
                      >
                        <GripVertical className="w-5 h-5 text-muted-foreground" />
                        <span className="flex-1 text-base font-medium text-foreground">
                          {index + 1}. {tabLabels[tab] || tab}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveTab(index, 'up')}
                            disabled={index === 0}
                            className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveTab(index, 'down')}
                            disabled={index === reportTabOrder.length - 1}
                            className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Security / MFA Card */}
            <div className="bg-card rounded-xl shadow-xl p-6 sm:p-8 lg:p-10 border-2 border-border">
              <div className="flex flex-col sm:flex-row items-start justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                    <Shield className="w-7 h-7 text-[#0d767b]" />
                    Segurança
                  </h2>
                  <p className="text-muted-foreground text-base sm:text-lg">Verificação em duas etapas</p>
                </div>
                <Link
                  href="/account/security"
                  className="bg-gradient-to-r from-[#0d767b] to-[#095a5e] hover:from-[#095a5e] hover:to-[#084a4e] text-white text-base sm:text-lg font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-xl w-full sm:w-auto whitespace-nowrap flex items-center justify-center gap-2"
                >
                  Configurar Verificação
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>

              <div className="bg-muted/50 rounded-lg p-6 border-2 border-border">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                    mfaStatus?.enabled
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {mfaStatus?.enabled ? (
                      <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-foreground">
                      {mfaStatus?.enabled ? 'Verificação Ativada' : 'Verificação Desativada'}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {mfaStatus?.enabled ? (
                        <>
                          Método: {mfaStatus.method === 'totp' ? 'Google Authenticator' : 'Email'}
                          {mfaStatus.backup_codes_remaining != null && (
                            <> · {mfaStatus.backup_codes_remaining} códigos de backup restantes</>
                          )}
                        </>
                      ) : (
                        'Proteja sua conta adicionando uma camada extra de segurança'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Stats */}
            <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 dark:from-purple-500/20 dark:to-indigo-500/20 rounded-xl shadow-xl p-6 sm:p-8 lg:p-10 border-2 border-purple-500/20 dark:border-purple-500/30">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">Informações da Conta</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card/70 p-6 rounded-lg border-2 border-purple-500/20 dark:border-purple-500/30">
                  <p className="text-sm text-purple-700 dark:text-purple-400 font-semibold mb-2">Status da Conta</p>
                  <p className="text-2xl font-bold text-foreground">
                    {user.is_active ? 'Ativa' : 'Inativa'}
                  </p>
                </div>
                <div className="bg-card/70 p-6 rounded-lg border-2 border-purple-500/20 dark:border-purple-500/30">
                  <p className="text-sm text-purple-700 dark:text-purple-400 font-semibold mb-2">E-mail Verificado</p>
                  <p className="text-2xl font-bold text-foreground">
                    {user.is_verified ? 'Verificado' : 'Pendente'}
                  </p>
                </div>
                <div className="bg-card/70 p-6 rounded-lg border-2 border-purple-500/20 dark:border-purple-500/30">
                  <p className="text-sm text-purple-700 dark:text-purple-400 font-semibold mb-2">Membro desde</p>
                  <p className="text-2xl font-bold text-foreground">
                    {new Date(user.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="bg-card/70 p-6 rounded-lg border-2 border-purple-500/20 dark:border-purple-500/30">
                  <p className="text-sm text-purple-700 dark:text-purple-400 font-semibold mb-2">Função</p>
                  <p className="text-2xl font-bold text-foreground">
                    {user.role === 'owner' && 'Proprietário'}
                    {user.role === 'admin' && 'Administrador'}
                    {user.role === 'accountant' && 'Contador'}
                    {user.role === 'bookkeeper' && 'Auxiliar Contábil'}
                    {user.role === 'viewer' && 'Visualizador'}
                    {user.role === 'api_user' && 'Usuário API'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfilePageContent />
    </ProtectedRoute>
  );
}
