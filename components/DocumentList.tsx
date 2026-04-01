"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { apiClient } from "@/lib/api";
import type { DocumentRecord, TransactionLedger } from "@/lib/types";
import DocumentViewerModal from "./DocumentViewerModal";
import ManualDocumentModal from "./ManualDocumentModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FileSpreadsheet, Plus, SearchIcon, Filter, Users, FileText, DollarSign, Monitor, AlertTriangle, Check, ChevronsUpDown, ClipboardCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import CreateOrgDialog from "@/components/organizations/CreateOrgDialog";

interface DocumentListProps {
  onDocumentChange?: () => void;
}

export default function DocumentList({ onDocumentChange }: DocumentListProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [openInEditMode, setOpenInEditMode] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);
  const [clients, setClients] = useState<Array<{ id: number; name: string; client_type: string }>>([]);
  const [filters, setFilters] = useState({
    status: "",
    document_type: "",
    transaction_type: "",
    search: "",
    client_id: "",
  });
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);
  const [createOrgCnpj, setCreateOrgCnpj] = useState("");

  /** Extract CNPJ from warning message like "CNPJ 12.345.678/0001-90 não está cadastrado..." */
  const extractCnpjFromMessage = (message: string): string => {
    const match = message.match(/CNPJ\s+([\d.\/\-]+)/);
    return match ? match[1] : "";
  };

  const openCreateOrgFromDoc = (doc: DocumentRecord) => {
    const cnpj = doc.cnpj_warning_message ? extractCnpjFromMessage(doc.cnpj_warning_message) : "";
    setCreateOrgCnpj(cnpj);
    setCreateOrgDialogOpen(true);
  };

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [filters]);

  useEffect(() => {
    loadDocuments();
  }, [filters, currentPage, itemsPerPage]);

  useEffect(() => {
    loadClients();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const params: any = {
        limit: itemsPerPage,
        skip: (currentPage - 1) * itemsPerPage
      };
      if (filters.status) params.status = filters.status;
      if (filters.document_type) params.document_type = filters.document_type;
      if (filters.transaction_type) params.transaction_type = filters.transaction_type;
      if (filters.search) params.search = filters.search;
      if (filters.client_id) params.client_id = parseInt(filters.client_id);

      const response = await apiClient.listDocuments(params);
      setDocuments(response.documents);
      setTotalDocuments(response.total || response.documents.length);
    } catch (error) {
      console.error("Erro ao carregar documentos:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await apiClient.listClients({ limit: 500 });
      setClients(response.clients);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    }
  };

  const handleRetry = async (id: number) => {
    try {
      await apiClient.retryDocument(id);
      toast.success("Documento enviado para reprocessamento");
      fetchDocuments();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Erro ao reprocessar documento");
    }
  };

  const handleDeleteClick = (id: number) => {
    setDocumentToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    try {
      await apiClient.deleteDocument(documentToDelete);
      toast.success("Documento excluído com sucesso!");
      loadDocuments();
      onDocumentChange?.();
    } catch (error) {
      console.error("Erro ao deletar documento:", error);
      toast.error("Erro ao deletar documento");
    } finally {
      setDocumentToDelete(null);
    }
  };

  const handleView = (doc: DocumentRecord) => {
    setSelectedDocument(doc);
    setOpenInEditMode(false);
    setModalOpen(true);
  };

  const handleEdit = (doc: DocumentRecord) => {
    setSelectedDocument(doc);
    setOpenInEditMode(true);
    setModalOpen(true);
  };

  const getStatusBadge = (status: string, doc?: DocumentRecord) => {
    // Special handling for failed documents with retry info
    if (status === "failed" && doc) {
      if (doc.max_retries_exhausted) {
        return (
          <Badge variant="secondary" className="text-base px-4 py-2 font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300">
            Falha Persistente
          </Badge>
        );
      }
      if ((doc.retry_count ?? 0) > 0) {
        return (
          <Badge variant="secondary" className="text-base px-4 py-2 font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300">
            Aguardando Retentativa
          </Badge>
        );
      }
    }

    const variants: Record<string, { variant: any; label: string }> = {
      completed: { variant: "default", label: "Concluído" },
      pending: { variant: "secondary", label: "Pendente" },
      processing: { variant: "secondary", label: "Processando" },
      pending_validation: { variant: "secondary", label: "Validação Pendente" },
      failed: { variant: "destructive", label: "Falhou" },
    };

    const config = variants[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant} className="text-base px-4 py-2 font-bold">{config.label}</Badge>;
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      invoice: "Nota Fiscal",
      receipt: "Recibo",
      expense: "Despesa",
      statement: "Extrato",
      transaction_ledger: "Razão Geral",
      other: "Outro",
    };
    return labels[type] || type;
  };

  const isLedger = (doc: DocumentRecord) => {
    return doc.extracted_data?.document_type === "transaction_ledger";
  };

  const formatCurrency = (value: string | number | null | undefined) => {
    const num = typeof value === 'number' ? value : parseFloat(value ?? "0");
    if (isNaN(num)) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("pt-BR").format(date);
  };

  return (
    <Card className="shadow-xl border-2">
      <CardHeader className="border-b-2 border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4">
          <Button
            onClick={() => setManualModalOpen(true)}
            size="lg"
            className="bg-[#0d767b] hover:bg-[#f86a15] text-white w-full sm:w-auto shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Criar Documento Manual</span>
            <span className="sm:hidden">Novo Documento</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Mobile Warning Banner - removed, replaced with card layout */}

        {/* Filters */}
        <div className="bg-muted border-2 border-border rounded-2xl p-8 mb-6 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <Filter className="w-8 h-8 text-[#0d767b] dark:text-[#0d767b]" />
            <h3 className="text-3xl font-bold text-foreground">Filtros e Busca</h3>
          </div>

          {/* Search Bar - Prominent */}
          <div className="mb-6">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documentos por nome, número, cliente..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10 text-base"
              />
            </div>
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileText className="w-6 h-6 text-[#0d767b] dark:text-[#0d767b]" />
                Status
              </label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? "" : value })}
              >
                <SelectTrigger className="w-full text-base">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="completed">✅ Concluído</SelectItem>
                  <SelectItem value="pending">⏳ Pendente</SelectItem>
                  <SelectItem value="pending_validation">📋 Validação Pendente</SelectItem>
                  <SelectItem value="processing">⚙️ Processando</SelectItem>
                  <SelectItem value="failed">❌ Falhou</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-[#0d767b] dark:text-[#0d767b]" />
                Tipo de Documento
              </label>
              <Select
                value={filters.document_type || "all"}
                onValueChange={(value) => setFilters({ ...filters, document_type: value === "all" ? "" : value })}
              >
                <SelectTrigger className="w-full text-base">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="invoice">📄 Nota Fiscal</SelectItem>
                  <SelectItem value="receipt">🧾 Recibo</SelectItem>
                  <SelectItem value="expense">💸 Despesa</SelectItem>
                  <SelectItem value="statement">📊 Extrato</SelectItem>
                  <SelectItem value="transaction_ledger">📚 Razão Geral</SelectItem>
                  <SelectItem value="other">📋 Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-[#0d767b] dark:text-[#0d767b]" />
                Tipo de Transação
              </label>
              <Select
                value={filters.transaction_type || "all"}
                onValueChange={(value) => setFilters({ ...filters, transaction_type: value === "all" ? "" : value })}
              >
                <SelectTrigger className="w-full text-base">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">💰 Receita</SelectItem>
                  <SelectItem value="expense">💸 Despesa</SelectItem>
                  <SelectItem value="gasto">💸 Gasto</SelectItem>
                  <SelectItem value="investimento">📈 Investimento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="w-6 h-6 text-[#0d767b] dark:text-[#0d767b]" />
                Cliente/Fornecedor
              </label>
              <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientSearchOpen}
                    className="w-full justify-between text-base h-9"
                  >
                    {filters.client_id
                      ? clients.find((client) => client.id.toString() === filters.client_id)?.name
                      : "Todos"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setFilters({ ...filters, client_id: "" });
                            setClientSearchOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filters.client_id === "" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Todos
                        </CommandItem>
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={`${client.name} ${client.id}`}
                            onSelect={() => {
                              setFilters({ ...filters, client_id: client.id.toString() });
                              setClientSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                filters.client_id === client.id.toString() ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {client.name} ({client.client_type === 'customer' ? '👤 Cliente' : '🏢 Fornecedor'})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-xl sm:text-2xl font-semibold">Carregando documentos...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-xl sm:text-2xl font-semibold">
            Nenhum documento encontrado
          </div>
        ) : (
          <>
          {/* Mobile Card Layout */}
          <div className="lg:hidden space-y-3">
            {documents.map((doc) => {
              const ledger = isLedger(doc) ? (doc.extracted_data as TransactionLedger) : null;

              return (
                <div
                  key={doc.id}
                  className="rounded-xl border-2 border-border bg-card p-4 shadow-sm space-y-3"
                >
                  {/* Row 1: File name + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {isLedger(doc) && (
                        <FileSpreadsheet className="h-5 w-5 text-[#0d767b] flex-shrink-0" />
                      )}
                      <span className="truncate text-base font-semibold text-foreground">{doc.file_name}</span>
                      {doc.cnpj_mismatch && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium dark:bg-yellow-900/30 dark:text-yellow-400 flex-shrink-0">
                          <AlertTriangle className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    {getStatusBadge(doc.status, doc)}
                  </div>

                  {/* CNPJ mismatch banner */}
                  {doc.cnpj_mismatch && doc.cnpj_warning_message && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                      <span className="text-xs text-yellow-800 dark:text-yellow-300 flex-1">{doc.cnpj_warning_message}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); openCreateOrgFromDoc(doc); }}
                        className="text-xs font-semibold px-2 py-1 rounded bg-yellow-600 text-white hover:bg-yellow-700 whitespace-nowrap"
                      >
                        Criar empresa
                      </button>
                    </div>
                  )}

                  {/* Persistent failure banner (retries exhausted) */}
                  {doc.max_retries_exhausted && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                      <span className="text-xs text-orange-800 dark:text-orange-300 flex-1">
                        Este arquivo não pôde ser processado após múltiplas tentativas. Verifique o formato do arquivo e tente enviar novamente.
                      </span>
                    </div>
                  )}

                  {/* Row 2: Type + Client + Date */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {doc.extracted_data && (
                      <span className="font-medium">{getDocumentTypeLabel(doc.extracted_data.document_type)}</span>
                    )}
                    {ledger ? (
                      <span>Múltiplas partes</span>
                    ) : doc.client_name ? (
                      <span className="font-medium text-foreground">{doc.client_name}</span>
                    ) : (doc.extracted_data as any)?.issuer?.name ? (
                      <span>{(doc.extracted_data as any).issuer.name}</span>
                    ) : null}
                    <span>
                      {(doc.extracted_data as any)?.issue_date
                        ? formatDate((doc.extracted_data as any).issue_date)
                        : formatDate(doc.upload_date)}
                    </span>
                  </div>

                  {/* Row 3: Amount + Actions */}
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold">
                      {doc.extracted_data ? (
                        ledger ? (
                          <div className="flex gap-3">
                            <span className="text-green-600 dark:text-green-500">+{formatCurrency(ledger.total_income)}</span>
                            <span className="text-red-600 dark:text-red-500">-{formatCurrency(ledger.total_expense)}</span>
                          </div>
                        ) : (
                          <span className={
                            ['receita', 'income'].includes((doc.extracted_data as any).transaction_type)
                              ? 'text-green-600 dark:text-green-500'
                              : ['despesa', 'expense', 'custo', 'perda'].includes((doc.extracted_data as any).transaction_type)
                              ? 'text-red-600 dark:text-red-500'
                              : 'text-foreground'
                          }>
                            {['receita', 'income'].includes((doc.extracted_data as any).transaction_type) ? '+' : '-'}
                            {formatCurrency((doc.extracted_data as any).total_amount)}
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground text-base">-</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {doc.status === "pending_validation" ? (
                        <Button
                          size="sm"
                          onClick={() => router.push("/validation")}
                          className="bg-amber-500 hover:bg-amber-600 text-white"
                        >
                          <ClipboardCheck className="w-4 h-4" />
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleView(doc)}>
                            👁️
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(doc)}
                            className="border-[#0d767b] dark:border-[#f86a15] text-[#0d767b] dark:text-[#f86a15]"
                          >
                            ✏️
                          </Button>
                        </>
                      )}
                      {doc.status === "failed" && (
                        <Button size="sm" variant="outline" onClick={() => handleRetry(doc.id)}
                          className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950"
                        >
                          🔄
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(doc.id)}>
                        🗑️
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden lg:block rounded-xl border-2 border-border overflow-x-auto shadow-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-[#0d767b] to-[#095a5e] dark:from-[#0d767b] dark:to-[#f86a15] hover:from-[#0d767b] hover:to-[#095a5e] dark:hover:from-[#0d767b] dark:hover:to-[#f86a15]">
                  <TableHead className="text-base font-bold text-white py-4">Arquivo</TableHead>
                  <TableHead className="text-base font-bold text-white py-4">Status</TableHead>
                  <TableHead className="text-base font-bold text-white py-4">Tipo</TableHead>
                  <TableHead className="text-base font-bold text-white py-4">Cliente/Fornecedor</TableHead>
                  <TableHead className="text-base font-bold text-white py-4">Valor</TableHead>
                  <TableHead className="text-base font-bold text-white py-4">Data</TableHead>
                  <TableHead className="text-base font-bold text-white py-4 text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc, idx) => {
                  const ledger = isLedger(doc) ? (doc.extracted_data as TransactionLedger) : null;

                  return (
                    <TableRow key={doc.id} className={`transition-colors hover:bg-accent ${idx % 2 === 0 ? 'bg-muted/50' : 'bg-card'}`}>
                      <TableCell className="max-w-[260px] py-3">
                        <div className="flex items-center gap-2">
                          {isLedger(doc) && (
                            <FileSpreadsheet className="h-5 w-5 text-[#0d767b] dark:text-[#0d767b] flex-shrink-0" />
                          )}
                          <span className="truncate text-sm font-semibold text-foreground">{doc.file_name}</span>
                          {doc.cnpj_mismatch && (
                            <span className="inline-flex items-center gap-1 flex-shrink-0">
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium dark:bg-yellow-900/30 dark:text-yellow-400 cursor-help"
                                title={doc.cnpj_warning_message || "CNPJ do documento não confere com o CNPJ da sua empresa"}
                              >
                                <AlertTriangle className="h-3 w-3" />
                                CNPJ
                              </span>
                              {doc.cnpj_warning_message?.includes("não está cadastrado") && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); openCreateOrgFromDoc(doc); }}
                                  className="text-xs font-semibold px-2 py-0.5 rounded bg-yellow-600 text-white hover:bg-yellow-700"
                                >
                                  Criar empresa
                                </button>
                              )}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(doc.status, doc)}
                          {doc.max_retries_exhausted && (
                            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                              Falhou após {doc.retry_count} tentativas
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm py-3">
                        {doc.extracted_data ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-foreground">{getDocumentTypeLabel(doc.extracted_data.document_type)}</span>
                            {ledger && ledger.total_transactions != null && (
                              <Badge variant="outline" className="text-xs px-2 py-0.5 font-semibold w-fit">
                                {(ledger.total_transactions ?? 0).toLocaleString('pt-BR')} transações
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm py-3">
                        {ledger ? (
                          <span className="text-muted-foreground">Múltiplas partes</span>
                        ) : doc.client_name ? (
                          <div>
                            <div className="font-semibold text-foreground text-sm truncate">{doc.client_name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {doc.client_type === 'customer' ? '👤 Cliente' : '🏪 Fornecedor'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{(doc.extracted_data as any)?.issuer?.name || "-"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-base font-bold py-3">
                        {doc.extracted_data ? (
                          ledger ? (
                            <div>
                              <div className="text-green-600 dark:text-green-500 font-bold">+{formatCurrency(ledger.total_income)}</div>
                              <div className="text-red-600 dark:text-red-500 font-bold">-{formatCurrency(ledger.total_expense)}</div>
                            </div>
                          ) : (
                            <div className={
                              ['receita', 'income'].includes((doc.extracted_data as any).transaction_type)
                                ? 'text-green-600 dark:text-green-500 font-bold'
                                : ['despesa', 'expense', 'custo', 'perda'].includes((doc.extracted_data as any).transaction_type)
                                ? 'text-red-600 dark:text-red-500 font-bold'
                                : 'text-foreground font-bold'
                            }>
                              {['receita', 'income'].includes((doc.extracted_data as any).transaction_type) ? '+' : '-'}
                              {formatCurrency((doc.extracted_data as any).total_amount)}
                            </div>
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground py-3 whitespace-nowrap">
                        {(doc.extracted_data as any)?.issue_date
                          ? formatDate((doc.extracted_data as any).issue_date)
                          : formatDate(doc.upload_date)}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex gap-1.5 justify-center items-center">
                          {doc.status === "pending_validation" ? (
                            <Button
                              size="sm"
                              onClick={() => router.push("/validation")}
                              className="bg-amber-500 hover:bg-amber-600 text-white"
                              title="Validar documento"
                            >
                              <ClipboardCheck className="w-4 h-4 mr-1" />
                              Validar
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleView(doc)}
                                title="Ver documento"
                              >
                                👁️ Ver
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(doc)}
                                className="border-[#0d767b] dark:border-[#f86a15] text-[#0d767b] dark:text-[#f86a15] hover:bg-[#0d767b]/10 dark:hover:bg-[#f86a15]/10"
                                title="Editar documento"
                              >
                                ✏️ Editar
                              </Button>
                            </>
                          )}
                          {doc.status === "failed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRetry(doc.id)}
                              title="Reprocessar documento"
                              className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950"
                            >
                              🔄 Reprocessar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteClick(doc.id)}
                            title="Excluir documento"
                          >
                            🗑️
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

            {/* Pagination Controls */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-4 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Itens por página:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="text-sm text-muted-foreground text-center">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} até{" "}
                  {Math.min(currentPage * itemsPerPage, totalDocuments)} de{" "}
                  {totalDocuments} documentos
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <div className="flex items-center gap-2 px-4 py-2 bg-accent rounded-lg">
                    <span className="text-sm font-medium text-foreground">
                      Página {currentPage} de {Math.ceil(totalDocuments / itemsPerPage)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(totalDocuments / itemsPerPage)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>

      <DocumentViewerModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedDocument(null);
          setOpenInEditMode(false);
        }}
        document={selectedDocument}
        onUpdate={loadDocuments}
        openInEditMode={openInEditMode}
      />

      <ManualDocumentModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onSuccess={() => {
          loadDocuments();
          onDocumentChange?.();
        }}
      />

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDocumentToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Excluir Documento"
        message="Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />

      <CreateOrgDialog
        open={createOrgDialogOpen}
        onOpenChange={setCreateOrgDialogOpen}
        initialCnpj={createOrgCnpj}
      />
    </Card>
  );
}
