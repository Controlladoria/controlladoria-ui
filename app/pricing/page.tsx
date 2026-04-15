'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { paymentApiClient, type PlanInfo } from '@/lib/payment-api';
import { toast } from 'sonner';
import { Check } from 'lucide-react';

// Map feature keys to Portuguese labels: [labelWhenTrue, labelWhenFalse]
const FEATURE_LABELS: Record<string, [string, string]> = {
  cash_flow_direct: ['Fluxo de Caixa — Direto e Indireto', 'Fluxo de Caixa Básico'],
  team_management: ['Gestão de equipe e permissões', ''],
  api_access: ['Integração via API', ''],
  priority_support: ['Suporte prioritário', 'Suporte por e-mail'],
};

// Common features included in all plans
const COMMON_FEATURES = [
  'Upload ilimitado de documentos',
  'Processamento com IA avançada',
  'DRE, Balanço e Fluxo de Caixa',
  'Relatórios e análises detalhadas',
];

function buildFeatureList(plan: PlanInfo): string[] {
  const features: string[] = [];

  // User count
  features.push(plan.max_users === 1 ? '1 usuário' : `Até ${plan.max_users} usuários`);

  // Common features
  features.push(...COMMON_FEATURES);

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

export default function PricingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { subscription, startCheckout, isLoading: subLoading } = useSubscription();
  const [isStarting, setIsStarting] = useState(false);
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
        toast.error('Erro ao carregar planos');
      } finally {
        setPlansLoading(false);
      }
    }
    loadPlans();
  }, []);

  const handleStartTrial = async (slug: string) => {
    // Require login first
    if (!isAuthenticated) {
      toast.info('Faça login ou crie uma conta para começar');
      router.push('/register');
      return;
    }

    // Check if already has subscription
    if (subscription?.has_subscription) {
      toast.info('Você já tem uma assinatura ativa');
      router.push('/');
      return;
    }

    setIsStarting(true);
    try {
      await startCheckout(slug);
      // Will redirect to Stripe Checkout
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Erro ao iniciar checkout. Tente novamente.');
      setIsStarting(false);
    }
  };

  const isLoading = subLoading || plansLoading;

  // Calculate discount info per plan
  const getDiscountInfo = (plan: PlanInfo) => {
    if (plan.max_users <= 1) return null;
    const pricePerUser = 99; // base price per user
    const originalTotal = pricePerUser * plan.max_users;
    if (plan.price_monthly_brl >= originalTotal) return null;
    const discount = Math.round((1 - plan.price_monthly_brl / originalTotal) * 100);
    return { originalTotal, discount };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d767b]/5 via-[#0d767b]/8 to-[#0d767b]/12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-[#0d767b]">
              ControlladorIA
            </Link>
            <div className="flex gap-4">
              {isAuthenticated ? (
                <Link
                  href="/"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="bg-[#0d767b] hover:bg-[#095a5e] text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Cadastrar
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Escolha o Plano Ideal Para Sua Equipe
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comece com 15 dias grátis. Sem cartão de crédito. Cancele quando quiser.
          </p>
        </div>

        {/* Loading State */}
        {plansLoading ? (
          <div className="flex justify-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#0d767b] border-r-transparent"></div>
          </div>
        ) : (
          /* Pricing Cards */
          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {plans.map((plan) => {
              const discountInfo = getDiscountInfo(plan);
              const featureList = buildFeatureList(plan);

              return (
                <div
                  key={plan.slug}
                  className={`bg-white rounded-2xl shadow-xl overflow-hidden ${
                    plan.is_highlighted ? 'border-4 border-[#0d767b] transform scale-105' : 'border-2 border-gray-200'
                  }`}
                >
                  {/* Badge */}
                  {plan.is_highlighted && (
                    <div className="bg-gradient-to-r from-[#0d767b] to-[#095a5e] text-white text-center py-3 px-4">
                      <p className="text-sm font-semibold uppercase tracking-wide">
                        Mais Popular
                      </p>
                    </div>
                  )}

                  <div className="p-6 sm:p-8">
                    {/* Plan Name */}
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{plan.display_name}</h2>
                      <p className="text-gray-600 text-sm">
                        {plan.max_users === 1 ? '1 usuário' : `Até ${plan.max_users} usuários`}
                      </p>
                    </div>

                    {/* Per User Price (BIG) */}
                    <div className="text-center mb-4">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-lg text-gray-500">R$</span>
                        <span className="text-5xl font-extrabold text-gray-900">
                          {plan.max_users > 1 ? Math.round(plan.price_monthly_brl / plan.max_users) : plan.price_monthly_brl}
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm mt-1">por usuário / mês</p>
                    </div>

                    {/* Total Price with Discount */}
                    {discountInfo && (
                      <div className="text-center mb-4 bg-green-50 rounded-xl py-3 px-4">
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-gray-400 line-through text-lg">
                            R$ {discountInfo.originalTotal}
                          </span>
                          <span className="text-2xl font-bold text-green-700">
                            R$ {plan.price_monthly_brl}
                          </span>
                          <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                            -{discountInfo.discount}%
                          </span>
                        </div>
                        <p className="text-green-600 text-xs mt-1 font-medium">
                          total / mês
                        </p>
                      </div>
                    )}

                    {!discountInfo && (
                      <div className="text-center mb-4">
                        <p className="text-gray-500 text-sm">
                          R$ {plan.price_monthly_brl}/mês total
                        </p>
                      </div>
                    )}

                    <p className="text-green-600 font-semibold text-center text-sm mb-6">
                      15 dias grátis
                    </p>

                    {/* CTA Button */}
                    <button
                      onClick={() => handleStartTrial(plan.slug)}
                      disabled={isStarting || isLoading}
                      className={`w-full font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg mb-6 ${
                        plan.is_highlighted
                          ? 'bg-gradient-to-r from-[#0d767b] to-[#095a5e] hover:from-[#095a5e] hover:to-[#084a4e] text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      {isStarting || isLoading ? 'Carregando...' : 'Começar Agora'}
                    </button>

                    {/* Features */}
                    <div className="space-y-3">
                      {featureList.map((feature, fIndex) => (
                        <div key={fIndex} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                            <Check className="w-3 h-3 text-green-600" />
                          </div>
                          <span className="text-gray-700 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-10">
            Perguntas Frequentes
          </h2>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">
                Como funciona o teste grátis?
              </h3>
              <p className="text-gray-600">
                Você tem 15 dias de acesso completo e gratuito a todas as funcionalidades.
                Após o período de teste, sua assinatura será renovada automaticamente.
                Você pode cancelar a qualquer momento durante o teste sem ser cobrado.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">
                Posso cancelar a qualquer momento?
              </h3>
              <p className="text-gray-600">
                Sim! Você pode cancelar sua assinatura a qualquer momento através do painel de
                gerenciamento. Não há multas ou taxas de cancelamento.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">
                Quais formas de pagamento são aceitas?
              </h3>
              <p className="text-gray-600">
                Aceitamos todas as principais formas de pagamento através do Stripe: cartões de
                crédito (Visa, Mastercard, Amex), débito, PIX e boleto bancário.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 mb-2">
                Há limite de documentos?
              </h3>
              <p className="text-gray-600">
                Não! Você pode fazer upload ilimitado de documentos durante sua assinatura.
                Processamos PDF, Excel, imagens e XML sem restrições.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 mb-4">Pagamento seguro processado por</p>
          <div className="flex justify-center items-center gap-8">
            <span className="text-2xl font-bold text-[#0d767b]">Stripe</span>
          </div>
        </div>
      </div>
    </div>
  );
}
