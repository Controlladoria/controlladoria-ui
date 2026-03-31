"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { InfoModal } from "@/components/ui/info-modal";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// Types for dashboard metrics
interface MonthlyMetric {
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
  revenue_types?: Array<{ type: string; amount: string }>;
}

interface DashboardMetrics {
  year: number;
  currency: string;
  year_totals: {
    receita_bruta: string;
    total_expenses: string;
    ebitda: string;
  };
  monthly: MonthlyMetric[];
}

// Chart colors matching professional financial reports
const COLORS = {
  receita: "#3b82f6",
  custos: "#ef4444",
  margem: "#10b981",
  fixos: "#f59e0b",
  ebitda: "#8b5cf6",
  deducoes: "#6366f1",
  pie: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"],
};

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatBRLFull = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const compactBRL = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`;
  return `R$ ${value.toFixed(0)}`;
};

const formatPct = (value: number) => `${(value * 100).toFixed(1)}%`;

// Custom tooltip for BRL values
const BRLTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-foreground">
      <p className="text-sm font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm" style={{ color: p.color }}>
          {p.name}: {formatBRLFull(p.value)}
        </p>
      ))}
    </div>
  );
};

// Custom tooltip for percentage values
const PctTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-foreground">
      <p className="text-sm font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm" style={{ color: p.color }}>
          {p.name}: {formatPct(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function FinancialReportsWithCharts() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // null = all months

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports/dashboard-metrics", {
        params: { year: selectedYear },
      });
      setMetrics(res.data);
    } catch (error) {
      console.error("Error loading dashboard metrics:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-lg text-muted-foreground">Carregando estatísticas...</span>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-lg">Nenhum dado disponível para {selectedYear}</p>
        <p className="text-sm mt-2">Faça upload de documentos para ver as estatísticas.</p>
      </div>
    );
  }

  // Transform monthly data for charts (filter by selected month if set)
  const filteredMonthly = selectedMonth
    ? metrics.monthly.filter((m) => m.month === selectedMonth)
    : metrics.monthly;

  const chartData = filteredMonthly.map((m) => ({
    name: m.month_name,
    receita_bruta: parseFloat(m.receita_bruta) || 0,
    deducoes: parseFloat(m.deducoes) || 0,
    receita_liquida: parseFloat(m.receita_liquida) || 0,
    custos_variaveis: parseFloat(m.custos_variaveis) || 0,
    margem_contribuicao: parseFloat(m.margem_contribuicao) || 0,
    custos_fixos: parseFloat(m.custos_fixos) || 0,
    ebitda: parseFloat(m.ebitda) || 0,
    pct_custos_variaveis: m.pct_custos_variaveis || 0,
    pct_margem_contribuicao: m.pct_margem_contribuicao || 0,
    pct_custos_fixos: m.pct_custos_fixos || 0,
    pct_ebitda: m.pct_ebitda || 0,
  }));

  // Summary totals (filtered by month if selected, otherwise year totals)
  const yearReceita = selectedMonth
    ? chartData.reduce((s, m) => s + m.receita_bruta, 0)
    : parseFloat(metrics.year_totals.receita_bruta) || 0;
  const yearExpenses = selectedMonth
    ? chartData.reduce((s, m) => s + m.custos_variaveis + m.custos_fixos + m.deducoes, 0)
    : parseFloat(metrics.year_totals.total_expenses) || 0;
  const yearEbitda = selectedMonth
    ? chartData.reduce((s, m) => s + m.ebitda, 0)
    : parseFloat(metrics.year_totals.ebitda) || 0;

  // Pie chart: how revenue is distributed (Deduções, Custos Variáveis, Gastos Fixos, EBITDA)
  const totalDeducoes = chartData.reduce((s, m) => s + m.deducoes, 0);
  const totalCustosVar = chartData.reduce((s, m) => s + m.custos_variaveis, 0);
  const totalCustosFixos = chartData.reduce((s, m) => s + m.custos_fixos, 0);

  const pieData = [
    { name: "Deduções", value: Math.abs(totalDeducoes), color: COLORS.deducoes },
    { name: "Custos Variáveis", value: Math.abs(totalCustosVar), color: COLORS.custos },
    { name: "Gastos Fixos", value: Math.abs(totalCustosFixos), color: COLORS.fixos },
    ...(yearEbitda > 0
      ? [{ name: "EBITDA", value: yearEbitda, color: COLORS.ebitda }]
      : []),
  ].filter((d) => d.value > 0);

  // Year selector options
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      {/* Year & Month Selector */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-base font-semibold text-foreground">Ano:</label>
            <div className="flex gap-2 flex-wrap">
              {years.map((y) => (
                <Button
                  key={y}
                  variant={selectedYear === y ? "default" : "outline"}
                  onClick={() => setSelectedYear(y)}
                  className="text-base px-5 py-3"
                >
                  {y}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-base font-semibold text-foreground">Mês:</label>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedMonth === null ? "default" : "outline"}
                onClick={() => setSelectedMonth(null)}
                className="text-sm px-3 py-2"
              >
                Todos
              </Button>
              {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map((m, i) => (
                <Button
                  key={i}
                  variant={selectedMonth === i + 1 ? "default" : "outline"}
                  onClick={() => setSelectedMonth(i + 1)}
                  className="text-sm px-3 py-2"
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Receita Bruta
              <InfoModal title="Receita Bruta" iconSize="w-3.5 h-3.5">
                <p>Total de vendas e serviços prestados pela empresa antes de qualquer dedução (impostos, devoluções, descontos).</p>
                <p>É o ponto de partida da DRE e representa o faturamento total do período.</p>
              </InfoModal>
            </p>
            <p className="text-3xl font-bold text-foreground mt-1">{formatBRL(yearReceita)}</p>
            <p className="text-sm text-muted-foreground mt-1">Acumulado {selectedYear}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Custos Totais
              <InfoModal title="Custos Totais" iconSize="w-3.5 h-3.5">
                <p>Soma de todos os custos variáveis (matéria-prima, comissões, frete) e gastos fixos (aluguel, salários, administrativo).</p>
                <p>Quanto menor o custo total em relação à receita, maior a rentabilidade da empresa.</p>
              </InfoModal>
            </p>
            <p className="text-3xl font-bold text-foreground mt-1">{formatBRL(yearExpenses)}</p>
            <p className="text-sm text-muted-foreground mt-1">Variáveis + Fixos</p>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${yearEbitda >= 0 ? "border-l-green-500" : "border-l-red-500"}`}>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              EBITDA
              <InfoModal title="EBITDA" iconSize="w-3.5 h-3.5">
                <p><strong>EBITDA</strong> = Lucro antes de Juros, Impostos, Depreciação e Amortização.</p>
                <p>Mede a capacidade operacional da empresa de gerar caixa, sem considerar a estrutura financeira ou efeitos contábeis.</p>
                <p>É um dos indicadores mais usados por investidores e analistas para comparar empresas.</p>
              </InfoModal>
            </p>
            <p className={`text-3xl font-bold mt-1 ${yearEbitda >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {formatBRL(yearEbitda)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Margem: {yearReceita > 0 ? formatPct(yearEbitda / yearReceita) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid - 2 columns, 5 rows matching reference spreadsheet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Row 1: Receitas Brutas (Bar) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              Receitas Brutas
              <InfoModal title="Receitas Brutas">
                <p>Gráfico mensal do faturamento total antes de deduções (impostos, devoluções).</p>
                <p>Permite identificar sazonalidade e tendências de vendas ao longo do ano.</p>
              </InfoModal>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={compactBRL} tick={{ fontSize: 11 }} width={80} />
                <Tooltip content={<BRLTooltip />} />
                <Bar dataKey="receita_bruta" fill={COLORS.receita} name="Receita Bruta" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Row 1: Composição da Receita (Pie) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              Composição da Receita — {selectedYear}
              <InfoModal title="Composição da Receita">
                <p>Mostra como a receita bruta é distribuída entre deduções, custos variáveis, gastos fixos e EBITDA.</p>
                <p>Ideal para visualizar rapidamente onde o dinheiro está sendo alocado.</p>
              </InfoModal>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    labelLine
                    label={({ name, percent }) =>
                      `${name}: ${((percent || 0) * 100).toFixed(1)}%`
                    }
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => v != null ? formatBRLFull(Number(v)) : "R$ 0,00"}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Row 2: Custos Variáveis (Bar) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              Custos Variáveis
              <InfoModal title="Custos Variáveis">
                <p>Custos que aumentam ou diminuem proporcionalmente ao volume de vendas: matéria-prima, comissões, frete, embalagem.</p>
                <p>Controlá-los é essencial para manter margens saudáveis à medida que o faturamento cresce.</p>
              </InfoModal>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={compactBRL} tick={{ fontSize: 11 }} width={80} />
                <Tooltip content={<BRLTooltip />} />
                <Bar dataKey="custos_variaveis" fill={COLORS.custos} name="Custos Variáveis" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Row 2: Custos Variáveis % (Line) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              Custos Variáveis %
              <InfoModal title="Custos Variáveis %">
                <p>Percentual dos custos variáveis em relação à receita bruta de cada mês.</p>
                <p>Uma linha estável indica controle de custos; tendência de alta pode sinalizar ineficiência ou aumento de preços de insumos.</p>
              </InfoModal>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} width={50} />
                <Tooltip content={<PctTooltip />} />
                <Line type="monotone" dataKey="pct_custos_variaveis" stroke={COLORS.custos} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.custos }} name="Custos Var. %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Row 3: Margem de Contribuição R$ (Line) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              Margem de Contribuição
              <InfoModal title="Margem de Contribuição">
                <p><strong>Margem de Contribuição = Receita Líquida - Custos Variáveis</strong></p>
                <p>Representa o valor disponível para cobrir os gastos fixos e gerar lucro.</p>
                <p>Quanto maior a margem, mais a empresa consegue absorver suas despesas fixas e investir.</p>
              </InfoModal>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={compactBRL} tick={{ fontSize: 11 }} width={80} />
                <Tooltip content={<BRLTooltip />} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="margem_contribuicao" stroke={COLORS.margem} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.margem }} name="Margem Contrib." />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Row 3: Margem de Contribuição % (Line) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              Margem de Contribuição %
              <InfoModal title="Margem de Contribuição %">
                <p>Percentual da margem de contribuição sobre a receita — mede a eficiência operacional.</p>
                <p>Uma margem acima de 30-40% geralmente indica um negócio saudável, mas varia por setor.</p>
              </InfoModal>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} width={50} />
                <Tooltip content={<PctTooltip />} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="pct_margem_contribuicao" stroke={COLORS.margem} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.margem }} name="Margem %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Row 4: Gastos Fixos R$ (Line) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              Gastos Fixos
              <InfoModal title="Gastos Fixos">
                <p>Despesas que não variam com o volume de vendas: aluguel, salários, contabilidade, seguros, sistemas.</p>
                <p>Manter gastos fixos controlados é fundamental, especialmente em meses de baixa receita.</p>
              </InfoModal>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={compactBRL} tick={{ fontSize: 11 }} width={80} />
                <Tooltip content={<BRLTooltip />} />
                <Line type="monotone" dataKey="custos_fixos" stroke={COLORS.fixos} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.fixos }} name="Gastos Fixos" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Row 4: Gastos Fixos % (Line) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              Gastos Fixos %
              <InfoModal title="Gastos Fixos %">
                <p>Percentual dos gastos fixos sobre a receita bruta — quanto menor, melhor.</p>
                <p>Se essa linha sobe ao longo do ano, pode indicar que a receita está caindo ou que novas despesas fixas foram adicionadas.</p>
              </InfoModal>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} width={50} />
                <Tooltip content={<PctTooltip />} />
                <Line type="monotone" dataKey="pct_custos_fixos" stroke={COLORS.fixos} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.fixos }} name="Gastos Fixos %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Row 5: EBITDA R$ (Line) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              EBITDA
              <InfoModal title="EBITDA">
                <p><strong>EBITDA</strong> = Lucro antes de Juros, Impostos, Depreciação e Amortização.</p>
                <p>Mostra a evolução mensal da geração de caixa operacional. Valores negativos indicam que a operação está consumindo mais do que gera.</p>
              </InfoModal>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={compactBRL} tick={{ fontSize: 11 }} width={80} />
                <Tooltip content={<BRLTooltip />} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="ebitda" stroke={COLORS.ebitda} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.ebitda }} name="EBITDA" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Row 5: EBITDA % (Line) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              EBITDA %
              <InfoModal title="EBITDA %">
                <p>Margem EBITDA — percentual do EBITDA sobre a receita bruta.</p>
                <p>É o principal indicador de rentabilidade operacional. Permite comparar a eficiência da empresa com concorrentes do mesmo setor.</p>
              </InfoModal>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} width={50} />
                <Tooltip content={<PctTooltip />} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="pct_ebitda" stroke={COLORS.ebitda} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.ebitda }} name="EBITDA %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
