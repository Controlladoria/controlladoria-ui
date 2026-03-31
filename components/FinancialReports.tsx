"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import type { FinancialSummary, CategoryBreakdown } from "@/lib/types";

export default function FinancialReports() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [summaryData, categoriesData] = await Promise.all([
        apiClient.getFinancialSummary(),
        apiClient.getCategoryBreakdown(),
      ]);
      setSummary(summaryData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Carregando relatórios...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Financeiro</CardTitle>
          <CardDescription>Visão geral de receitas e despesas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 font-medium">Receitas</p>
              <p className="text-2xl font-bold text-green-900">
                {summary ? formatCurrency(summary.summary.total_income) : "R$ 0,00"}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {summary?.summary.income_count || 0} documentos
              </p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-700 font-medium">Despesas</p>
              <p className="text-2xl font-bold text-red-900">
                {summary ? formatCurrency(summary.summary.total_expense) : "R$ 0,00"}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {summary?.summary.expense_count || 0} documentos
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 font-medium">Saldo</p>
              <p className="text-2xl font-bold text-blue-900">
                {summary ? formatCurrency(summary.summary.net_balance) : "R$ 0,00"}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {(summary?.summary.income_count || 0) + (summary?.summary.expense_count || 0)} total
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Por Categoria</CardTitle>
          <CardDescription>Detalhamento por categoria de despesas/receitas</CardDescription>
        </CardHeader>
        <CardContent>
          {categories && categories.categories.length > 0 ? (
            <div className="space-y-2">
              {categories.categories.map((cat, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {cat.category || "Sem categoria"}
                    </p>
                    <p className="text-sm text-slate-600">
                      {cat.count} {cat.count === 1 ? "documento" : "documentos"}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(cat.total_amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-600 text-center py-4">Nenhuma categoria encontrada</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={loadReports}>Atualizar Relatórios</Button>
      </div>
    </div>
  );
}
