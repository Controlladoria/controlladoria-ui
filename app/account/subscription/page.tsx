'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { paymentApiClient, type PlanInfo, type PaymentRecord } from '@/lib/payment-api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import { toast } from 'sonner';
import { CreditCard, Calendar, AlertCircle, CheckCircle, XCircle, Crown } from 'lucide-react';

// Map feature keys to Portuguese labels: [labelWhenTrue, labelWhenFalse]
const FEATURE_LABELS: Record<string, [string, string]> = {
  cash_flow_direct: ['Fluxo de Caixa — Direto e Indireto', 'Fluxo de Caixa Básico'],
  team_management: ['Gestão de equipe e permissões', ''],
  api_access: ['Integração via API', ''],
  priority_support: ['Suporte prioritário', 'Suporte por e-mail'],
};

function buildFeatureListShort(plan: PlanInfo): string[] {
  const features: string[] = [];

  // User count
  features.push(plan.max_users === 1 ? '1 usuário' : `Até ${plan.max_users} usuários`);

  // Reports
  features.push('DRE, Balanço e Fluxo de Caixa');

  // Dynamic features from plan.features
  for (const [key, [trueLabel, falseLabel]] of Object.entries(FEATURE_LABELS)) {
    const hasFeature = plan.features[key] === true;
    const label = hasFeature ? trueLabel : falseLabel;
    if (label) {
      features.push(label);
    }
  }

  return features;
}

// Plan card color schemes
const PLAN_COLORS: Record<string, { gradient: string; border: string; icon: string; badge?: string; buttonStyle: string }> = {
  basic: {
    gradient: 'from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20',
    border: 'border-blue-500/20 dark:border-blue-500/30',
    icon: 'text-blue-600 dark:text-blue-400',
    buttonStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  pro: {
    gradient: 'from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20',
    border: 'border-purple-500/30 dark:border-purple-500/40',
    icon: 'text-purple-600 dark:text-purple-400',
    badge: 'POPULAR',
    buttonStyle: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white',
  },
  max: {
    gradient: 'from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20',
    border: 'border-orange-500/20 dark:border-orange-500/30',
    icon: 'text-orange-600 dark:text-orange-400',
    buttonStyle: 'bg-orange-600 hover:bg-orange-700 text-white',
  },
};

const DEFAULT_COLORS = PLAN_COLORS.basic;

function SubscriptionPageContent() {
  const { user } = useAuth();
  const {
    subscription,
    isLoading: subLoading,
    hasActiveSubscription,
    isTrialing,
    trialDaysLeft,
    planTier,
    startCheckout,
    openCustomerPortal,
  } = useSubscription();

  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // Fetch plans from API
  useEffect(() => {
    async function loadPlans() {
      try {
        const data = await paymentApiClient.getPlans();
        setPlans(data);
      } catch (error) {
        console.error('Failed to load plans:', error);
      } finally {
        setPlansLoading(false);
      }
    }
    loadPlans();
  }, []);

  const handleManageBilling = async () => {
    setIsOpeningPortal(true);
    try {
      await openCustomerPortal();
      // Redirects to billing management portal
    } catch (error: any) {
      console.error('Portal error:', error);
      const msg = error?.response?.data?.detail || 'Erro ao abrir portal de gerenciamento';
      if (msg.includes('teste gratuito') || msg.includes('período de teste')) {
        toast.info('Escolha um plano abaixo para ativar sua assinatura');
      } else {
        toast.error(msg);
      }
      setIsOpeningPortal(false);
    }
  };

  const handleStartSubscription = async () => {
    setIsStartingCheckout(true);
    try {
      await startCheckout();
      // Redirects to checkout page
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Erro ao iniciar checkout');
      setIsStartingCheckout(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusBadge = () => {
    if (!subscription?.has_subscription) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
          <XCircle className="w-4 h-4" />
          Sem Assinatura
        </span>
      );
    }

    switch (subscription.status) {
      case 'trialing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
            <AlertCircle className="w-4 h-4" />
            Período de Teste
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-4 h-4" />
            Ativa
          </span>
        );
      case 'past_due':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
            <AlertCircle className="w-4 h-4" />
            Pagamento Pendente
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
            <XCircle className="w-4 h-4" />
            Cancelada
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
            <XCircle className="w-4 h-4" />
            Expirada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
            {subscription.status || 'Desconhecido'}
          </span>
        );
    }
  };

  const isLoading = subLoading || plansLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#0d767b] dark:border-blue-400 border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Carregando assinatura...</p>
        </div>
      </div>
    );
  }

  // Detect if user is in trial/pre-payment phase (no real Stripe subscription yet)
  const isLocalTrial = subscription?.status === 'trialing' || !subscription?.has_subscription;

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
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Minha Assinatura</h1>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-1">Gerencie sua assinatura e formas de pagamento</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
        {/* Trial Warning Banner */}
        {isTrialing && trialDaysLeft !== null && trialDaysLeft <= 3 && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 dark:from-yellow-500/20 dark:to-orange-500/20 border-2 border-yellow-500/30 dark:border-yellow-500/40 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg">
            <div className="flex items-start gap-3 sm:gap-4">
              <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 dark:text-yellow-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-yellow-900 dark:text-yellow-300 mb-2">
                  Seu teste grátis está acabando!
                </h3>
                <p className="text-yellow-800 dark:text-yellow-400 text-sm sm:text-base lg:text-lg">
                  Restam apenas <strong>{trialDaysLeft} {trialDaysLeft === 1 ? 'dia' : 'dias'}</strong> do seu período
                  de teste. Adicione uma forma de pagamento para continuar usando o ControlladorIA
                  após o término do teste.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Plan */}
        <div className="bg-card rounded-xl shadow-xl p-6 sm:p-8 lg:p-10 mb-6 sm:mb-8 border border-border">
          <div className="flex flex-col sm:flex-row items-start justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Plano Atual</h2>
              <div className="flex items-center gap-4">
                {getStatusBadge()}
              </div>
            </div>
            <CreditCard className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
          </div>

          {subscription?.has_subscription ? (
            <div className="space-y-4">
              {/* Plan Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div className="bg-blue-500/10 dark:bg-blue-500/20 rounded-lg p-5 border border-blue-500/20 dark:border-blue-500/30">
                  <p className="text-base text-blue-700 dark:text-blue-400 mb-2 font-medium">Plano</p>
                  <p className="text-xl font-bold text-foreground">
                    {subscription?.plan_name || 'ControlladorIA'} — {subscription?.max_users === 1 ? '1 usuário' : `${subscription?.max_users} usuários`}
                  </p>
                </div>

                {isTrialing && subscription.trial_end && (
                  <div className="bg-green-500/10 dark:bg-green-500/20 rounded-lg p-5 border border-green-500/20 dark:border-green-500/30">
                    <p className="text-base text-green-700 dark:text-green-400 mb-2 font-medium">Teste até</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatDate(subscription.trial_end)}
                    </p>
                  </div>
                )}

                {!isTrialing && subscription.current_period_end && (
                  <div className="bg-purple-500/10 dark:bg-purple-500/20 rounded-lg p-5 border border-purple-500/20 dark:border-purple-500/30">
                    <p className="text-base text-purple-700 dark:text-purple-400 mb-2 font-medium">Próxima cobrança</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatDate(subscription.current_period_end)}
                    </p>
                  </div>
                )}
              </div>

              {subscription.cancel_at_period_end && (
                <div className="bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 dark:border-red-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                      <p className="text-red-900 dark:text-red-300 font-medium">
                        Assinatura será cancelada
                      </p>
                      <p className="text-red-800 dark:text-red-400 text-sm mt-1">
                        Seu acesso permanece ativo até {formatDate(subscription.current_period_end)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Manage Billing Button - only show for paid subscribers, not local trial */}
              {!isLocalTrial && (
                <button
                  onClick={handleManageBilling}
                  disabled={isOpeningPortal}
                  className="w-full sm:w-auto bg-gradient-to-r from-[#0d767b] to-[#095a5e] hover:from-[#095a5e] hover:to-[#084a4e] text-white text-base sm:text-lg font-bold py-4 sm:py-5 px-8 sm:px-10 rounded-xl transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isOpeningPortal ? 'Abrindo...' : 'Gerenciar Assinatura e Pagamento'}
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Você não tem uma assinatura ativa
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Comece seu teste grátis de 15 dias agora e tenha acesso ilimitado a todas as
                funcionalidades do ControlladorIA.
              </p>
              <button
                onClick={handleStartSubscription}
                disabled={isStartingCheckout}
                className="bg-gradient-to-r from-[#0d767b] to-[#095a5e] hover:from-[#095a5e] hover:to-[#084a4e] text-white font-semibold py-3 px-8 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isStartingCheckout ? 'Carregando...' : 'Começar Teste Grátis'}
              </button>
            </div>
          )}
        </div>

        {/* Available Plans (API-driven) */}
        {plans.length > 0 && (
          <div className="bg-card rounded-xl shadow-xl p-6 sm:p-8 lg:p-10 mb-6 sm:mb-8 border border-border">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">
              {isLocalTrial ? 'Escolha seu Plano' : 'Alterar Plano'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const colors = PLAN_COLORS[plan.slug] || DEFAULT_COLORS;
                const isCurrentPlan = !isLocalTrial && subscription?.status === 'active' && planTier === plan.slug;
                const featureList = buildFeatureListShort(plan);

                return (
                  <div
                    key={plan.slug}
                    className={`bg-gradient-to-br ${colors.gradient} rounded-xl p-6 ${
                      plan.is_highlighted ? 'border-2' : 'border'
                    } ${colors.border} hover:shadow-lg transition-all relative flex flex-col`}
                  >
                    {/* Popular badge */}
                    {colors.badge && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                        {colors.badge}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-4">
                      <Crown className={`w-6 h-6 ${colors.icon}`} />
                      <h3 className="text-xl font-bold text-foreground">{plan.display_name}</h3>
                    </div>
                    <div className="mb-4">
                      {(() => {
                        const perUser = plan.max_users > 1 ? Math.round(plan.price_monthly_brl / plan.max_users) : plan.price_monthly_brl;
                        const basePrice = 99;
                        const originalTotal = basePrice * plan.max_users;
                        const hasDiscount = plan.max_users > 1 && plan.price_monthly_brl < originalTotal;
                        const discountPct = hasDiscount ? Math.round((1 - plan.price_monthly_brl / originalTotal) * 100) : 0;

                        return (
                          <>
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg text-muted-foreground">R$</span>
                              <span className="text-4xl font-extrabold text-foreground">{perUser}</span>
                              <span className="text-sm text-muted-foreground">/usuário/mês</span>
                            </div>
                            {hasDiscount ? (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-muted-foreground line-through text-sm">R$ {originalTotal}</span>
                                <span className="text-lg font-bold text-foreground">R$ {plan.price_monthly_brl}/mês</span>
                                <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">-{discountPct}%</span>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground mt-1">R$ {plan.price_monthly_brl}/mês total</p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <ul className="space-y-2 mb-6 flex-grow">
                      {featureList.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => isLocalTrial ? startCheckout(plan.slug) : handleManageBilling()}
                      disabled={isStartingCheckout || isCurrentPlan}
                      className={`w-full font-semibold py-2 px-4 rounded-lg transition-all ${
                        isCurrentPlan
                          ? 'bg-green-600 text-white cursor-default'
                          : colors.buttonStyle
                      }`}
                    >
                      {isCurrentPlan ? 'PLANO ATUAL' : 'Selecionar'}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground text-center mt-6">
              {isLocalTrial
                ? 'Clique em "Selecionar" para escolher seu plano e iniciar a assinatura'
                : 'Clique em "Selecionar" para gerenciar sua assinatura através do portal seguro do Stripe'}
            </p>
          </div>
        )}

          </div>
        </main>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <ProtectedRoute>
      <SubscriptionPageContent />
    </ProtectedRoute>
  );
}
