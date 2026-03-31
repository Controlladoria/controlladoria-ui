"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import type { TransactionLedger, Transaction, CategorySummary } from "@/lib/types";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, Calendar, DollarSign, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";

interface LedgerDetailViewProps {
  documentId: number;
  ledger: TransactionLedger;
  onClose: () => void;
}

export default function LedgerDetailView({ documentId, ledger, onClose }: LedgerDetailViewProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");

  const itemsPerPage = 50;

  useEffect(() => {
    loadTransactions();
  }, [currentPage, searchQuery, categoryFilter, typeFilter, dateFromFilter, dateToFilter]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getLedgerTransactions(documentId, {
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
        search: searchQuery || undefined,
        category: categoryFilter || undefined,
        transaction_type: typeFilter || undefined,
        date_from: dateFromFilter || undefined,
        date_to: dateToFilter || undefined,
      });

      setTransactions(response.transactions);
      setTotal(response.total);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: ledger.currency || 'BRL'
    }).format(num);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  // Prepare chart data
  const categoryChartData = ledger.by_category.slice(0, 10).map(cat => ({
    name: cat.category,
    value: parseFloat(cat.total_amount),
    count: cat.count
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

  // Get unique categories for filter
  const categories = Array.from(new Set(ledger.by_category.map(c => c.category)));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Razão Geral</h2>
            <p className="text-sm text-slate-600">{ledger.file_name}</p>
          </div>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Transações</CardTitle>
                <Calendar className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ledger.total_transactions.toLocaleString('pt-BR')}</div>
                {ledger.date_range.start_date && ledger.date_range.end_date && (
                  <p className="text-xs text-slate-600 mt-1">
                    {formatDate(ledger.date_range.start_date)} - {formatDate(ledger.date_range.end_date)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receitas</CardTitle>
                <ArrowUpCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(ledger.total_income)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                <ArrowDownCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(ledger.total_expense)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${parseFloat(ledger.net_balance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(ledger.net_balance)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Por Categoria</CardTitle>
                <CardDescription>Top 10 categorias por valor</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(0) : 0}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo por Categoria</CardTitle>
                <CardDescription>Valores por categoria</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryChartData.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transações</CardTitle>
                  <CardDescription>
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, total)} de {total.toLocaleString('pt-BR')} transações
                  </CardDescription>
                </div>
                <Filter className="h-5 w-5 text-slate-600" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filter Controls */}
              <div className="grid gap-4 md:grid-cols-5">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Buscar descrição..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={categoryFilter} onValueChange={(value) => {
                  setCategoryFilter(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={(value) => {
                  setTypeFilter(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="income">Receita</SelectItem>
                    <SelectItem value="expense">Despesa</SelectItem>
                    <SelectItem value="gasto">Gasto</SelectItem>
                    <SelectItem value="investimento">Investimento</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("");
                    setTypeFilter("");
                    setDateFromFilter("");
                    setDateToFilter("");
                    setCurrentPage(1);
                  }}
                >
                  Limpar
                </Button>
              </div>

              {/* Transaction Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Data</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Descrição</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Categoria</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Tipo</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-600">
                            Carregando...
                          </td>
                        </tr>
                      ) : transactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-600">
                            Nenhuma transação encontrada
                          </td>
                        </tr>
                      ) : (
                        transactions.map((transaction, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm text-slate-900">{formatDate(transaction.date)}</td>
                            <td className="px-4 py-3 text-sm text-slate-900">{transaction.description || '-'}</td>
                            <td className="px-4 py-3 text-sm">
                              <Badge variant="secondary">{transaction.category}</Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {['receita', 'income'].includes(transaction.transaction_type) ? (
                                <Badge className="bg-green-100 text-green-800">Receita</Badge>
                              ) : ['custo', 'cost'].includes(transaction.transaction_type) ? (
                                <Badge className="bg-orange-100 text-orange-800">Custo</Badge>
                              ) : transaction.transaction_type === 'investimento' ? (
                                <Badge className="bg-blue-100 text-blue-800">Investimento</Badge>
                              ) : transaction.transaction_type === 'perda' ? (
                                <Badge className="bg-gray-100 text-gray-800">Perda</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800">Despesa</Badge>
                              )}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right font-medium ${
                              ['receita', 'income'].includes(transaction.transaction_type) ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {['receita', 'income'].includes(transaction.transaction_type) ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || loading}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
