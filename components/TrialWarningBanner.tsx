'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, X, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import Link from 'next/link';

export default function TrialWarningBanner() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { subscription, isTrialing, trialDaysLeft, isLoading: subLoading } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  // Check if user has dismissed banner in this session
  useEffect(() => {
    const isDismissed = sessionStorage.getItem('trial-banner-dismissed');
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('trial-banner-dismissed', 'true');
  };

  // Don't show if:
  // - Not authenticated
  // - Still loading
  // - Not trialing
  // - Dismissed
  if (!isAuthenticated || authLoading || subLoading || !isTrialing || dismissed) {
    return null;
  }

  const daysLeft = trialDaysLeft ?? 0;
  const isUrgent = daysLeft <= 3;
  const isVeryUrgent = daysLeft <= 1;

  return (
    <div
      className={`sticky top-0 z-[60] shadow-lg ${
        isVeryUrgent
          ? 'bg-gradient-to-r from-red-600 to-red-700'
          : isUrgent
          ? 'bg-gradient-to-r from-orange-600 to-orange-700'
          : 'bg-gradient-to-r from-blue-600 to-indigo-700'
      }`}
    >
      <div className="max-w-screen-2xl mx-auto pl-16 lg:pl-4 pr-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            {isVeryUrgent ? (
              <AlertTriangle className="w-6 h-6 text-white flex-shrink-0 animate-pulse" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-white flex-shrink-0" />
            )}

            <div className="flex-1">
              <p className="text-white font-semibold text-base md:text-lg">
                {isVeryUrgent ? (
                  <>⚠️ ÚLTIMO DIA DE TESTE GRÁTIS!</>
                ) : isUrgent ? (
                  <>🚨 Seu teste grátis está acabando!</>
                ) : (
                  <>📢 Você está no período de teste</>
                )}
              </p>
              <p className="text-white/90 text-sm md:text-base">
                {daysLeft === 0 ? (
                  <>
                    Seu teste <strong>expira hoje</strong>! Assine agora para continuar usando todos os recursos.
                  </>
                ) : daysLeft === 1 ? (
                  <>
                    Resta apenas <strong>1 dia</strong> do seu teste grátis. Assine agora para não perder o acesso!
                  </>
                ) : (
                  <>
                    Restam <strong>{daysLeft} dias</strong> do seu teste grátis. Assine agora para garantir acesso ilimitado!
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/account/subscription"
              className="bg-white hover:bg-gray-100 text-gray-900 font-semibold px-6 py-3 rounded-lg transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <CreditCard className="w-5 h-5" />
              <span className="hidden sm:inline">
                {isVeryUrgent ? 'Assinar Agora!' : 'Assinar Plano'}
              </span>
              <span className="sm:hidden">Assinar</span>
            </Link>

            {!isVeryUrgent && (
              <button
                onClick={handleDismiss}
                className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
