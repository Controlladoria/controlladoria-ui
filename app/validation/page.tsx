"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  Edit3,
  Check,
  X,
  Loader2,
  Trash2,
  Plus,
  Pencil,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import SubscriptionGuard from "@/components/stripe/SubscriptionGuard";
import { InfoModal } from "@/components/ui/info-modal";

interface ValidationDocument {
  id: number;
  file_name: string;
  file_type: string;
  upload_date: string | null;
  processed_date: string | null;
  category: string | null;
  validation_row_count: number;
  validated_count: number;
}

interface ValidationRow {
  id: number;
  row_index: number;
  description: string | null;
  transaction_date: string | null;
  amount: number | null;
  category: string | null;
  transaction_type: string | null;
  is_validated: boolean;
  validated_at: string | null;
  counterparty: string | null;
}

interface CategoryOption {
  key: string;
  display_name: string;
  group: string;
  nature: string;
  account_code: string;
  order: number;
}

interface KnownItemMatch {
  known_item_id: number;
  alias: string | null;
  category: string | null;
  times_appeared: number;
}

export default function ValidationPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<ValidationDocument[]>([]);
  const [processingCount, setProcessingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedDocId, setExpandedDocId] = useState<number | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [rows, setRows] = useState<ValidationRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ValidationRow>>({});
  const [confirming, setConfirming] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [addingRow, setAddingRow] = useState(false);
  const [newRowForm, setNewRowForm] = useState<Partial<ValidationRow>>({
    transaction_type: "despesa",
    category: "nao_categorizado",
  });
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [validatedCount, setValidatedCount] = useState(0);
  const PAGE_SIZE = 50;

  // Row filters
  const [rowSearch, setRowSearch] = useState("");
  const [rowCategoryFilter, setRowCategoryFilter] = useState("");
  const [rowTypeFilter, setRowTypeFilter] = useState("");

  // Known Items state
  const [knownMatches, setKnownMatches] = useState<Record<string, KnownItemMatch>>({});
  const [editingAliasRowId, setEditingAliasRowId] = useState<number | null>(null);
  const [aliasInput, setAliasInput] = useState("");

  const loadDocuments = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await api.get("/documents/pending-validation/list");
      const newDocs = response.data.documents || [];
      setProcessingCount(response.data.processing_count || 0);

      if (silent) {
        // Background refresh: merge new docs without flashing the whole list
        setDocuments(prev => {
          const existingIds = new Set(prev.map((d: any) => d.id));
          const newIds = new Set(newDocs.map((d: any) => d.id));

          // Add docs that are new (not in current list)
          const added = newDocs.filter((d: any) => !existingIds.has(d.id));
          // Remove docs that are gone (validated/deleted since last check)
          const kept = prev.filter((d: any) => newIds.has(d.id));

          if (added.length === 0 && kept.length === prev.length) {
            return prev; // No changes — don't trigger re-render
          }

          if (added.length > 0) {
            toast.info(`${added.length} novo${added.length > 1 ? 's' : ''} documento${added.length > 1 ? 's' : ''} pronto${added.length > 1 ? 's' : ''} para validação`, { duration: 3000 });
          }

          return [...kept, ...added];
        });
      } else {
        setDocuments(newDocs);
      }
    } catch (error) {
      if (!silent) {
        console.error("Error loading validation documents:", error);
        toast.error("Erro ao carregar documentos pendentes");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const response = await api.get("/categories");
      const cats: CategoryOption[] = response.data.categories || [];
      setCategories(cats);
      // Build key -> display_name map for quick lookups
      const map: Record<string, string> = {};
      cats.forEach((c) => {
        map[c.key] = c.display_name;
      });
      setCategoryMap(map);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadDocuments();
      loadCategories();
    }
  }, [isAuthenticated, authLoading, loadDocuments, loadCategories]);

  // Auto-refresh: silently check for new documents every 15 seconds
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    const interval = setInterval(() => {
      if (!expandedDocId) {
        loadDocuments(true); // silent — no spinner, no flash, just merge new docs in
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, authLoading, loadDocuments, expandedDocId]);

  const loadRows = async (docId: number, page: number = 1, filters?: { search?: string; category?: string; type?: string }) => {
    try {
      setLoadingRows(true);
      setRows([]); // Clear immediately — don't render stale rows while loading
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      const s = filters?.search ?? rowSearch;
      const c = filters?.category ?? rowCategoryFilter;
      const t = filters?.type ?? rowTypeFilter;
      if (s) params.set("search", s);
      if (c) params.set("category", c);
      if (t) params.set("transaction_type", t);
      const response = await api.get(
        `/documents/${docId}/validation-rows?${params.toString()}`
      );
      setRows(response.data.rows || []);
      setCurrentPage(response.data.page || 1);
      setTotalPages(response.data.total_pages || 1);
      setTotalRows(response.data.total_rows || 0);
      setValidatedCount(response.data.validated_count || 0);
    } catch (error) {
      console.error("Error loading validation rows:", error);
      toast.error("Erro ao carregar linhas de validação");
    } finally {
      setLoadingRows(false);
    }
  };

  const toggleDocument = async (docId: number) => {
    if (expandedDocId === docId) {
      setExpandedDocId(null);
      setRows([]);
      setEditingRowId(null);
      setAddingRow(false);
      setRowSearch(""); setRowCategoryFilter(""); setRowTypeFilter("");
      setKnownMatches({});
      setEditingAliasRowId(null);
      setCurrentPage(1);
    } else {
      setExpandedDocId(docId);
      setAddingRow(false);
      setKnownMatches({});
      setEditingAliasRowId(null);
      setCurrentPage(1);
      await loadRows(docId, 1);
      // Fetch known item matches in background (non-blocking — rows show first)
      api.get(`/documents/${docId}/validation-rows/known-matches`)
        .then(res => setKnownMatches(res.data.matches || {}))
        .catch(() => {}); // Non-critical
    }
  };

  const startEditing = (row: ValidationRow) => {
    setEditingRowId(row.id);
    setEditForm({
      description: row.description,
      transaction_date: row.transaction_date,
      amount: row.amount,
      category: row.category,
      transaction_type: row.transaction_type,
    });
  };

  const cancelEditing = () => {
    setEditingRowId(null);
    setEditForm({});
  };

  const saveRow = async (docId: number, rowId: number) => {
    try {
      await api.put(`/documents/${docId}/validation-rows/${rowId}`, {
        ...editForm,
        is_validated: true,
      });

      // Update local state
      setRows(prev =>
        prev.map(r =>
          r.id === rowId
            ? { ...r, ...editForm, is_validated: true }
            : r
        )
      );
      // Update validated count if this row wasn't already validated
      const wasValidated = rows.find(r => r.id === rowId)?.is_validated;
      if (!wasValidated) setValidatedCount(prev => prev + 1);

      setEditingRowId(null);
      setEditForm({});
      toast.success("Linha atualizada com sucesso");
    } catch (error) {
      console.error("Error saving validation row:", error);
      toast.error("Erro ao salvar alteração");
    }
  };

  const validateRow = async (docId: number, rowId: number) => {
    try {
      await api.put(`/documents/${docId}/validation-rows/${rowId}`, {
        is_validated: true,
      });

      const wasValidated = rows.find(r => r.id === rowId)?.is_validated;
      setRows(prev =>
        prev.map(r =>
          r.id === rowId ? { ...r, is_validated: true } : r
        )
      );
      if (!wasValidated) setValidatedCount(prev => prev + 1);
    } catch (error) {
      console.error("Error validating row:", error);
      toast.error("Erro ao validar linha");
    }
  };

  const approveCurrentPage = async (docId: number) => {
    const unvalidatedRows = rows.filter(r => !r.is_validated);
    if (unvalidatedRows.length === 0) {
      toast.info("Todas as linhas desta página já estão validadas.");
      return;
    }
    try {
      const rowIds = unvalidatedRows.map(r => r.id);
      const response = await api.post(`/documents/${docId}/validation-rows/bulk-validate`, {
        row_ids: rowIds,
      });
      // Update local state
      setRows(prev => prev.map(r => ({ ...r, is_validated: true })));
      setValidatedCount(prev => prev + (response.data.updated || unvalidatedRows.length));
      toast.success(response.data.message || `${unvalidatedRows.length} linhas validadas!`);
    } catch (error: any) {
      console.error("Error bulk validating:", error);
      toast.error(error.response?.data?.detail || "Erro ao validar linhas");
    }
  };

  const confirmAll = async (docId: number) => {
    try {
      setConfirming(true);
      const response = await api.post(`/documents/${docId}/confirm-validation`, {}, { timeout: 60000 });
      toast.success(response.data.message || "Documento validado com sucesso!");

      // Remove from list and reset
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setExpandedDocId(null);
      setRows([]);
    } catch (error: any) {
      console.error("Error confirming validation:", error);
      toast.error(error.response?.data?.detail || "Erro ao confirmar validação");
    } finally {
      setConfirming(false);
    }
  };

  const rejectDocument = async (docId: number) => {
    try {
      // Large docs (2k+ rows) can take a few seconds to delete — use longer timeout
      await api.post(`/documents/${docId}/reject-validation`, {
        reason: "Rejeitado pelo usuário durante validação",
      }, { timeout: 30000 });
      toast.info("Documento rejeitado e removido");

      // Remove from list
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setExpandedDocId(null);
      setRows([]);
    } catch (error: any) {
      console.error("Error rejecting document:", error);
      toast.error(error.response?.data?.detail || "Erro ao rejeitar documento");
    }
  };

  const deleteRow = async (docId: number, rowId: number) => {
    try {
      await api.delete(`/documents/${docId}/validation-rows/${rowId}`);
      setRows(prev => prev.filter(r => r.id !== rowId));
      toast.success("Linha removida");
    } catch (error: any) {
      console.error("Error deleting validation row:", error);
      toast.error(error.response?.data?.detail || "Erro ao remover linha");
    }
  };

  const addRow = async (docId: number) => {
    try {
      const response = await api.post(`/documents/${docId}/validation-rows`, {
        description: newRowForm.description || "",
        transaction_date: newRowForm.transaction_date || null,
        amount: newRowForm.amount || 0,
        category: newRowForm.category || "nao_categorizado",
        transaction_type: newRowForm.transaction_type || "despesa",
      });
      setRows(prev => [...prev, response.data]);
      setAddingRow(false);
      setNewRowForm({ transaction_type: "despesa", category: "nao_categorizado" });
      toast.success("Linha adicionada");
    } catch (error: any) {
      console.error("Error adding validation row:", error);
      toast.error(error.response?.data?.detail || "Erro ao adicionar linha");
    }
  };

  const startEditingAlias = (rowId: number) => {
    const match = knownMatches[String(rowId)];
    if (!match) return;
    setEditingAliasRowId(rowId);
    setAliasInput(match.alias || "");
  };

  const saveAlias = async (rowId: number) => {
    const match = knownMatches[String(rowId)];
    if (!match) return;

    try {
      await api.put(`/documents/known-items/${match.known_item_id}`, {
        alias: aliasInput.trim() || null,
      });

      // Update local state
      setKnownMatches((prev) => ({
        ...prev,
        [String(rowId)]: { ...match, alias: aliasInput.trim() || null },
      }));
      setEditingAliasRowId(null);
      setAliasInput("");
      toast.success("Apelido atualizado");
    } catch (error) {
      console.error("Error updating alias:", error);
      toast.error("Erro ao atualizar apelido");
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden lg:pt-0">
        {/* Top Nav Bar */}
        <div className="hidden lg:block h-2 bg-gradient-to-r from-[#095a5e] via-[#0d767b] to-[#1a9da3] dark:from-[#d15a12] dark:via-[#f86a15] dark:to-[#fa8c4a]"></div>

        <header className="bg-card/80 backdrop-blur-md border-b-2 border-border shadow-lg">
          <div className="px-4 sm:px-6 lg:px-8 pt-16 lg:pt-6 pb-4 sm:py-6">
            <div className="flex flex-col lg:flex-row items-center lg:justify-between gap-2">
              <div className="text-center lg:text-left">
                <h1 className="text-2xl font-bold text-foreground flex items-center justify-center lg:justify-start gap-2">
                  Validação de Documentos
                  <InfoModal title="Como funciona a Validação?">
                    <p>Ao fazer upload de um documento, a IA extrai automaticamente os dados financeiros (itens, valores, categorias, tipo de transação).</p>
                    <p>Nesta tela você <strong>revisa e corrige</strong> os dados antes de incluí-los nos relatórios. Isso garante que a DRE, Balanço e Fluxo de Caixa reflitam informações corretas.</p>
                    <p>Com o tempo, o sistema aprende com seus itens conhecidos e melhora a categorização automática a cada upload.</p>
                    <p>Você pode editar categorias, aliases e valores antes de confirmar cada documento.</p>
                  </InfoModal>
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Revise e confirme os dados extraídos antes de incluí-los nos relatórios
                </p>
              </div>
              <div className="flex items-center gap-3">
                {documents.length > 3 && (
                  <input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="px-3 py-2 text-sm bg-background text-foreground border border-border rounded-lg w-48 focus:ring-2 focus:ring-[#0d767b] focus:border-transparent"
                  />
                )}
                {documents.length > 0 && (
                  <Badge className="bg-amber-500 text-white text-lg px-4 py-2">
                    {documents.length} pendente{documents.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <SubscriptionGuard>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Carregando...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-20">
              {processingCount > 0 ? (
                <>
                  <Loader2 className="w-16 h-16 text-[#0d767b] dark:text-[#f86a15] mx-auto mb-4 animate-spin" />
                  <h2 className="text-xl font-semibold text-foreground">
                    {processingCount} documento{processingCount !== 1 ? 's' : ''} em processamento
                  </h2>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    Aguarde, os documentos aparecerão aqui automaticamente conforme ficarem prontos.
                    Planilhas grandes (5.000+ linhas) podem levar até 20 minutos.
                  </p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-foreground">
                    Nenhum documento pendente
                  </h2>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    Após enviar documentos na página de Upload, eles aparecerão aqui automaticamente conforme ficarem prontos para validação.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4 w-full">
              {processingCount > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg py-2 px-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {processingCount} documento{processingCount !== 1 ? 's' : ''} em processamento — aparecerão aqui automaticamente.
                  Planilhas grandes (5.000+ linhas) podem levar até 20 minutos.
                </div>
              )}
              {documents.filter(doc => !searchFilter || doc.file_name.toLowerCase().includes(searchFilter.toLowerCase())).map((doc) => (
                <div
                  key={doc.id}
                  className="bg-card rounded-lg border-2 border-border shadow-sm overflow-hidden"
                >
                  {/* Document Header */}
                  <button
                    onClick={() => toggleDocument(doc.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-semibold text-foreground">
                          {doc.file_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(doc.processed_date)} &bull;{" "}
                          {doc.validation_row_count} linha{doc.validation_row_count !== 1 ? "s" : ""} &bull;{" "}
                          {doc.validated_count}/{doc.validation_row_count} validada{doc.validated_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      >
                        Pendente
                      </Badge>
                      {expandedDocId === doc.id ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </button>

                  {/* Expanded: Validation Rows */}
                  {expandedDocId === doc.id && (
                    <div className="border-t-2 border-border">
                      {loadingRows ? (
                        <div className="p-6 text-center">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
                        </div>
                      ) : (
                        <>
                          {/* Row Filters */}
                          {totalRows > 20 && (
                            <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border">
                              <input
                                type="text"
                                placeholder="Buscar descrição..."
                                value={rowSearch}
                                onChange={(e) => {
                                  setRowSearch(e.target.value);
                                  // Debounce: apply filter after user stops typing
                                  clearTimeout((window as any).__rowSearchTimer);
                                  (window as any).__rowSearchTimer = setTimeout(() => {
                                    setCurrentPage(1);
                                    loadRows(doc.id, 1, { search: e.target.value, category: rowCategoryFilter, type: rowTypeFilter });
                                  }, 400);
                                }}
                                className="px-2 py-1 text-sm bg-background text-foreground border border-border rounded w-48 focus:ring-1 focus:ring-[#0d767b]"
                              />
                              <select
                                value={rowCategoryFilter}
                                onChange={(e) => {
                                  setRowCategoryFilter(e.target.value);
                                  setCurrentPage(1);
                                  loadRows(doc.id, 1, { search: rowSearch, category: e.target.value, type: rowTypeFilter });
                                }}
                                className="px-2 py-1 text-sm bg-background text-foreground border border-border rounded focus:ring-1 focus:ring-[#0d767b]"
                              >
                                <option value="">Todas categorias</option>
                                {categories.map(cat => (
                                  <option key={cat.key} value={cat.key}>{cat.display_name}</option>
                                ))}
                              </select>
                              <select
                                value={rowTypeFilter}
                                onChange={(e) => {
                                  setRowTypeFilter(e.target.value);
                                  setCurrentPage(1);
                                  loadRows(doc.id, 1, { search: rowSearch, category: rowCategoryFilter, type: e.target.value });
                                }}
                                className="px-2 py-1 text-sm bg-background text-foreground border border-border rounded focus:ring-1 focus:ring-[#0d767b]"
                              >
                                <option value="">Todos tipos</option>
                                <option value="receita">Receita</option>
                                <option value="despesa">Despesa</option>
                                <option value="custo">Custo</option>
                                <option value="investimento">Investimento</option>
                              </select>
                              {(rowSearch || rowCategoryFilter || rowTypeFilter) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setRowSearch(""); setRowCategoryFilter(""); setRowTypeFilter("");
                                    setCurrentPage(1);
                                    loadRows(doc.id, 1, { search: "", category: "", type: "" });
                                  }}
                                  className="text-xs text-muted-foreground"
                                >
                                  Limpar filtros
                                </Button>
                              )}
                              <span className="text-xs text-muted-foreground ml-auto">
                                {totalRows} resultado{totalRows !== 1 ? "s" : ""}
                              </span>
                            </div>
                          )}

                          {/* Rows Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Data</th>
                                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Descrição</th>
                                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Fornecedor/Cliente</th>
                                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Categoria</th>
                                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Tipo</th>
                                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Valor</th>
                                  <th className="text-center px-4 py-2 font-medium text-muted-foreground">Ações</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {loadingRows ? (
                                  <tr>
                                    <td colSpan={7} className="text-center py-8">
                                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                    </td>
                                  </tr>
                                ) : rows.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                                      Nenhuma linha encontrada
                                    </td>
                                  </tr>
                                ) : null}
                                {rows.map((row) => {
                                  const isTotalRow = row.row_index === 0 && rows.length > 1;
                                  return (
                                  <tr
                                    key={row.id}
                                    className={`transition-colors ${
                                      isTotalRow
                                        ? "bg-blue-500/5 border-b-2 border-blue-200 dark:border-blue-800"
                                        : row.is_validated
                                        ? "bg-green-500/5"
                                        : "hover:bg-accent/30"
                                    }`}
                                  >
                                    {editingRowId === row.id ? (
                                      // Editing mode
                                      <>
                                        <td className="px-4 py-2">
                                          <Input
                                            type="date"
                                            value={editForm.transaction_date || ""}
                                            onChange={(e) =>
                                              setEditForm((prev) => ({
                                                ...prev,
                                                transaction_date: e.target.value,
                                              }))
                                            }
                                            className="h-8 text-sm"
                                          />
                                        </td>
                                        <td className="px-4 py-2">
                                          <Input
                                            value={editForm.description || ""}
                                            onChange={(e) =>
                                              setEditForm((prev) => ({
                                                ...prev,
                                                description: e.target.value,
                                              }))
                                            }
                                            className="h-8 text-sm"
                                          />
                                        </td>
                                        <td className="px-4 py-2 text-xs text-muted-foreground">
                                          {row.counterparty || "—"}
                                        </td>
                                        <td className="px-4 py-2">
                                          <select
                                            value={editForm.category || "nao_categorizado"}
                                            onChange={(e) =>
                                              setEditForm((prev) => ({
                                                ...prev,
                                                category: e.target.value,
                                              }))
                                            }
                                            className="h-8 text-sm rounded border border-border bg-background px-2 max-w-[180px]"
                                          >
                                            {categories.length > 0 ? (
                                              categories.map((cat) => (
                                                <option key={cat.key} value={cat.key}>
                                                  {cat.display_name}
                                                </option>
                                              ))
                                            ) : (
                                              <option value={editForm.category || ""}>
                                                {editForm.category || "—"}
                                              </option>
                                            )}
                                          </select>
                                        </td>
                                        <td className="px-4 py-2">
                                          <select
                                            value={editForm.transaction_type || "despesa"}
                                            onChange={(e) =>
                                              setEditForm((prev) => ({
                                                ...prev,
                                                transaction_type: e.target.value,
                                              }))
                                            }
                                            className="h-8 text-sm rounded border border-border bg-background px-2"
                                          >
                                            <option value="receita">Receita</option>
                                            <option value="despesa">Despesa</option>
                                            <option value="custo">Custo</option>
                                            <option value="investimento">Investimento</option>
                                            <option value="perda">Perda</option>
                                          </select>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={editForm.amount ?? ""}
                                            onChange={(e) =>
                                              setEditForm((prev) => ({
                                                ...prev,
                                                amount: parseFloat(e.target.value) || 0,
                                              }))
                                            }
                                            className="h-8 text-sm text-right"
                                          />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                          <div className="flex items-center justify-center gap-1">
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => saveRow(doc.id, row.id)}
                                              className="h-7 w-7 p-0 text-green-600"
                                            >
                                              <Check className="w-4 h-4" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={cancelEditing}
                                              className="h-7 w-7 p-0 text-red-600"
                                            >
                                              <X className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </td>
                                      </>
                                    ) : (
                                      // View mode
                                      <>
                                        <td className="px-4 py-2 text-foreground">
                                          {formatDate(row.transaction_date)}
                                        </td>
                                        <td className={`px-4 py-2 max-w-[280px] ${isTotalRow ? "font-semibold text-blue-700 dark:text-blue-400" : "text-foreground"}`}>
                                          <div className="truncate">
                                            {isTotalRow ? (
                                              <span>Valor Total — {row.description || "—"}</span>
                                            ) : (
                                              row.description || "—"
                                            )}
                                          </div>
                                          {/* Known Item Badge */}
                                          {!isTotalRow && knownMatches[String(row.id)] && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                              {editingAliasRowId === row.id ? (
                                                <div className="flex items-center gap-1">
                                                  <Input
                                                    value={aliasInput}
                                                    onChange={(e) => setAliasInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                      if (e.key === "Enter") saveAlias(row.id);
                                                      if (e.key === "Escape") { setEditingAliasRowId(null); setAliasInput(""); }
                                                    }}
                                                    placeholder="Apelido..."
                                                    className="h-5 text-xs w-32 px-1"
                                                    autoFocus
                                                  />
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => saveAlias(row.id)}
                                                    className="h-5 w-5 p-0 text-green-600"
                                                  >
                                                    <Check className="w-3 h-3" />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => { setEditingAliasRowId(null); setAliasInput(""); }}
                                                    className="h-5 w-5 p-0 text-red-500"
                                                  >
                                                    <X className="w-3 h-3" />
                                                  </Button>
                                                </div>
                                              ) : (
                                                <>
                                                  <span className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                                                    {knownMatches[String(row.id)].alias
                                                      || categoryMap[knownMatches[String(row.id)].category || ""]
                                                      || "Conhecido"}
                                                    <span className="ml-1 text-purple-500">
                                                      ({knownMatches[String(row.id)].times_appeared}x)
                                                    </span>
                                                  </span>
                                                  <button
                                                    onClick={() => startEditingAlias(row.id)}
                                                    title="Editar apelido"
                                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                                  >
                                                    <Pencil className="w-2.5 h-2.5" />
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-4 py-2 max-w-[160px]">
                                          {row.counterparty ? (
                                            <span className="text-xs text-foreground truncate block" title={row.counterparty}>
                                              {row.counterparty}
                                            </span>
                                          ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-2">
                                          <Badge variant="secondary" className="text-xs">
                                            {row.category
                                              ? (categoryMap[row.category] || row.category)
                                              : "—"}
                                          </Badge>
                                        </td>
                                        <td className="px-4 py-2">
                                          <Badge
                                            className={`text-xs ${
                                              row.transaction_type === "receita" || row.transaction_type === "income"
                                                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                                : row.transaction_type === "custo"
                                                ? "bg-orange-500/10 text-orange-700 dark:text-orange-400"
                                                : row.transaction_type === "investimento"
                                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                                : row.transaction_type === "perda"
                                                ? "bg-gray-500/10 text-gray-700 dark:text-gray-400"
                                                : "bg-red-500/10 text-red-700 dark:text-red-400"
                                            }`}
                                          >
                                            {row.transaction_type === "receita" || row.transaction_type === "income" ? "Receita"
                                              : row.transaction_type === "custo" ? "Custo"
                                              : row.transaction_type === "investimento" ? "Investimento"
                                              : row.transaction_type === "perda" ? "Perda"
                                              : "Despesa"}
                                          </Badge>
                                        </td>
                                        <td className={`px-4 py-2 text-right font-medium ${isTotalRow ? "text-blue-700 dark:text-blue-400 font-bold" : "text-foreground"}`}>
                                          {formatCurrency(row.amount)}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                          <div className="flex items-center justify-center gap-1">
                                            {row.is_validated ? (
                                              <>
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => startEditing(row)}
                                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                  title="Editar"
                                                >
                                                  <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => deleteRow(doc.id, row.id)}
                                                  className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                                                  title="Remover linha"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => startEditing(row)}
                                                  className="h-7 w-7 p-0"
                                                  title="Editar"
                                                >
                                                  <Edit3 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() =>
                                                    validateRow(doc.id, row.id)
                                                  }
                                                  className="h-7 w-7 p-0 text-green-600"
                                                  title="Validar"
                                                >
                                                  <Check className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => deleteRow(doc.id, row.id)}
                                                  className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                                                  title="Remover linha"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                              </>
                                            )}
                                          </div>
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Add Row Section */}
                          <div className="border-t border-border">
                            {addingRow ? (
                              <div className="p-4 bg-blue-500/5">
                                <p className="text-sm font-medium text-foreground mb-3">Adicionar nova linha</p>
                                <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
                                  <Input
                                    type="date"
                                    placeholder="Data"
                                    value={newRowForm.transaction_date || ""}
                                    onChange={(e) =>
                                      setNewRowForm((prev) => ({ ...prev, transaction_date: e.target.value }))
                                    }
                                    className="h-8 text-sm"
                                  />
                                  <Input
                                    placeholder="Descrição"
                                    value={newRowForm.description || ""}
                                    onChange={(e) =>
                                      setNewRowForm((prev) => ({ ...prev, description: e.target.value }))
                                    }
                                    className="h-8 text-sm sm:col-span-2"
                                  />
                                  <select
                                    value={newRowForm.category || "nao_categorizado"}
                                    onChange={(e) =>
                                      setNewRowForm((prev) => ({ ...prev, category: e.target.value }))
                                    }
                                    className="h-8 text-sm rounded border border-border bg-background px-2"
                                  >
                                    {categories.map((cat) => (
                                      <option key={cat.key} value={cat.key}>
                                        {cat.display_name}
                                      </option>
                                    ))}
                                  </select>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Valor"
                                    value={newRowForm.amount ?? ""}
                                    onChange={(e) =>
                                      setNewRowForm((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                                    }
                                    className="h-8 text-sm"
                                  />
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      onClick={() => addRow(doc.id)}
                                      className="h-8 bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      <Check className="w-4 h-4 mr-1" />
                                      Adicionar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setAddingRow(false);
                                        setNewRowForm({ transaction_type: "despesa", category: "nao_categorizado" });
                                      }}
                                      className="h-8"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="p-2 flex justify-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setAddingRow(true)}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Adicionar linha
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Bulk actions toolbar */}
                          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-t border-border">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground font-medium">Ações:</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground">
                                {rows.length} linhas &middot; {validatedCount} validadas
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-500/10"
                                onClick={() => approveCurrentPage(doc.id)}
                                disabled={loadingRows || rows.every(r => r.is_validated)}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Aprovar Página
                              </Button>
                            </div>
                          </div>

                          {/* Pagination controls */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-center px-4 py-2 bg-muted/10 border-t border-border">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={currentPage <= 1 || loadingRows}
                                  onClick={() => {
                                    const prev = currentPage - 1;
                                    setCurrentPage(prev);
                                    loadRows(doc.id, prev);
                                  }}
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-sm font-medium px-2">
                                  Página {currentPage} de {totalPages}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={currentPage >= totalPages || loadingRows}
                                  onClick={() => {
                                    const next = currentPage + 1;
                                    setCurrentPage(next);
                                    loadRows(doc.id, next);
                                  }}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex items-center justify-between p-4 bg-muted/30 border-t border-border">
                            <Button
                              variant="outline"
                              onClick={() => rejectDocument(doc.id)}
                              className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Rejeitar
                            </Button>
                            <Button
                              onClick={() => confirmAll(doc.id)}
                              disabled={confirming}
                              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-600 text-white"
                            >
                              {confirming ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                              )}
                              Confirmar Tudo
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </SubscriptionGuard>
        </div>
      </div>
    </div>
  );
}
