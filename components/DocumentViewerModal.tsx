"use client";

import { useState, useMemo, useEffect } from "react";
import { X, Search, Download, Filter, ChevronDown, ChevronUp, FileText, DollarSign, Calendar, Building2, Hash, Tag, Edit, Save, AlertTriangle, Trash2, Plus, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { formatCategory, getCategoryDisplayName, CATEGORY_MAP } from "@/lib/categories";

interface Transaction {
  date?: string;
  description?: string;
  category?: string;
  amount: number;
  transaction_type: string;
  reference?: string;
  account?: string;
  notes?: string;
}

interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  product_code?: string;
}

interface DocumentData {
  document_type?: string;
  document_number?: string;
  issue_date?: string;
  transaction_type?: string;
  category?: string;
  issuer?: any;
  recipient?: any;
  line_items?: LineItem[];
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  currency?: string;
  payment_info?: any;
  notes?: string;
  transactions?: Transaction[];
  total_transactions?: number;
  total_income?: number;
  total_expense?: number;
  net_balance?: number;
  confidence_score?: number;
}

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
  onUpdate?: () => void;
  openInEditMode?: boolean;
}

export default function DocumentViewerModal({ isOpen, onClose, document, onUpdate, openInEditMode = false }: DocumentViewerModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "receita" | "despesa" | "custo" | "investimento" | "perda">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["summary", "transactions"]));
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<DocumentData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (document?.extracted_data) {
      setEditedData(document.extracted_data);
    } else {
      setEditedData({});
    }
    // Set edit mode based on prop
    setIsEditing(openInEditMode);
  }, [document, openInEditMode]);

  // Add defensive null checking - moved before early return
  const extractedData = document?.extracted_data || {};
  const data: DocumentData = isEditing && editedData ? editedData : extractedData;
  const isLedger = data.document_type === "transaction_ledger";
  const confidenceScore = data.confidence_score || 0;
  const isLowConfidence = confidenceScore < 0.7;

  // Filter and search transactions - MUST be called before early return
  const filteredTransactions = useMemo(() => {
    if (!data.transactions) return [];

    return data.transactions.filter((txn) => {
      // Filter by type
      if (filterType !== "all" && txn.transaction_type !== filterType) return false;

      // Search
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          txn.description?.toLowerCase().includes(search) ||
          txn.category?.toLowerCase().includes(search) ||
          txn.reference?.toLowerCase().includes(search) ||
          txn.account?.toLowerCase().includes(search) ||
          txn.amount?.toString().includes(search)
        );
      }

      return true;
    });
  }, [data.transactions, filterType, searchTerm]);

  // Early return AFTER all hooks
  if (!isOpen || !document) return null;

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: data.currency || "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
    } catch {
      return dateStr;
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const exportToCSV = () => {
    if (!data.transactions) return;

    const headers = ["Data", "Descrição", "Categoria", "Tipo", "Valor", "Referência", "Conta"];
    const rows = filteredTransactions.map((txn) => [
      txn.date || "",
      txn.description || "",
      formatCategory(txn.category),
      txn.transaction_type || "",
      txn.amount?.toString() || "",
      txn.reference || "",
      txn.account || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${document.file_name}_transacoes.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing
      setEditedData(document.extracted_data);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!editedData || !document.id) return;

    setSaving(true);
    try {
      await apiClient.updateDocument(document.id, editedData);
      toast.success("Documento atualizado com sucesso!");
      setIsEditing(false);
      onUpdate?.();
    } catch (error: any) {
      console.error("Error saving document:", error);
      toast.error(error.message || "Erro ao salvar documento");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    if (!editedData) return;
    setEditedData({ ...editedData, [field]: value });
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    if (!editedData?.line_items) return;
    const newItems = [...editedData.line_items];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditedData({ ...editedData, line_items: newItems });
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      description: "",
      quantity: 0,
      unit_price: 0,
      total_price: 0,
      product_code: "",
    };
    const newItems = [...(editedData?.line_items || []), newItem];
    setEditedData({ ...editedData!, line_items: newItems });
  };

  const removeLineItem = (index: number) => {
    if (!editedData?.line_items) return;
    const newItems = editedData.line_items.filter((_, i) => i !== index);
    setEditedData({ ...editedData, line_items: newItems });
  };

  const updateTransaction = (index: number, field: string, value: any) => {
    if (!editedData?.transactions) return;
    const newTxns = [...editedData.transactions];
    newTxns[index] = { ...newTxns[index], [field]: value };
    setEditedData({ ...editedData, transactions: newTxns });
  };

  const addTransaction = () => {
    const newTxn: Transaction = {
      date: new Date().toISOString().split('T')[0],
      description: "",
      category: "",
      amount: 0,
      transaction_type: "despesa",
      reference: "",
      account: "",
      notes: "",
    };
    const newTxns = [...(editedData?.transactions || []), newTxn];
    setEditedData({ ...editedData!, transactions: newTxns });
  };

  const removeTransaction = (index: number) => {
    if (!editedData?.transactions) return;
    const newTxns = editedData.transactions.filter((_, i) => i !== index);
    setEditedData({ ...editedData, transactions: newTxns });
  };

  const duplicateTransaction = (index: number) => {
    if (!editedData?.transactions) return;
    const original = editedData.transactions[index];
    const duplicate = { ...original };
    const newTxns = [
      ...editedData.transactions.slice(0, index + 1),
      duplicate,
      ...editedData.transactions.slice(index + 1),
    ];
    setEditedData({ ...editedData, transactions: newTxns });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="relative p-4 sm:p-6 border-b border-border bg-blue-500/10 dark:bg-blue-500/20">
          {/* Close button - always visible, top-right */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-2 sm:p-3 hover:bg-accent bg-card/80 backdrop-blur-sm rounded-xl transition-colors shadow-sm border border-border"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
          </button>

          <div className="flex items-center gap-3 sm:gap-4 pr-12 sm:pr-14">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-[#0d767b] to-[#095a5e] rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-foreground truncate">{document.file_name}</h2>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {document.file_type?.toUpperCase()} • {document.file_size ? (document.file_size / 1024).toFixed(1) : '0'} KB
                </span>
                {data.document_type && (
                  <span className={`text-xs font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full ${
                    isLedger ? "bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400" : "bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400"
                  }`}>
                    {isLedger ? "📊 Lançamentos" : "📄 Documento"}
                  </span>
                )}
                {data.transaction_type && (
                  <span className={`text-xs font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full ${
                    data.transaction_type === "receita" ? "bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-400"
                    : data.transaction_type === "custo" ? "bg-orange-500/10 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400"
                    : data.transaction_type === "investimento" ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400"
                    : data.transaction_type === "perda" ? "bg-gray-500/10 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400"
                    : "bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-400"
                  }`}>
                    {data.transaction_type === "receita" ? "💰 Receita" : data.transaction_type === "custo" ? "💸 Custo" : data.transaction_type === "investimento" ? "📈 Investimento" : data.transaction_type === "perda" ? "⚠️ Perda" : "💸 Despesa"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Edit/Save buttons - below title on mobile, inline on desktop */}
          <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-0 sm:absolute sm:top-6 sm:right-16">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 sm:px-6 py-3 sm:py-6 h-auto text-sm sm:text-base"
                >
                  <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
                <Button
                  onClick={handleEditToggle}
                  variant="outline"
                  className="px-4 sm:px-6 py-3 sm:py-6 h-auto text-sm sm:text-base"
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                onClick={handleEditToggle}
                variant="outline"
                className="px-4 sm:px-6 py-3 sm:py-6 h-auto text-sm sm:text-base"
              >
                <Edit className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                Editar
              </Button>
            )}
          </div>
        </div>

        {/* Error Message Display */}
        {document.status === "failed" && document.error_message && (
          <div className="mx-6 mt-4 bg-red-500/10 dark:bg-red-500/20 border-2 border-red-500/30 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-900 dark:text-red-300 mb-2">Erro no Processamento</h3>
                <p className="text-red-800 dark:text-red-400 text-base mb-3 font-semibold">
                  {document.error_message}
                </p>
                <p className="text-red-700 dark:text-red-400 text-sm">
                  <strong>O que fazer:</strong> Verifique se o arquivo não está corrompido, se os dados estão legíveis,
                  ou se alguma informação crítica está faltando (como CNPJ/CPF válidos em documentos fiscais).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Confidence Warning */}
        {isLowConfidence && !isEditing && document.status !== "failed" && (
          <div className="mx-6 mt-4 bg-yellow-500/10 dark:bg-yellow-500/20 border-2 border-yellow-500/30 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-yellow-900 dark:text-yellow-300 mb-2">⚠️ Validação Extra Recomendada</h3>
                <p className="text-yellow-800 dark:text-yellow-400 text-base mb-3">
                  Este documento pode precisar de validação extra. Por favor, confira os dados extraídos antes de salvar.
                </p>
                <p className="text-yellow-700 dark:text-yellow-400 text-sm">
                  Verifique se os valores, datas e categorias estão corretos e faça os ajustes necessários.
                </p>
              </div>
              <Button
                onClick={handleEditToggle}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3"
              >
                <Edit className="w-5 h-5 mr-2" />
                Corrigir Agora
              </Button>
            </div>
          </div>
        )}

        {/* Manual Override for Transaction Type */}
        {!isLedger && isEditing && (
          <div className="mx-6 mt-4 bg-blue-500/10 dark:bg-blue-500/20 border-2 border-blue-500/30 rounded-xl p-5">
            <h3 className="text-lg font-bold text-foreground mb-3">🔄 Tipo de Transação</h3>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={editedData?.transaction_type === "receita" ? "default" : "outline"}
                onClick={() => updateField("transaction_type", "receita")}
                className="flex-1 text-sm px-4 py-3 bg-green-600 hover:bg-green-700"
              >
                💰 Receita
              </Button>
              <Button
                variant={editedData?.transaction_type === "despesa" ? "default" : "outline"}
                onClick={() => updateField("transaction_type", "despesa")}
                className="flex-1 text-sm px-4 py-3 bg-red-600 hover:bg-red-700"
              >
                💸 Despesa
              </Button>
              <Button
                variant={editedData?.transaction_type === "custo" ? "default" : "outline"}
                onClick={() => updateField("transaction_type", "custo")}
                className="flex-1 text-sm px-4 py-3 bg-orange-600 hover:bg-orange-700"
              >
                💸 Custo
              </Button>
              <Button
                variant={editedData?.transaction_type === "investimento" ? "default" : "outline"}
                onClick={() => updateField("transaction_type", "investimento")}
                className="flex-1 text-sm px-4 py-3 bg-blue-600 hover:bg-blue-700"
              >
                📈 Investimento
              </Button>
              <Button
                variant={editedData?.transaction_type === "perda" ? "default" : "outline"}
                onClick={() => updateField("transaction_type", "perda")}
                className="flex-1 text-sm px-4 py-3 bg-gray-600 hover:bg-gray-700"
              >
                ⚠️ Perda
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Se a IA não conseguiu determinar se você recebeu ou pagou, selecione manualmente.
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Summary — primary one-liner */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 bg-accent/50 rounded-xl mb-3">
            {(data.category || isEditing) && (
              <div className="flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                {isEditing ? (
                  <input
                    type="text"
                    value={data.category || ""}
                    onChange={(e) => updateField("category", e.target.value)}
                    className="text-sm font-semibold text-foreground bg-background border border-input rounded px-2 py-0.5 focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <span className="text-sm font-semibold text-foreground">{formatCategory(data.category)}</span>
                )}
              </div>
            )}
            {isLedger && (
              <>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="text-xs text-muted-foreground">Receitas</span>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(data.total_income)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-xs text-muted-foreground">Despesas</span>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(data.total_expense)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                  <span className="text-xs text-muted-foreground">Transações</span>
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{editedData?.transactions?.length ?? data.total_transactions ?? 0}</span>
                </div>
              </>
            )}
          </div>

          {/* Summary — secondary details (collapsible) */}
          {(data.document_number || data.issue_date || data.issuer || data.recipient || isEditing) && (
            <div className="mb-6">
              <button
                onClick={() => toggleSection("summary")}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2 px-1"
              >
                {expandedSections.has("summary") ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {expandedSections.has("summary") ? "Ocultar detalhes" : "Ver mais detalhes"}
              </button>

              {expandedSections.has("summary") && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(data.document_number || isEditing) && (
                    <div className="bg-card border border-border rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Hash className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Número</span>
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={data.document_number || ""}
                          onChange={(e) => updateField("document_number", e.target.value)}
                          className="w-full text-sm font-bold text-foreground bg-background border border-input rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-bold text-foreground truncate">{data.document_number}</p>
                      )}
                    </div>
                  )}

                  {(data.issue_date || isEditing) && (
                    <div className="bg-card border border-border rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Data de Emissão</span>
                      </div>
                      {isEditing ? (
                        <input
                          type="date"
                          value={data.issue_date || ""}
                          onChange={(e) => updateField("issue_date", e.target.value)}
                          className="w-full text-sm font-bold text-foreground bg-background border border-input rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-bold text-foreground">{formatDate(data.issue_date)}</p>
                      )}
                    </div>
                  )}

                  {data.issuer && (
                    <div className="bg-card border border-border rounded-lg p-3 col-span-2">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Emissor</span>
                      </div>
                      <p className="text-sm font-bold text-foreground truncate">{data.issuer.name || data.issuer.legal_name}</p>
                      {data.issuer.tax_id && <p className="text-xs text-muted-foreground">CNPJ/CPF: {data.issuer.tax_id}</p>}
                    </div>
                  )}

                  {data.recipient && (
                    <div className="bg-card border border-border rounded-lg p-3 col-span-2">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Destinatário</span>
                      </div>
                      <p className="text-sm font-bold text-foreground truncate">{data.recipient.name || data.recipient.legal_name}</p>
                      {data.recipient.tax_id && <p className="text-xs text-muted-foreground">CNPJ/CPF: {data.recipient.tax_id}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Transactions Section (for ledgers) */}
          {isLedger && data.transactions && data.transactions.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => toggleSection("transactions")}
                className="flex items-center justify-between w-full p-4 bg-purple-500/10 dark:bg-purple-500/20 rounded-xl hover:bg-purple-500/20 dark:hover:bg-purple-500/30 transition-colors mb-3"
              >
                <h3 className="text-xl font-bold text-foreground">
                  📊 Transações ({filteredTransactions.length} de {editedData?.transactions?.length ?? data.transactions.length})
                </h3>
                {expandedSections.has("transactions") ? (
                  <ChevronUp className="w-6 h-6 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-muted-foreground" />
                )}
              </button>

              {expandedSections.has("transactions") && (
                <>
                  {/* Filters and Search */}
                  <div className="mb-4 space-y-3">
                    <div className="flex flex-wrap gap-3">
                      <div className="flex-1 min-w-[300px]">
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Buscar por descrição, categoria, referência..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 text-base bg-background border-2 border-input text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Button variant={filterType === "all" ? "default" : "outline"} onClick={() => setFilterType("all")} className="px-4 py-2 text-sm">
                          Todos
                        </Button>
                        <Button variant={filterType === "receita" ? "default" : "outline"} onClick={() => setFilterType("receita")} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700">
                          💰 Receitas
                        </Button>
                        <Button variant={filterType === "despesa" ? "default" : "outline"} onClick={() => setFilterType("despesa")} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700">
                          💸 Despesas
                        </Button>
                        <Button variant={filterType === "custo" ? "default" : "outline"} onClick={() => setFilterType("custo")} className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700">
                          💸 Custos
                        </Button>
                        <Button variant={filterType === "investimento" ? "default" : "outline"} onClick={() => setFilterType("investimento")} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700">
                          📈 Investimentos
                        </Button>
                        <Button variant={filterType === "perda" ? "default" : "outline"} onClick={() => setFilterType("perda")} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700">
                          ⚠️ Perdas
                        </Button>
                      </div>

                      <Button
                        onClick={exportToCSV}
                        variant="outline"
                        className="px-6 py-3 text-base"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Exportar CSV
                      </Button>
                    </div>

                    {/* Items per page selector */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Itens por página:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-4 py-2 bg-background border-2 border-input text-foreground rounded-lg text-base focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={250}>250</option>
                        <option value={500}>500</option>
                      </select>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="overflow-x-auto rounded-xl border-2 border-border shadow-lg">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-indigo-600 to-purple-600">
                        <tr>
                          <th className="px-6 py-5 text-left text-base font-bold text-white">Data</th>
                          <th className="px-6 py-5 text-left text-base font-bold text-white">Descrição</th>
                          <th className="px-6 py-5 text-left text-base font-bold text-white">Categoria</th>
                          <th className="px-6 py-5 text-left text-base font-bold text-white">Tipo</th>
                          <th className="px-6 py-5 text-right text-base font-bold text-white">Valor</th>
                          <th className="px-6 py-5 text-left text-base font-bold text-white">Referência</th>
                          {isEditing && <th className="px-6 py-5 text-center text-base font-bold text-white">Ações</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card">
                        {paginatedTransactions.map((txn, idx) => {
                          const actualIdx = (currentPage - 1) * itemsPerPage + idx;
                          return (
                            <tr key={idx} className={`transition-colors hover:bg-accent/50 ${idx % 2 === 0 ? 'bg-accent/20' : 'bg-card'}`}>
                              <td className="px-6 py-5 whitespace-nowrap text-base font-medium text-foreground">
                                {isEditing ? (
                                  <input
                                    type="date"
                                    value={txn.date || ""}
                                    onChange={(e) => updateTransaction(actualIdx, "date", e.target.value)}
                                    className="bg-background border-2 border-input text-foreground rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                                  />
                                ) : (
                                  formatDate(txn.date)
                                )}
                              </td>
                              <td className="px-6 py-5 text-base text-foreground max-w-md">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={txn.description || ""}
                                    onChange={(e) => updateTransaction(actualIdx, "description", e.target.value)}
                                    className="w-full bg-background border-2 border-input text-foreground rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                                  />
                                ) : (
                                  <>
                                    <div className="font-semibold">{txn.description || "-"}</div>
                                    {txn.notes && <div className="text-sm text-muted-foreground mt-1">{txn.notes}</div>}
                                  </>
                                )}
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap text-base">
                                {isEditing ? (
                                  <select
                                    value={txn.category || ""}
                                    onChange={(e) => updateTransaction(actualIdx, "category", e.target.value)}
                                    className="w-full bg-background border-2 border-input text-foreground rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 text-sm"
                                  >
                                    <option value="">Sem categoria</option>
                                    {Object.entries(CATEGORY_MAP).map(([key, info]) => (
                                      <option key={key} value={key}>
                                        {info.nature} - {info.accountCode} - {info.displayName}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  txn.category ? (
                                    <span className="px-3 py-1.5 bg-blue-500/10 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400 rounded-full text-sm font-semibold" title={txn.category}>
                                      {formatCategory(txn.category)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )
                                )}
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap text-base">
                                {isEditing ? (
                                  <select
                                    value={txn.transaction_type}
                                    onChange={(e) => updateTransaction(actualIdx, "transaction_type", e.target.value)}
                                    className="bg-background border-2 border-input text-foreground rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                                  >
                                    <option value="receita">💰 Receita</option>
                                    <option value="despesa">💸 Despesa</option>
                                    <option value="custo">💸 Custo</option>
                                    <option value="investimento">📈 Investimento</option>
                                    <option value="perda">⚠️ Perda</option>
                                  </select>
                                ) : (
                                  <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${
                                    txn.transaction_type === "receita"
                                      ? "bg-green-500/10 dark:bg-green-500/20 text-green-800 dark:text-green-400 border border-green-500/20"
                                      : txn.transaction_type === "custo"
                                      ? "bg-orange-500/10 dark:bg-orange-500/20 text-orange-800 dark:text-orange-400 border border-orange-500/20"
                                      : txn.transaction_type === "investimento"
                                      ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400 border border-blue-500/20"
                                      : txn.transaction_type === "perda"
                                      ? "bg-gray-500/10 dark:bg-gray-500/20 text-gray-800 dark:text-gray-400 border border-gray-500/20"
                                      : "bg-red-500/10 dark:bg-red-500/20 text-red-800 dark:text-red-400 border border-red-500/20"
                                  }`}>
                                    {txn.transaction_type === "receita" ? "💰 Receita" : txn.transaction_type === "custo" ? "💸 Custo" : txn.transaction_type === "investimento" ? "📈 Investimento" : txn.transaction_type === "perda" ? "⚠️ Perda" : "💸 Despesa"}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap text-right text-lg font-bold">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={txn.amount}
                                    onChange={(e) => updateTransaction(actualIdx, "amount", parseFloat(e.target.value) || 0)}
                                    className="w-full bg-background border-2 border-input text-foreground rounded px-2 py-1 text-right focus:ring-2 focus:ring-indigo-500"
                                  />
                                ) : (
                                  <span className={txn.transaction_type === "receita" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                                    {formatCurrency(txn.amount)}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap text-base font-medium text-foreground">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={txn.reference || ""}
                                    onChange={(e) => updateTransaction(actualIdx, "reference", e.target.value)}
                                    className="w-full bg-background border-2 border-input text-foreground rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                                  />
                                ) : (
                                  txn.reference || <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                              {isEditing && (
                                <td className="px-6 py-5 text-center">
                                  <div className="flex gap-1 justify-center">
                                    <button
                                      onClick={() => duplicateTransaction(actualIdx)}
                                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
                                      title="Duplicar transação (rateio)"
                                    >
                                      <Copy className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => removeTransaction(actualIdx)}
                                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                                      title="Remover transação"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {isEditing && (
                    <Button
                      onClick={addTransaction}
                      variant="outline"
                      className="mt-3 w-full border-2 border-dashed border-indigo-500/30 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 py-3"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Adicionar Transação
                    </Button>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Mostrando {(currentPage - 1) * itemsPerPage + 1} até{" "}
                        {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} de{" "}
                        {filteredTransactions.length} transações
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2"
                        >
                          Anterior
                        </Button>
                        <div className="flex items-center gap-2 px-4 py-2 bg-accent rounded-lg">
                          <span className="text-sm font-medium text-foreground">
                            Página {currentPage} de {totalPages}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2"
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Line Items Section (for invoices) */}
          {!isLedger && (data.line_items && data.line_items.length > 0 || isEditing) && (
            <div className="mb-6">
              <button
                onClick={() => toggleSection("items")}
                className="flex items-center justify-between w-full p-4 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl hover:bg-blue-500/20 dark:hover:bg-blue-500/30 transition-colors mb-3"
              >
                <h3 className="text-xl font-bold text-foreground">🛒 Itens ({data.line_items?.length || 0})</h3>
                {expandedSections.has("items") ? (
                  <ChevronUp className="w-6 h-6 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-muted-foreground" />
                )}
              </button>

              {expandedSections.has("items") && (
                <>
                  <div className="overflow-x-auto rounded-xl border-2 border-border shadow-lg">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-blue-600 to-cyan-600">
                        <tr>
                          <th className="px-6 py-5 text-left text-base font-bold text-white">Código</th>
                          <th className="px-6 py-5 text-left text-base font-bold text-white">Descrição</th>
                          <th className="px-6 py-5 text-right text-base font-bold text-white">Qtd</th>
                          <th className="px-6 py-5 text-right text-base font-bold text-white">Preço Unit.</th>
                          <th className="px-6 py-5 text-right text-base font-bold text-white">Total</th>
                          {isEditing && <th className="px-6 py-5 text-center text-base font-bold text-white">Ações</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card">
                        {data.line_items?.map((item, idx) => (
                          <tr key={idx} className={`transition-colors hover:bg-accent/50 ${idx % 2 === 0 ? 'bg-accent/20' : 'bg-card'}`}>
                            <td className="px-6 py-5 whitespace-nowrap text-base font-medium text-foreground">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={item.product_code || ""}
                                  onChange={(e) => updateLineItem(idx, "product_code", e.target.value)}
                                  className="w-full bg-background border-2 border-input text-foreground rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                                />
                              ) : (
                                item.product_code || <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-6 py-5 text-base text-foreground font-semibold">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                                  className="w-full bg-background border-2 border-input text-foreground rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                                />
                              ) : (
                                item.description
                              )}
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-right text-base font-medium text-foreground">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={item.quantity || 0}
                                  onChange={(e) => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                                  className="w-full bg-background border-2 border-input text-foreground rounded px-2 py-1 text-right focus:ring-2 focus:ring-blue-500"
                                />
                              ) : (
                                item.quantity || <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-right text-base font-medium text-foreground">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.unit_price || 0}
                                  onChange={(e) => updateLineItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                                  className="w-full bg-background border-2 border-input text-foreground rounded px-2 py-1 text-right focus:ring-2 focus:ring-blue-500"
                                />
                              ) : (
                                item.unit_price !== undefined ? formatCurrency(item.unit_price) : <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-right text-lg font-bold text-foreground">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.total_price || 0}
                                  onChange={(e) => updateLineItem(idx, "total_price", parseFloat(e.target.value) || 0)}
                                  className="w-full bg-background border-2 border-input text-foreground rounded px-2 py-1 text-right focus:ring-2 focus:ring-blue-500"
                                />
                              ) : (
                                item.total_price !== undefined ? formatCurrency(item.total_price) : <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            {isEditing && (
                              <td className="px-6 py-5 text-center">
                                <button
                                  onClick={() => removeLineItem(idx)}
                                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                                  title="Remover item"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {isEditing && (
                    <Button
                      onClick={addLineItem}
                      variant="outline"
                      className="mt-3 w-full border-2 border-dashed border-blue-500/30 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 py-3"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Adicionar Item
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Notes Section */}
          {data.notes && (
            <div className="bg-yellow-500/10 dark:bg-yellow-500/20 border-2 border-yellow-500/20 rounded-xl p-6">
              <h3 className="text-lg font-bold text-foreground mb-3">📝 Observações</h3>
              <p className="text-base text-foreground whitespace-pre-wrap">{data.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
