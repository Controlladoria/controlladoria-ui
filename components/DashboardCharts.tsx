"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from "recharts";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Color palette
const COLORS = {
  receita: "#22c55e",       // green
  custos_var: "#ef4444",    // red
  margem: "#3b82f6",        // blue
  custos_fixos: "#f97316",  // orange
  ebitda: "#8b5cf6",        // purple
  deducoes: "#f59e0b",      // amber
  lucro: "#06b6d4",         // cyan
};

const PIE_COLORS = [
  "#3b82f6", "#22c55e", "#f97316", "#8b5cf6", "#ef4444",
  "#06b6d4", "#f59e0b", "#ec4899", "#14b8a6", "#6366f1",
];

interface MonthlyData {
  month: number;
  month_name: string;
  receita_bruta: string;
  deducoes: string;
  receita_liquida: string;
  custos_variaveis: string;
  margem_contribuicao: string;
  custos_fixos: string;
  ebitda: string;
  lucro_liquido: string;
  pct_custos_variaveis: number;
  pct_margem_contribuicao: number;
  pct_custos_fixos: number;
  pct_ebitda: number;
  income_count: number;
  expense_count: number;
  top_categories: { category: string; amount: string; count: number }[];
  revenue_types: { type: string; amount: string }[];
}

interface DashboardMetrics {
  year: number;
  currency: string;
  year_totals: {
    receita_bruta: string;
    total_expenses: string;
    ebitda: string;
  };
  monthly: MonthlyData[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyShort(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1)}K`;
  }
  return `R$ ${value.toFixed(0)}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} style={{ color: entry.color }} className="flex justify-between gap-4">
          <span>{entry.name}:</span>
          <span className="font-medium">
            {entry.name?.includes("%")
              ? `${entry.value?.toFixed(1)}%`
              : formatCurrency(entry.value)}
          </span>
        </p>
      ))}
    </div>
  );
};

export default function DashboardCharts() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/reports/dashboard-metrics?year=${year}`);
      setMetrics(response.data);
    } catch (err: any) {
      console.error("Error loading dashboard metrics:", err);
      setError("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Carregando dados...</span>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {error || "Nenhum dado disponivel"}
      </div>
    );
  }

  // Prepare chart data
  const chartData = metrics.monthly.map((m) => ({
    name: m.month_name,
    receita: parseFloat(m.receita_bruta),
    custos_var: Math.abs(parseFloat(m.custos_variaveis)),
    margem: parseFloat(m.margem_contribuicao),
    custos_fixos: Math.abs(parseFloat(m.custos_fixos)),
    ebitda: parseFloat(m.ebitda),
    deducoes: Math.abs(parseFloat(m.deducoes)),
    pct_custos_var: m.pct_custos_variaveis,
    pct_margem: m.pct_margem_contribuicao,
    pct_custos_fixos: m.pct_custos_fixos,
    pct_ebitda: m.pct_ebitda,
  }));

  // Pie chart data - aggregate revenue types across all months
  const revenueTypeMap: Record<string, number> = {};
  metrics.monthly.forEach((m) => {
    m.revenue_types.forEach((rt) => {
      revenueTypeMap[rt.type] = (revenueTypeMap[rt.type] || 0) + parseFloat(rt.amount);
    });
  });
  const pieData = Object.entries(revenueTypeMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Top categories for the year
  const categoryMap: Record<string, { amount: number; count: number }> = {};
  metrics.monthly.forEach((m) => {
    m.top_categories.forEach((c) => {
      if (!categoryMap[c.category]) {
        categoryMap[c.category] = { amount: 0, count: 0 };
      }
      categoryMap[c.category].amount += parseFloat(c.amount);
      categoryMap[c.category].count += c.count;
    });
  });
  const topCategories = Object.entries(categoryMap)
    .map(([name, data]) => ({ name: name.replace(/_/g, " "), ...data }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const hasData = chartData.some((d) => d.receita > 0 || d.custos_var > 0);

  return (
    <div className="space-y-6">
      {/* Year Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">
          Painel Financeiro
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setYear((y) => y - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-lg font-semibold text-foreground min-w-[60px] text-center">
            {year}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= new Date().getFullYear()}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum dado financeiro encontrado para {year}.
            Faça upload de documentos para visualizar os graficos.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Receita Bruta por Mes (Bar) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Receita Bruta / Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="receita" name="Receita Bruta" fill={COLORS.receita} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 2. Receita por Tipo (Pie) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Receita por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                {pieData.length > 0 ? (
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={40}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${(name || "").substring(0, 15)} ${((percent || 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value || 0))} />
                  </PieChart>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Sem dados de receita
                  </div>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 3. Custos Variaveis / Mes (Bar) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Custos Variaveis / Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="custos_var" name="Custos Variaveis" fill={COLORS.custos_var} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 4. Custos Variaveis % Receita / Mes (Line) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Custos Variaveis % Receita / Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="pct_custos_var"
                    name="Custos Var %"
                    stroke={COLORS.custos_var}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 5. Margem de Contribuicao / Mes (Line) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Margem de Contribuicao / Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="margem"
                    name="Margem Contribuicao"
                    fill={COLORS.margem}
                    fillOpacity={0.15}
                    stroke={COLORS.margem}
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 6. Margem de Contribuicao % / Mes (Line) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Margem Contribuicao % / Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="pct_margem"
                    name="Margem %"
                    stroke={COLORS.margem}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 7. Custos Fixos / Mes (Line) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Custos Fixos / Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="custos_fixos"
                    name="Custos Fixos"
                    stroke={COLORS.custos_fixos}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 8. Custos Fixos % / Mes (Line) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Custos Fixos % Receita / Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="pct_custos_fixos"
                    name="Custos Fixos %"
                    stroke={COLORS.custos_fixos}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 9. EBITDA / Mes (Line + Area) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">EBITDA / Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="ebitda"
                    name="EBITDA"
                    fill={COLORS.ebitda}
                    fillOpacity={0.15}
                    stroke={COLORS.ebitda}
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 10. EBITDA % / Mes (Line) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">EBITDA % Receita / Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="pct_ebitda"
                    name="EBITDA %"
                    stroke={COLORS.ebitda}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
