'use client';

/**
 * Subscription Guard Component
 * Prevents access to features that require an active subscription
 */

import { useRouter } from 'next/navigation';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export default function SubscriptionGuard({
  children,
  fallback,
  redirectTo,
}: SubscriptionGuardProps) {
  const router = useRouter();
  const { hasActiveSubscription, isLoading, subscription } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#0d767b] border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-600">Verificando assinatura...</p>
        </div>
      </div>
    );
  }

  if (!hasActiveSubscription) {
    if (redirectTo) {
      router.push(redirectTo);
      return null;
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    // Default fallback UI - SUPER COOL BLOCKED STATE
    return (
      <div className="relative bg-gradient-to-br from-[#0d767b]/5 via-[#0d767b]/8 to-[#0d767b]/12 border-4 border-[#0d767b]/30 rounded-2xl p-16 text-center max-w-5xl mx-auto shadow-2xl">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-2xl opacity-10">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-400 rounded-full blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Icon */}
          <div className="w-32 h-32 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg animate-pulse">
            <AlertCircle className="w-16 h-16 text-yellow-600" />
          </div>

          {/* Title */}
          <h2 className="text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
            {subscription?.has_subscription && subscription.status === 'past_due'
              ? '💳 Pagamento Pendente'
              : '🔒 Assinatura Necessária'}
          </h2>

          {/* Description */}
          <p className="text-2xl text-gray-700 mb-10 max-w-3xl mx-auto leading-relaxed">
            {subscription?.has_subscription && subscription.status === 'past_due' ? (
              <>
                Seu pagamento está pendente. Por favor, <strong>atualize suas informações de pagamento</strong> para continuar usando o ControlladorIA.
              </>
            ) : subscription?.has_subscription && (subscription.status === 'canceled' || subscription.status === 'expired') ? (
              <>
                Seu teste grátis <strong>expirou</strong>! 😢 Assine agora para continuar processando seus documentos financeiros com IA.
              </>
            ) : (
              <>
                Esta funcionalidade requer uma assinatura ativa. Comece seu <strong>teste grátis de 15 dias</strong> agora! 🚀
              </>
            )}
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <Link
              href="/pricing"
              className="group bg-gradient-to-r from-[#0d767b] to-[#095a5e] hover:from-[#095a5e] hover:to-[#084a4e] text-white text-xl font-bold py-6 px-12 rounded-xl transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl"
            >
              <span className="flex items-center justify-center gap-3">
                🎉 Ver Planos e Começar Teste
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
            {subscription?.has_subscription && (
              <Link
                href="/account/subscription"
                className="bg-white hover:bg-gray-50 text-gray-900 text-xl font-bold py-6 px-12 rounded-xl border-4 border-gray-300 transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl"
              >
                ⚙️ Gerenciar Assinatura
              </Link>
            )}
          </div>

          {/* Benefits Preview */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
            <div className="bg-white/80 backdrop-blur rounded-xl p-6 shadow-lg">
              <div className="text-4xl mb-3">📄</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Ilimitado</h3>
              <p className="text-sm text-gray-600">Processe quantos documentos quiser</p>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-xl p-6 shadow-lg">
              <div className="text-4xl mb-3">🤖</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">IA Avançada</h3>
              <p className="text-sm text-gray-600">Extração automática de dados</p>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-xl p-6 shadow-lg">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Relatórios</h3>
              <p className="text-sm text-gray-600">Análises completas e exportação</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
