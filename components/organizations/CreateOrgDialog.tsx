'use client';

import { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { Building2, Search, Loader2, CheckCircle, MapPin, Briefcase, Users as UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { CreateOrgRequest } from '@/lib/org-api';

interface CreateOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill CNPJ (formatted or digits-only) and auto-trigger lookup */
  initialCnpj?: string;
}

interface CnpjLookupData {
  nome: string;
  fantasia?: string;
  cnpj: string;
  situacao?: string;
  porte?: string;
  natureza_juridica?: string;
  cnae_code?: string;
  cnae_description?: string;
  abertura?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  capital_social?: number;
  telefone?: string;
  email?: string;
  simples_nacional?: boolean;
  mei?: boolean;
  qsa_partners?: any[];
  cnaes_secundarios?: any[];
  address_type?: string;
  is_headquarters?: boolean;
  ibge_code?: string;
  regime_tributario?: string;
  simples_desde?: string;
  simples_excluido_em?: string;
  main_partner_name?: string;
  main_partner_qualification?: string;
}

export default function CreateOrgDialog({ open, onOpenChange, initialCnpj }: CreateOrgDialogProps) {
  const { createOrg } = useOrganization();
  const [cnpj, setCnpj] = useState('');
  const [lookupData, setLookupData] = useState<CnpjLookupData | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [autoLookupDone, setAutoLookupDone] = useState(false);

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

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnpj(formatCNPJ(e.target.value));
  };

  const handleLookup = async (overrideCnpj?: string) => {
    const cnpjDigits = (overrideCnpj || cnpj).replace(/\D/g, '');
    if (cnpjDigits.length !== 14) {
      toast.error('Digite um CNPJ válido com 14 dígitos');
      return;
    }

    setIsLookingUp(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/auth/lookup-cnpj/${cnpjDigits}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.detail || 'CNPJ não encontrado');
        return;
      }

      setLookupData(data);
      setStep('preview');
      toast.success('Dados do CNPJ carregados!');
    } catch (error) {
      console.error('CNPJ lookup error:', error);
      toast.error('Erro ao buscar dados do CNPJ.');
    } finally {
      setIsLookingUp(false);
    }
  };

  // When dialog opens with an initialCnpj, pre-fill and auto-trigger lookup
  useEffect(() => {
    if (open && initialCnpj && !autoLookupDone) {
      const digits = initialCnpj.replace(/\D/g, '');
      if (digits.length === 14) {
        setCnpj(formatCNPJ(initialCnpj));
        setAutoLookupDone(true);
        handleLookup(initialCnpj);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCnpj]);

  const handleCreate = async () => {
    if (!lookupData) return;

    setIsCreating(true);
    try {
      const requestData: CreateOrgRequest = {
        cnpj: cnpj,
        company_name: lookupData.nome,
        trade_name: lookupData.fantasia || null,
        cnae_code: lookupData.cnae_code || null,
        cnae_description: lookupData.cnae_description || null,
        company_address_street: lookupData.logradouro || null,
        company_address_number: lookupData.numero || null,
        company_address_complement: lookupData.complemento || null,
        company_address_district: lookupData.bairro || null,
        company_address_city: lookupData.municipio || null,
        company_address_state: lookupData.uf || null,
        company_address_zip: lookupData.cep || null,
        capital_social: lookupData.capital_social || null,
        company_size: lookupData.porte || null,
        legal_nature: lookupData.natureza_juridica || null,
        company_phone: lookupData.telefone || null,
        company_email: lookupData.email || null,
        company_status: lookupData.situacao || null,
        company_opened_at: lookupData.abertura || null,
        is_simples_nacional: lookupData.simples_nacional ?? null,
        is_mei: lookupData.mei ?? null,
        qsa_partners: lookupData.qsa_partners || null,
        cnaes_secundarios: lookupData.cnaes_secundarios || null,
        company_address_type: lookupData.address_type || null,
        is_headquarters: lookupData.is_headquarters ?? null,
        ibge_code: lookupData.ibge_code || null,
        regime_tributario: lookupData.regime_tributario || null,
        simples_desde: lookupData.simples_desde || null,
        simples_excluido_em: lookupData.simples_excluido_em || null,
        main_partner_name: lookupData.main_partner_name || null,
        main_partner_qualification: lookupData.main_partner_qualification || null,
      };

      await createOrg(requestData);
      toast.success('Empresa criada com sucesso!');
      onOpenChange(false);

      // Reload page to refresh all data with new org context
      window.location.reload();
    } catch (error: any) {
      console.error('Create org error:', error);
      // Handle both axios errors and fetch errors
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'Erro ao criar empresa. Tente novamente.';
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const resetDialog = () => {
    setCnpj('');
    setLookupData(null);
    setStep('input');
    setIsLookingUp(false);
    setIsCreating(false);
    setAutoLookupDone(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetDialog();
    }
    onOpenChange(newOpen);
  };

  const buildAddress = () => {
    if (!lookupData) return '';
    return [
      lookupData.logradouro,
      lookupData.numero,
      lookupData.complemento,
      lookupData.bairro,
      lookupData.municipio && lookupData.uf ? `${lookupData.municipio}/${lookupData.uf}` : lookupData.municipio,
      lookupData.cep,
    ].filter(Boolean).join(', ');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="w-6 h-6 text-[#0d767b]" />
            Criar Nova Empresa
          </DialogTitle>
          <DialogDescription>
            {step === 'input'
              ? 'Digite o CNPJ da nova empresa para buscar os dados automaticamente.'
              : 'Confirme os dados da empresa para criar.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-6 pt-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                CNPJ da Nova Empresa
              </label>
              <div className="flex gap-3">
                <Input
                  type="text"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className="flex-1 text-lg font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLookup();
                  }}
                />
                <Button
                  onClick={() => handleLookup()}
                  disabled={isLookingUp || cnpj.replace(/\D/g, '').length !== 14}
                  className="bg-gradient-to-r from-[#0d767b] to-[#095a5e] hover:from-[#095a5e] hover:to-[#084a4e] text-white font-bold px-6"
                >
                  {isLookingUp ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Buscar
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Os dados serão buscados automaticamente na Receita Federal
              </p>
            </div>
          </div>
        )}

        {step === 'preview' && lookupData && (
          <div className="space-y-4 pt-4">
            {/* Company Name */}
            <div className="bg-[#0d767b]/5 dark:bg-[#0d767b]/10 rounded-xl p-4 border-2 border-[#0d767b]/20">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-[#0d767b] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-foreground">{lookupData.nome}</p>
                  {lookupData.fantasia && (
                    <p className="text-sm text-muted-foreground">{lookupData.fantasia}</p>
                  )}
                  <p className="text-sm font-mono text-muted-foreground mt-1">{cnpj}</p>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="space-y-3">
              {/* Status + CNAE */}
              <div className="grid grid-cols-2 gap-3">
                {lookupData.situacao && (
                  <div className="bg-muted/50 rounded-lg p-3 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Situação</p>
                    <p className={`text-sm font-medium ${
                      lookupData.situacao.toLowerCase().includes('ativa')
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {lookupData.situacao}
                    </p>
                  </div>
                )}
                {lookupData.cnae_code && (
                  <div className="bg-muted/50 rounded-lg p-3 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      <Briefcase className="w-3 h-3 inline mr-1" />CNAE
                    </p>
                    <p className="text-sm text-foreground truncate">{lookupData.cnae_code}</p>
                  </div>
                )}
              </div>

              {/* Address */}
              {buildAddress() && (
                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    <MapPin className="w-3 h-3 inline mr-1" />Endereço
                  </p>
                  <p className="text-sm text-foreground">{buildAddress()}</p>
                </div>
              )}

              {/* Size + Capital + Nature */}
              <div className="grid grid-cols-3 gap-3">
                {lookupData.porte && (
                  <div className="bg-muted/50 rounded-lg p-3 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Porte</p>
                    <p className="text-sm text-foreground">{lookupData.porte}</p>
                  </div>
                )}
                {lookupData.capital_social != null && (
                  <div className="bg-muted/50 rounded-lg p-3 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Capital</p>
                    <p className="text-sm text-foreground">
                      R$ {Number(lookupData.capital_social).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {lookupData.abertura && (
                  <div className="bg-muted/50 rounded-lg p-3 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Abertura</p>
                    <p className="text-sm text-foreground">{lookupData.abertura}</p>
                  </div>
                )}
              </div>

              {/* Main Partner */}
              {lookupData.main_partner_name && (
                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    <UsersIcon className="w-3 h-3 inline mr-1" />Sócio Principal
                  </p>
                  <p className="text-sm text-foreground">
                    {lookupData.main_partner_name}
                    {lookupData.main_partner_qualification && (
                      <span className="text-muted-foreground ml-1">({lookupData.main_partner_qualification})</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
              <Button
                onClick={() => {
                  setStep('input');
                  setLookupData(null);
                }}
                variant="outline"
                className="flex-1 font-bold py-3 rounded-xl border-2"
                disabled={isCreating}
              >
                Voltar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isCreating}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 rounded-xl"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Building2 className="w-5 h-5 mr-2" />
                    Criar Empresa
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
