'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload, FileText, Loader2, Building2, MapPin, ChevronDown, ChevronUp, Users, Briefcase } from 'lucide-react';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [uploadingCNPJ, setUploadingCNPJ] = useState(false);
  const [lookingUpCNPJ, setLookingUpCNPJ] = useState(false);
  const [showCompanyDetails, setShowCompanyDetails] = useState(false);
  const [cnpjLoaded, setCnpjLoaded] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    company_name: '',
    cnpj: '',
    agreed_to_terms: false,
    agreed_to_privacy: false,
    // Company data (auto-filled from CNPJ lookup)
    trade_name: '',
    cnae_code: '',
    cnae_description: '',
    company_address_street: '',
    company_address_number: '',
    company_address_complement: '',
    company_address_district: '',
    company_address_city: '',
    company_address_state: '',
    company_address_zip: '',
    capital_social: null as number | null,
    company_size: '',
    legal_nature: '',
    company_phone: '',
    company_email: '',
    company_status: '',
    company_opened_at: '',
    is_simples_nacional: null as boolean | null,
    is_mei: null as boolean | null,
    // Additional company data (from BrasilAPI full response)
    qsa_partners: null as Array<{ nome?: string; qualificacao?: string; data_entrada?: string; cpf_cnpj?: string; faixa_etaria?: string }> | null,
    cnaes_secundarios: null as Array<{ codigo?: number; descricao?: string }> | null,
    company_address_type: '',
    is_headquarters: null as boolean | null,
    ibge_code: '',
    regime_tributario: '',
    simples_desde: '',
    simples_excluido_em: '',
    main_partner_name: '',
    main_partner_qualification: '',
  });

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
    setFormData((prev) => ({ ...prev, cnpj: formatted }));
  };

  const lookupCNPJ = async (cnpjOverride?: string) => {
    const cnpjDigits = (cnpjOverride || formData.cnpj).replace(/\D/g, '');
    if (cnpjDigits.length !== 14) {
      toast.error('Digite um CNPJ válido com 14 dígitos');
      return;
    }

    setLookingUpCNPJ(true);
    try {
      // Use backend proxy to avoid CORS issues with ReceitaWS
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/auth/lookup-cnpj/${cnpjDigits}`);
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.detail || 'CNPJ não encontrado');
        return;
      }

      // Populate form with all CNPJ data
      setFormData((prev) => ({
        ...prev,
        company_name: data.nome || prev.company_name,
        trade_name: data.fantasia || '',
        cnae_code: data.cnae_code || '',
        cnae_description: data.cnae_description || '',
        company_address_street: data.logradouro || '',
        company_address_number: data.numero || '',
        company_address_complement: data.complemento || '',
        company_address_district: data.bairro || '',
        company_address_city: data.municipio || '',
        company_address_state: data.uf || '',
        company_address_zip: data.cep || '',
        capital_social: data.capital_social || null,
        company_size: data.porte || '',
        legal_nature: data.natureza_juridica || '',
        company_phone: data.telefone || '',
        company_email: data.email || '',
        company_status: data.situacao || '',
        company_opened_at: data.abertura || '',
        is_simples_nacional: data.simples_nacional ?? null,
        is_mei: data.mei ?? null,
        // Additional data from BrasilAPI
        qsa_partners: data.qsa_partners || null,
        cnaes_secundarios: data.cnaes_secundarios || null,
        company_address_type: data.address_type || '',
        is_headquarters: data.is_headquarters ?? null,
        ibge_code: data.ibge_code || '',
        regime_tributario: data.regime_tributario || '',
        simples_desde: data.simples_desde || '',
        simples_excluido_em: data.simples_excluido_em || '',
        main_partner_name: data.main_partner_name || '',
        main_partner_qualification: data.main_partner_qualification || '',
      }));
      setCnpjLoaded(true);
      setShowCompanyDetails(true);

      toast.success('Dados do CNPJ carregados com sucesso!');
    } catch (error) {
      console.error('CNPJ lookup error:', error);
      toast.error('Erro ao buscar dados do CNPJ. Preencha manualmente.');
    } finally {
      setLookingUpCNPJ(false);
    }
  };

  const handleCNPJCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      toast.error('Por favor, envie um arquivo PDF ou imagem (JPG, PNG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máximo 10MB)');
      return;
    }

    setUploadingCNPJ(true);
    try {
      // Use the public CNPJ extraction endpoint (no auth needed)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

      const formPayload = new FormData();
      formPayload.append('file', file);

      const response = await fetch(`${API_URL}/auth/extract-cnpj`, {
        method: 'POST',
        headers: { 'x-api-key': API_KEY },
        body: formPayload,
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.detail || 'Erro ao processar cartão CNPJ');
        return;
      }

      if (data.success && data.cnpj) {
        setFormData((prev) => ({
          ...prev,
          cnpj: data.cnpj,
          company_name: data.company_name || prev.company_name,
        }));
        toast.success('Cartão CNPJ processado com sucesso!');

        // Auto-lookup company name via backend proxy
        const cnpjDigits = (data.cnpj_raw || data.cnpj).replace(/\D/g, '');
        if (cnpjDigits.length === 14) {
          try {
            await lookupCNPJ(cnpjDigits);
          } catch {
            // Lookup is optional, ignore errors
          }
        }
      } else {
        toast.error(data.message || 'Não foi possível extrair o CNPJ do documento. Tente outro arquivo ou digite manualmente.');
      }
    } catch (error) {
      console.error('CNPJ card upload error:', error);
      toast.error('Erro ao processar cartão CNPJ. Tente novamente.');
    } finally {
      setUploadingCNPJ(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.full_name.trim()) {
      toast.error('Nome completo é obrigatório');
      return;
    }

    if (!formData.company_name.trim()) {
      toast.error('Nome da empresa é obrigatório');
      return;
    }

    const cnpjDigits = formData.cnpj.replace(/\D/g, '');
    if (!cnpjDigits || cnpjDigits.length !== 14) {
      toast.error('CNPJ válido é obrigatório (14 dígitos)');
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    // Validate password strength (must match backend validation)
    if (formData.password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres');
      return;
    }
    if (!/[A-Z]/.test(formData.password)) {
      toast.error('A senha deve conter pelo menos uma letra maiúscula');
      return;
    }
    if (!/[a-z]/.test(formData.password)) {
      toast.error('A senha deve conter pelo menos uma letra minúscula');
      return;
    }
    if (!/\d/.test(formData.password)) {
      toast.error('A senha deve conter pelo menos um número');
      return;
    }

    // Validate legal agreements
    if (!formData.agreed_to_terms) {
      toast.error('Você deve concordar com os Termos de Serviço');
      return;
    }
    if (!formData.agreed_to_privacy) {
      toast.error('Você deve concordar com a Política de Privacidade');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        company_name: formData.company_name,
        cnpj: formData.cnpj,
        agreed_to_terms: formData.agreed_to_terms,
        agreed_to_privacy: formData.agreed_to_privacy,
        // Company data from CNPJ lookup
        trade_name: formData.trade_name || undefined,
        cnae_code: formData.cnae_code || undefined,
        cnae_description: formData.cnae_description || undefined,
        company_address_street: formData.company_address_street || undefined,
        company_address_number: formData.company_address_number || undefined,
        company_address_complement: formData.company_address_complement || undefined,
        company_address_district: formData.company_address_district || undefined,
        company_address_city: formData.company_address_city || undefined,
        company_address_state: formData.company_address_state || undefined,
        company_address_zip: formData.company_address_zip || undefined,
        capital_social: formData.capital_social ?? undefined,
        company_size: formData.company_size || undefined,
        legal_nature: formData.legal_nature || undefined,
        company_phone: formData.company_phone || undefined,
        company_email: formData.company_email || undefined,
        company_status: formData.company_status || undefined,
        company_opened_at: formData.company_opened_at || undefined,
        is_simples_nacional: formData.is_simples_nacional ?? undefined,
        is_mei: formData.is_mei ?? undefined,
        // Additional company data
        qsa_partners: formData.qsa_partners ?? undefined,
        cnaes_secundarios: formData.cnaes_secundarios ?? undefined,
        company_address_type: formData.company_address_type || undefined,
        is_headquarters: formData.is_headquarters ?? undefined,
        ibge_code: formData.ibge_code || undefined,
        regime_tributario: formData.regime_tributario || undefined,
        simples_desde: formData.simples_desde || undefined,
        simples_excluido_em: formData.simples_excluido_em || undefined,
        main_partner_name: formData.main_partner_name || undefined,
        main_partner_qualification: formData.main_partner_qualification || undefined,
      });

      toast.success('Cadastro realizado com sucesso!');
      router.push('/');
    } catch (error: unknown) {
      console.error('Registration error:', error);

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: { message?: string }; detail?: string } } };
        const message = axiosError.response?.data?.error?.message || axiosError.response?.data?.detail || 'Falha no cadastro';

        // Show longer duration for CNPJ conflicts (important security message)
        if (message.includes('CNPJ já está cadastrado')) {
          toast.error(message, { duration: 10000 }); // 10 seconds
        } else {
          toast.error(message);
        }
      } else {
        toast.error('Erro ao fazer cadastro. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d767b]/5 to-[#0d767b]/15 px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl p-10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <Image
                src="/logo-horizontal.svg"
                alt="ControlladorIA"
                width={200}
                height={60}
                priority
                className="h-16 w-auto"
              />
            </div>
            <p className="text-lg text-gray-600">Crie sua conta</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* CNPJ - Now first and required */}
            <div>
              <label htmlFor="cnpj" className="block text-base font-medium text-gray-700 mb-2">
                CNPJ da Empresa *
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    id="cnpj"
                    name="cnpj"
                    value={formData.cnpj}
                    onChange={handleCNPJChange}
                    onBlur={() => {
                      if (formData.cnpj.replace(/\D/g, '').length === 14) {
                        lookupCNPJ();
                      }
                    }}
                    required
                    className="w-full px-5 py-3.5 text-base text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d767b] focus:border-transparent transition-all"
                    placeholder="00.000.000/0000-00"
                    disabled={isLoading || uploadingCNPJ}
                    maxLength={18}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || uploadingCNPJ || lookingUpCNPJ || formData.cnpj.replace(/\D/g, '').length > 0}
                  className="px-4 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title={formData.cnpj.replace(/\D/g, '').length > 0 ? "Limpe o campo CNPJ para usar o upload" : "Enviar Cartão CNPJ"}
                >
                  {uploadingCNPJ ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleCNPJCardUpload}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {formData.cnpj.replace(/\D/g, '').length > 0
                  ? "Limpe o campo para usar o upload de cartão CNPJ"
                  : <>Digite o CNPJ ou clique em <Upload className="w-4 h-4 inline" /> para enviar o cartão CNPJ (PDF/Imagem)</>
                }
              </p>
              {lookingUpCNPJ && (
                <p className="text-sm text-[#0d767b] mt-2 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Buscando dados da Receita Federal...
                </p>
              )}
            </div>

            {/* Company Name */}
            <div>
              <label htmlFor="company_name" className="block text-base font-medium text-gray-700 mb-2">
                Nome da Empresa (Razão Social) *
              </label>
              <input
                type="text"
                id="company_name"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                required
                className="w-full px-5 py-3.5 text-base text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d767b] focus:border-transparent transition-all"
                placeholder="Nome legal da empresa"
                disabled={isLoading || uploadingCNPJ}
              />
            </div>

            {/* Company Details (auto-filled from CNPJ) */}
            {cnpjLoaded && (
              <div className="bg-[#0d767b]/5 border border-[#0d767b]/20 rounded-xl p-4">
                <button
                  type="button"
                  onClick={() => setShowCompanyDetails(!showCompanyDetails)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#0d767b]" />
                    <span className="text-sm font-semibold text-[#0d767b]">
                      Dados da Empresa (preenchidos automaticamente)
                    </span>
                  </div>
                  {showCompanyDetails ? (
                    <ChevronUp className="w-4 h-4 text-[#0d767b]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#0d767b]" />
                  )}
                </button>

                {showCompanyDetails && (
                  <div className="mt-4 space-y-3">
                    {/* Row: Trade Name + Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {formData.trade_name && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Nome Fantasia</label>
                          <p className="text-sm text-gray-800 bg-white rounded px-3 py-2 border border-gray-200">{formData.trade_name}</p>
                        </div>
                      )}
                      {formData.company_status && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Situação Cadastral</label>
                          <p className={`text-sm rounded px-3 py-2 border ${formData.company_status.toLowerCase().includes('ativa') ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
                            {formData.company_status}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Row: CNAE + Legal Nature */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {formData.cnae_code && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">CNAE Principal</label>
                          <p className="text-sm text-gray-800 bg-white rounded px-3 py-2 border border-gray-200">
                            {formData.cnae_code}{formData.cnae_description ? ` — ${formData.cnae_description}` : ''}
                          </p>
                        </div>
                      )}
                      {formData.legal_nature && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Natureza Jurídica</label>
                          <p className="text-sm text-gray-800 bg-white rounded px-3 py-2 border border-gray-200">{formData.legal_nature}</p>
                        </div>
                      )}
                    </div>

                    {/* Address */}
                    {(formData.company_address_street || formData.company_address_city) && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          <MapPin className="w-3 h-3 inline mr-1" />Endereço
                        </label>
                        <p className="text-sm text-gray-800 bg-white rounded px-3 py-2 border border-gray-200">
                          {[
                            formData.company_address_street,
                            formData.company_address_number,
                            formData.company_address_complement,
                            formData.company_address_district,
                            formData.company_address_city && formData.company_address_state
                              ? `${formData.company_address_city}/${formData.company_address_state}`
                              : formData.company_address_city,
                            formData.company_address_zip,
                          ].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}

                    {/* Row: Size + Capital + Opening Date */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {formData.company_size && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Porte</label>
                          <p className="text-sm text-gray-800 bg-white rounded px-3 py-2 border border-gray-200">{formData.company_size}</p>
                        </div>
                      )}
                      {formData.capital_social != null && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Capital Social</label>
                          <p className="text-sm text-gray-800 bg-white rounded px-3 py-2 border border-gray-200">
                            R$ {Number(formData.capital_social).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                      {formData.company_opened_at && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Data Abertura</label>
                          <p className="text-sm text-gray-800 bg-white rounded px-3 py-2 border border-gray-200">{formData.company_opened_at}</p>
                        </div>
                      )}
                    </div>

                    {/* Row: Simples + MEI + Phone */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {formData.is_simples_nacional != null && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Simples Nacional</label>
                          <p className={`text-sm rounded px-3 py-2 border ${formData.is_simples_nacional ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-600 bg-white border-gray-200'}`}>
                            {formData.is_simples_nacional ? 'Sim' : 'Não'}
                            {formData.simples_desde ? ` (desde ${formData.simples_desde})` : ''}
                          </p>
                        </div>
                      )}
                      {formData.is_mei != null && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">MEI</label>
                          <p className={`text-sm rounded px-3 py-2 border ${formData.is_mei ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-600 bg-white border-gray-200'}`}>
                            {formData.is_mei ? 'Sim' : 'Não'}
                          </p>
                        </div>
                      )}
                      {formData.company_phone && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Telefone</label>
                          <p className="text-sm text-gray-800 bg-white rounded px-3 py-2 border border-gray-200">{formData.company_phone}</p>
                        </div>
                      )}
                    </div>

                    {/* Headquarters indicator */}
                    {formData.is_headquarters != null && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Estabelecimento</label>
                        <p className="text-sm text-gray-800 bg-white rounded px-3 py-2 border border-gray-200">
                          {formData.is_headquarters ? '🏢 Matriz' : '🏪 Filial'}
                        </p>
                      </div>
                    )}

                    {/* Main Partner (editable) */}
                    {formData.main_partner_name && (
                      <div className="border-t border-[#0d767b]/20 pt-3 mt-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          <Users className="w-3 h-3 inline mr-1" />Sócio-Administrador Principal
                        </label>
                        <input
                          type="text"
                          value={formData.main_partner_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, main_partner_name: e.target.value }))}
                          className="w-full text-sm text-gray-800 bg-white rounded px-3 py-2 border border-gray-200 focus:ring-2 focus:ring-[#0d767b] focus:border-transparent"
                          placeholder="Nome do sócio-administrador"
                        />
                        {formData.main_partner_qualification && (
                          <p className="text-xs text-gray-500 mt-1">
                            Qualificação: {formData.main_partner_qualification}
                          </p>
                        )}
                      </div>
                    )}

                    {/* All QSA Partners (display only) */}
                    {formData.qsa_partners && formData.qsa_partners.length > 1 && (
                      <div className="border-t border-[#0d767b]/20 pt-3 mt-1">
                        <label className="block text-xs font-medium text-gray-500 mb-2">
                          <Briefcase className="w-3 h-3 inline mr-1" />Quadro Societário ({formData.qsa_partners.length} sócios)
                        </label>
                        <div className="space-y-1.5">
                          {formData.qsa_partners.map((partner, idx) => (
                            <div key={idx} className="text-xs text-gray-700 bg-white rounded px-3 py-1.5 border border-gray-200 flex justify-between items-center">
                              <span className="font-medium">{partner.nome}</span>
                              <span className="text-gray-500 text-[11px]">{partner.qualificacao}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Secondary CNAEs */}
                    {formData.cnaes_secundarios && formData.cnaes_secundarios.length > 0 && (
                      <div className="border-t border-[#0d767b]/20 pt-3 mt-1">
                        <label className="block text-xs font-medium text-gray-500 mb-2">
                          CNAEs Secundários ({formData.cnaes_secundarios.length})
                        </label>
                        <div className="max-h-24 overflow-y-auto space-y-1">
                          {formData.cnaes_secundarios.map((cnae, idx) => (
                            <p key={idx} className="text-xs text-gray-600 bg-white rounded px-3 py-1 border border-gray-100">
                              <span className="font-mono text-gray-500">{cnae.codigo}</span>{' — '}{cnae.descricao}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-base font-medium text-gray-700 mb-2">
                Nome Completo do Responsável *
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="w-full px-5 py-3.5 text-base text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d767b] focus:border-transparent transition-all"
                placeholder="Seu nome completo"
                disabled={isLoading || uploadingCNPJ}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-base font-medium text-gray-700 mb-2">
                E-mail *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-5 py-3.5 text-base text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d767b] focus:border-transparent transition-all"
                placeholder="seu@email.com"
                disabled={isLoading || uploadingCNPJ}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-base font-medium text-gray-700 mb-2">
                Senha *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  className="w-full px-5 py-3.5 pr-12 text-base text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d767b] focus:border-transparent transition-all"
                  placeholder="Exemplo: MinhaSenh@123"
                  disabled={isLoading || uploadingCNPJ}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              <PasswordStrengthIndicator password={formData.password} />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-base font-medium text-gray-700 mb-2">
                Confirmar Senha *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-5 py-3.5 pr-12 text-base text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d767b] focus:border-transparent transition-all"
                  placeholder="Digite a senha novamente"
                  disabled={isLoading || uploadingCNPJ}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Legal Agreements */}
            <div className="space-y-4 pt-4 border-t border-gray-200 mt-6">
              {/* Terms of Service */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="agreed_to_terms"
                  checked={formData.agreed_to_terms}
                  onChange={(e) => setFormData(prev => ({ ...prev, agreed_to_terms: e.target.checked }))}
                  required
                  className="mt-1 h-5 w-5 text-[#0d767b] border-gray-300 rounded focus:ring-[#0d767b] cursor-pointer"
                  disabled={isLoading || uploadingCNPJ}
                />
                <label htmlFor="agreed_to_terms" className="ml-3 text-sm text-gray-700 cursor-pointer">
                  Eu li e concordo com os{' '}
                  <Link href="/terms" target="_blank" className="text-[#0d767b] hover:text-[#095a5e] font-medium underline">
                    Termos de Serviço
                  </Link>
                  {' '}*
                  <p className="text-xs text-gray-500 mt-1">
                    Incluindo a proibição de compartilhamento de conta
                  </p>
                </label>
              </div>

              {/* Privacy Policy (LGPD) */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="agreed_to_privacy"
                  checked={formData.agreed_to_privacy}
                  onChange={(e) => setFormData(prev => ({ ...prev, agreed_to_privacy: e.target.checked }))}
                  required
                  className="mt-1 h-5 w-5 text-[#0d767b] border-gray-300 rounded focus:ring-[#0d767b] cursor-pointer"
                  disabled={isLoading || uploadingCNPJ}
                />
                <label htmlFor="agreed_to_privacy" className="ml-3 text-sm text-gray-700 cursor-pointer">
                  Eu li e concordo com a{' '}
                  <Link href="/privacy" target="_blank" className="text-[#0d767b] hover:text-[#095a5e] font-medium underline">
                    Política de Privacidade
                  </Link>
                  {' '}(LGPD) *
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || uploadingCNPJ}
              className="w-full bg-[#0d767b] hover:bg-[#095a5e] text-white text-lg font-semibold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-8"
            >
              {isLoading ? 'Cadastrando...' : uploadingCNPJ ? 'Processando Cartão CNPJ...' : 'Criar Conta'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-base text-gray-600">
              Já tem uma conta?{' '}
              <Link href="/login" className="text-[#0d767b] hover:text-[#095a5e] font-medium transition-colors">
                Faça login
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link href="/" className="text-base text-gray-600 hover:text-gray-900 transition-colors">
            ← Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}
