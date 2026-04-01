"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api";
import type { Stats } from "@/lib/types";
import Sidebar from "@/components/layout/Sidebar";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, FileText, Upload as UploadIcon, BarChart3, ArrowRight, ClipboardList, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import SubscriptionGuard from "@/components/stripe/SubscriptionGuard";
import { initialBalanceApi } from "@/lib/initial-balance-api";
import InitialBalanceWizard from "@/components/InitialBalanceWizard";

const FinancialReportsWithCharts = dynamic(() => import("@/components/FinancialReportsWithCharts"), {
  ssr: false,
  loading: () => <div className="py-8 text-center text-muted-foreground">Carregando estatísticas...</div>,
});

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsWizard, setNeedsWizard] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [checkedBalance, setCheckedBalance] = useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !isAuthenticated) {
      window.location.href = '/login';
      return;
    }

    // Only load stats when user is authenticated
    if (isAuthenticated && !authLoading) {
      loadStats();
      checkInitialBalance();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  const loadStats = async () => {
    try {
      const data = await apiClient.getStats();
      setStats(data);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkInitialBalance = async () => {
    try {
      const status = await initialBalanceApi.getStatus();
      if (!status.has_initial_balance || !status.is_completed) {
        setNeedsWizard(true);
      }
    } catch {
      // Silently ignore
    } finally {
      setCheckedBalance(true);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-accent/20 to-accent/40 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area - Add padding on mobile for hamburger button */}
      <div className="flex-1 flex flex-col overflow-hidden lg:pt-0">
        {/* Top Nav Bar with Gradient */}
        <div className="hidden lg:block h-2 bg-gradient-to-r from-[#095a5e] via-[#0d767b] to-[#1a9da3] dark:from-[#d15a12] dark:via-[#f86a15] dark:to-[#fa8c4a]"></div>

        {/* Top Header */}
        <header className="bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 pt-16 lg:pt-4 pb-4 sm:py-6">
            <div className="text-center lg:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-1">Bem-vindo ao ControlladorIA, {user?.full_name?.split(' ')[0] || 'Usuário'}</p>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <SubscriptionGuard>
          <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            {/* Dashboard Cards */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6 sm:mb-8">
              <Card className="shadow-xl border-2 border-green-500/20 bg-gradient-to-br from-card to-green-500/10 hover:shadow-2xl transition-all hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-base sm:text-lg lg:text-xl font-bold text-foreground">✅ Processados</CardTitle>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-green-600 dark:text-green-400">{stats?.completed || 0}</div>
                  <p className="text-sm sm:text-base text-muted-foreground mt-2">extrações concluídas</p>
                </CardContent>
              </Card>

              <Card className="shadow-xl border-2 border-yellow-500/20 bg-gradient-to-br from-card to-yellow-500/10 hover:shadow-2xl transition-all hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-base sm:text-lg lg:text-xl font-bold text-foreground">⏳ Pendentes</CardTitle>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                    <UploadIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-yellow-600 dark:text-yellow-400">
                    {(stats?.pending || 0) + (stats?.processing || 0) + (stats?.failed || 0)}
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground mt-2">aguardando processamento</p>
                </CardContent>
              </Card>

              <Link href="/documents">
                <Card className="shadow-xl border-2 border-blue-500/20 bg-gradient-to-br from-card to-blue-500/10 hover:shadow-2xl transition-all hover:scale-105 cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <FileText className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                      <ArrowRight className="w-6 h-6 text-blue-400 dark:text-blue-300" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Ver Documentos</h3>
                    <p className="text-base text-muted-foreground">{stats?.total_documents || 0} documentos cadastrados</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/upload">
                <Card className="shadow-xl border-2 border-green-500/20 bg-gradient-to-br from-card to-green-500/10 hover:shadow-2xl transition-all hover:scale-105 cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <UploadIcon className="w-12 h-12 text-green-600 dark:text-green-400" />
                      <ArrowRight className="w-6 h-6 text-green-400 dark:text-green-300" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Fazer Upload</h3>
                    <p className="text-base text-muted-foreground">Envie novos documentos para processamento</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/validation">
                <Card className="shadow-xl border-2 border-purple-500/20 bg-gradient-to-br from-card to-purple-500/10 hover:shadow-2xl transition-all hover:scale-105 cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <BarChart3 className="w-12 h-12 text-purple-600 dark:text-purple-400" />
                      <ArrowRight className="w-6 h-6 text-purple-400 dark:text-purple-300" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Validação</h3>
                    <p className="text-base text-muted-foreground">Revise e valide documentos pendentes</p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/dre-balanco">
                <Card className="shadow-xl border-2 border-orange-500/20 bg-gradient-to-br from-card to-orange-500/10 hover:shadow-2xl transition-all hover:scale-105 cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <TrendingUp className="w-12 h-12 text-orange-600 dark:text-orange-400" />
                      <ArrowRight className="w-6 h-6 text-orange-400 dark:text-orange-300" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Relatórios Gerenciais</h3>
                    <p className="text-base text-muted-foreground">DRE, Balanço, Fluxo de Caixa e Indicadores</p>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Financial Statistics */}
            {isAuthenticated && (
              <div className="mt-8">
                {!checkedBalance && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                )}
                {checkedBalance && needsWizard && !showWizard && (
                  <div className="flex items-center justify-center py-12">
                    <div className="max-w-lg w-full text-center space-y-6 px-4">
                      <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#0d767b] to-[#095a5e] dark:from-[#d15a12] dark:to-[#fa8c4a] rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <ClipboardList className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-foreground">Saldos Iniciais Necessários</h2>
                        <p className="text-muted-foreground mt-3 leading-relaxed">
                          Para visualizar as estatísticas financeiras, precisamos dos saldos de abertura da sua empresa.
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
                {checkedBalance && !needsWizard && (
                  <FinancialReportsWithCharts />
                )}
              </div>
            )}
          </div>
          </SubscriptionGuard>
        </div>
      </div>

      {showWizard && (
        <InitialBalanceWizard
          onComplete={() => {
            setShowWizard(false);
            setNeedsWizard(false);
          }}
          onSkip={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}

