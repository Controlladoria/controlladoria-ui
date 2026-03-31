'use client';

/**
 * Trial Banner Component
 * Shows a warning banner when user's trial is ending soon
 */

import { useSubscription } from '@/contexts/SubscriptionContext';
import { AlertCircle, X } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function TrialBanner() {
  const { isTrialing, trialDaysLeft, subscription } = useSubscription();
  const [isDismissed, setIsDismissed] = useState(false);

  // Only show if trialing and 3 days or less remaining
  if (!isTrialing || trialDaysLeft === null || trialDaysLeft > 3 || isDismissed) {
    return null;
  }

  const isUrgent = trialDaysLeft <= 1;
  const bgColor = isUrgent ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200';
  const textColor = isUrgent ? 'text-red-900' : 'text-yellow-900';
  const iconColor = isUrgent ? 'text-red-600' : 'text-yellow-600';
  const linkColor = isUrgent ? 'text-red-700 hover:text-red-900' : 'text-yellow-700 hover:text-yellow-900';

  return (
    <div className={`border ${bgColor} rounded-lg p-4 mb-6 relative`}>
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <AlertCircle className={`w-5 h-5 ${iconColor} mt-0.5 flex-shrink-0`} />
        <div className="flex-1">
          <h3 className={`font-semibold ${textColor} mb-1`}>
            {isUrgent ? '⚠️ Último dia de teste!' : '⏰ Seu teste está acabando'}
          </h3>
          <p className={`${textColor.replace('900', '800')} text-sm mb-3`}>
            {trialDaysLeft === 0 ? (
              <>Seu período de teste expira hoje às 23:59.</>
            ) : trialDaysLeft === 1 ? (
              <>Resta apenas 1 dia do seu período de teste gratuito.</>
            ) : (
              <>Restam apenas {trialDaysLeft} dias do seu período de teste gratuito.</>
            )}{' '}
            Adicione uma forma de pagamento para continuar usando todas as funcionalidades do
            ControlladorIA sem interrupções.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/account/subscription"
              className={`inline-flex items-center gap-2 ${linkColor} font-semibold text-sm underline`}
            >
              Gerenciar Assinatura →
            </Link>
            {subscription?.trial_end && (
              <span className="text-sm text-gray-600">
                Teste termina em:{' '}
                {new Date(subscription.trial_end).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
