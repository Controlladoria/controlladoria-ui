"use client";

import { useState, useEffect } from "react";
import AdvancedReports from "@/components/AdvancedReports";
import Sidebar from "@/components/layout/Sidebar";
import InitialBalanceWizard from "@/components/InitialBalanceWizard";
import { useAuth } from "@/contexts/AuthContext";
import { initialBalanceApi } from "@/lib/initial-balance-api";
import { ClipboardList, Loader2 } from "lucide-react";
import SubscriptionGuard from "@/components/stripe/SubscriptionGuard";

export default function DreBalancoPage() {
  const { user } = useAuth();
  const [needsWizard, setNeedsWizard] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [checkedBalance, setCheckedBalance] = useState(false);

  useEffect(() => {
    const checkBalance = async () => {
      try {
        const status = await initialBalanceApi.getStatus();
        if (!status.has_initial_balance || !status.is_completed) {
          setNeedsWizard(true);
        }
      } catch {
        // Silently ignore - user may not have an active org yet
      } finally {
        setCheckedBalance(true);
      }
    };
    checkBalance();
  }, []);

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden lg:pt-0">
        {/* Top Nav Bar with Gradient */}
        <div className="hidden lg:block h-2 bg-gradient-to-r from-[#095a5e] via-[#0d767b] to-[#1a9da3] dark:from-[#d15a12] dark:via-[#f86a15] dark:to-[#fa8c4a]"></div>

        <header className="bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 pt-16 lg:pt-4 pb-4 sm:py-6">
            <div className="text-center lg:text-left">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Relatórios Gerenciais</h1>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-1">
                DRE, Balanço Gerencial e Fluxo de Caixa
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <SubscriptionGuard>
          <div className="px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
            {/* Loading state */}
            {!checkedBalance && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Blocker: must fill initial balance first */}
            {checkedBalance && needsWizard && !showWizard && (
              <div className="flex items-center justify-center py-12 sm:py-20">
                <div className="max-w-lg w-full text-center space-y-6 px-4">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#0d767b] to-[#095a5e] dark:from-[#d15a12] dark:to-[#fa8c4a] rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <ClipboardList className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Saldos Iniciais Necessários</h2>
                    <p className="text-muted-foreground mt-3 leading-relaxed">
                      Para gerar relatórios financeiros precisos, precisamos dos saldos de abertura da sua empresa.
                      São dados aproximados que servem como ponto de partida para o Balanço Gerencial e Fluxo de Caixa.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Leva apenas alguns minutos para preencher.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowWizard(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#0d767b] to-[#095a5e] dark:from-[#d15a12] dark:to-[#fa8c4a] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                  >
                    <ClipboardList className="w-5 h-5" />
                    Preencher Saldos Iniciais
                  </button>
                </div>
              </div>
            )}

            {/* Reports only visible after initial balance is completed */}
            {checkedBalance && !needsWizard && (
              <AdvancedReports />
            )}
          </div>
          </SubscriptionGuard>
        </div>
      </div>

      {/* Initial Balance Wizard - no onSkip = no way to dismiss without completing */}
      {showWizard && (
        <InitialBalanceWizard
          onComplete={() => {
            setShowWizard(false);
            setNeedsWizard(false);
          }}
        />
      )}
    </div>
  );
}
