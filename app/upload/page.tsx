"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DocumentUpload from "@/components/DocumentUpload";
import SubscriptionGuard from "@/components/stripe/SubscriptionGuard";
import Sidebar from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { FileText, Download, FileSpreadsheet } from "lucide-react";

export default function UploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [hasUploaded, setHasUploaded] = useState(false);

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden lg:pt-0">
        <div className="hidden lg:block h-2 bg-gradient-to-r from-[#095a5e] via-[#0d767b] to-[#1a9da3] dark:from-[#d15a12] dark:via-[#f86a15] dark:to-[#fa8c4a]"></div>

        <header className="bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 pt-16 lg:pt-6 pb-4 sm:py-6">
            <div className="text-center lg:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Upload de Documentos</h1>
              <p className="text-sm sm:text-lg text-muted-foreground mt-1">
                Envie notas fiscais, recibos ou documentos financeiros
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="px-8 py-8">
            <SubscriptionGuard>
              <Card className="shadow-xl border-2">
                <CardContent className="pt-8">
                  <DocumentUpload
                    onUploadSuccess={() => setHasUploaded(true)}
                  />

                  {hasUploaded && (
                    <div className="mt-8 flex justify-center">
                      <Button
                        size="lg"
                        onClick={() => router.push("/validation")}
                        className="gap-2 text-lg px-8 py-6 bg-gradient-to-r from-[#095a5e] via-[#0d767b] to-[#1a9da3] dark:from-[#d15a12] dark:via-[#f86a15] dark:to-[#fa8c4a] hover:opacity-90 text-white font-bold shadow-lg"
                      >
                        <FileText className="w-6 h-6" />
                        Ir para Validação
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Template Download */}
              <Card className="shadow-md border mt-6">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-green-500/10 dark:bg-green-500/20">
                      <FileSpreadsheet className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground">Modelo de Planilha</h3>
                      <p className="text-sm text-muted-foreground">
                        Baixe nossa planilha modelo com abas &quot;Recebimentos&quot; e &quot;Pagamentos&quot; para padronizar seus lançamentos financeiros.
                        Inclui listas de tipos e categorias contábeis.
                      </p>
                    </div>
                    <a
                      href="/templates/modelo-financeiro.xlsx"
                      download="modelo-financeiro.xlsx"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      Baixar Modelo
                    </a>
                  </div>
                </CardContent>
              </Card>
            </SubscriptionGuard>
          </div>
        </div>
      </div>
    </div>
  );
}
