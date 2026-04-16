"use client";

import { useState, useEffect } from "react";
import DocumentList from "@/components/DocumentList";
import Sidebar from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import type { Stats } from "@/lib/types";
import SubscriptionGuard from "@/components/stripe/SubscriptionGuard";
import { Download, FileSpreadsheet } from "lucide-react";

export default function DocumentsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    // Only load stats when user is authenticated
    if (isAuthenticated && !authLoading) {
      loadStats();
    }
  }, [isAuthenticated, authLoading]);

  const loadStats = async () => {
    try {
      const data = await apiClient.getStats();
      setStats(data);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden lg:pt-0">
        {/* Top Nav Bar with Gradient */}
        <div className="hidden lg:block h-2 bg-gradient-to-r from-[#095a5e] via-[#0d767b] to-[#1a9da3] dark:from-[#d15a12] dark:via-[#f86a15] dark:to-[#fa8c4a]"></div>

        <header className="bg-card/80 backdrop-blur-md border-b-2 border-border shadow-lg">
          <div className="px-4 sm:px-6 lg:px-8 pt-16 lg:pt-6 pb-6 sm:py-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="text-center lg:text-left">
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground">📄 Documentos</h1>
                <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mt-2">
                  Gerencie todos os documentos financeiros
                </p>
              </div>
              <a
                href="/templates/modelo-financeiro.xlsx"
                download="modelo-financeiro.xlsx"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition-colors shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Baixar Modelo
              </a>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <SubscriptionGuard>
          <div className="px-2 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-12">
            <DocumentList onDocumentChange={loadStats} />
          </div>
          </SubscriptionGuard>
        </div>
      </div>
    </div>
  );
}
