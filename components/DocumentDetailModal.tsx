"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api";
import type { DocumentRecord, ValidationResult, FinancialDocument } from "@/lib/types";
import { formatCategory } from "@/lib/categories";

interface DocumentDetailModalProps {
  documentId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DocumentDetailModal({
  documentId,
  open,
  onOpenChange,
}: DocumentDetailModalProps) {
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    if (documentId && open) {
      loadDocument();
    }
  }, [documentId, open]);

  const loadDocument = async () => {
    if (!documentId) return;

    setLoading(true);
    try {
      const [docData, valData] = await Promise.all([
        apiClient.getDocument(documentId),
        apiClient.validateDocument(documentId).catch(() => null),
      ]);
      setDocument(docData);
      setValidation(valData);
    } catch (error) {
      console.error("Erro ao carregar documento:", error);
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

  const formatDate = (dateStr: string) => {
    // Append T12:00:00 to date-only strings to prevent UTC midnight → BRT day shift
    const normalized = dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00';
    const date = new Date(normalized);
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(date);
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      invoice: "Nota Fiscal",
      receipt: "Recibo",
      expense: "Despesa",
      statement: "Extrato",
      other: "Outro",
    };
    return labels[type] || type;
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      income: "Receita", expense: "Despesa", gasto: "Gasto", investimento: "Investimento",
      receita: "Receita", despesa: "Despesa", custo: "Custo", perda: "Perda",
    };
    return labels[type] || type;
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      paid: "Pago",
      unpaid: "Não Pago",
      partial: "Parcial",
      pending: "Pendente",
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="text-center py-8">Carregando...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!document) {
    return null;
  }

  const data = document.extracted_data;

  // Type guard: ensure we're dealing with a FinancialDocument, not a TransactionLedger
  const isFinancialDocument = data && data.document_type !== "transaction_ledger";
  const financialData = isFinancialDocument ? (data as FinancialDocument) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle>Detalhes do Documento #{document.id}</DialogTitle>
          <DialogDescription>{document.file_name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Arquivo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Nome do Arquivo</p>
                  <p className="font-medium">{document.file_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Tipo</p>
                  <p className="font-medium">{document.file_type.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Status</p>
                  <Badge
                    variant={document.status === "completed" ? "default" : "secondary"}
                  >
                    {document.status === "completed" ? "Concluído" : document.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Data de Upload</p>
                  <p className="font-medium">{formatDate(document.upload_date)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {financialData && (
            <>
              {/* Document Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dados do Documento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">Tipo de Documento</p>
                      <p className="font-medium">
                        {getDocumentTypeLabel(financialData.document_type)}
                      </p>
                    </div>
                    {financialData.document_number && (
                      <div>
                        <p className="text-sm text-slate-600">Número</p>
                        <p className="font-medium">{financialData.document_number}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-slate-600">Tipo de Transação</p>
                      <Badge
                        variant={
                          ["receita", "income"].includes(financialData.transaction_type) ? "default" : "secondary"
                        }
                      >
                        {getTransactionTypeLabel(financialData.transaction_type)}
                      </Badge>
                    </div>
                    {financialData.issue_date && (
                      <div>
                        <p className="text-sm text-slate-600">Data de Emissão</p>
                        <p className="font-medium">
                          {new Intl.DateTimeFormat("pt-BR").format(
                            new Date(financialData.issue_date)
                          )}
                        </p>
                      </div>
                    )}
                    {financialData.category && (
                      <div>
                        <p className="text-sm text-slate-600">Categoria</p>
                        <p className="font-medium">{formatCategory(financialData.category)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Issuer Info */}
              {financialData.issuer && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Emissor</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {financialData.issuer.name && (
                      <div>
                        <p className="text-sm text-slate-600">Nome</p>
                        <p className="font-medium">{financialData.issuer.name}</p>
                      </div>
                    )}
                    {financialData.issuer.legal_name && (
                      <div>
                        <p className="text-sm text-slate-600">Razão Social</p>
                        <p className="font-medium">{financialData.issuer.legal_name}</p>
                      </div>
                    )}
                    {financialData.issuer.tax_id && (
                      <div>
                        <p className="text-sm text-slate-600">CNPJ/CPF</p>
                        <p className="font-medium font-mono">{financialData.issuer.tax_id}</p>
                      </div>
                    )}
                    {financialData.issuer.address && (
                      <div>
                        <p className="text-sm text-slate-600">Endereço</p>
                        <p className="font-medium">{financialData.issuer.address}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {financialData.issuer.phone && (
                        <div>
                          <p className="text-sm text-slate-600">Telefone</p>
                          <p className="font-medium">{financialData.issuer.phone}</p>
                        </div>
                      )}
                      {financialData.issuer.email && (
                        <div>
                          <p className="text-sm text-slate-600">Email</p>
                          <p className="font-medium">{financialData.issuer.email}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recipient Info */}
              {financialData.recipient && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Destinatário</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {financialData.recipient.name && (
                      <div>
                        <p className="text-sm text-slate-600">Nome</p>
                        <p className="font-medium">{financialData.recipient.name}</p>
                      </div>
                    )}
                    {financialData.recipient.legal_name && (
                      <div>
                        <p className="text-sm text-slate-600">Razão Social</p>
                        <p className="font-medium">{financialData.recipient.legal_name}</p>
                      </div>
                    )}
                    {financialData.recipient.tax_id && (
                      <div>
                        <p className="text-sm text-slate-600">CNPJ/CPF</p>
                        <p className="font-medium font-mono">{financialData.recipient.tax_id}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Transactions (multi-row ledgers/Excel) */}
              {financialData.transactions && financialData.transactions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Transações ({financialData.transactions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {financialData.transactions.map((txn: any, index: number) => (
                        <div
                          key={index}
                          className="p-3 bg-slate-50 rounded-md flex items-center justify-between gap-4"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{txn.description || `Transação ${index + 1}`}</p>
                            <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
                              {txn.date && <span>{txn.date}</span>}
                              {txn.category && <span>{txn.category}</span>}
                              {txn.counterparty && <span>{txn.counterparty}</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`font-semibold text-sm ${
                              ["receita", "income"].includes(txn.transaction_type) ? "text-green-600" : "text-red-600"
                            }`}>
                              {["receita", "income"].includes(txn.transaction_type) ? "+" : "-"}
                              {formatCurrency(String(Math.abs(Number(txn.amount) || 0)))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Line Items (NFe/invoices) */}
              {financialData.line_items && financialData.line_items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Itens</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {financialData.line_items.map((item: any, index: number) => (
                        <div
                          key={index}
                          className="p-3 bg-slate-50 rounded-md space-y-1"
                        >
                          <p className="font-medium">{item.description}</p>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            {item.quantity && (
                              <div>
                                <span className="text-slate-600">Qtd: </span>
                                <span className="font-medium">{item.quantity}</span>
                              </div>
                            )}
                            {item.unit_price && (
                              <div>
                                <span className="text-slate-600">Preço Unit.: </span>
                                <span className="font-medium">
                                  {formatCurrency(item.unit_price)}
                                </span>
                              </div>
                            )}
                            {item.total_price && (
                              <div>
                                <span className="text-slate-600">Total: </span>
                                <span className="font-medium">
                                  {formatCurrency(item.total_price)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumo Financeiro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {financialData.subtotal && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(financialData.subtotal)}</span>
                    </div>
                  )}
                  {financialData.tax_amount && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        Impostos{financialData.tax_rate ? ` (${financialData.tax_rate}%)` : ""}:
                      </span>
                      <span className="font-medium">
                        {formatCurrency(financialData.tax_amount)}
                      </span>
                    </div>
                  )}
                  {financialData.discount && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Desconto:</span>
                      <span className="font-medium text-green-600">
                        -{formatCurrency(financialData.discount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold text-lg">Total:</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(financialData.total_amount)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Info */}
              {financialData.payment_info && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações de Pagamento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-600">Status</p>
                        <Badge
                          variant={
                            financialData.payment_info.status === "paid" ? "default" : "secondary"
                          }
                        >
                          {getPaymentStatusLabel(financialData.payment_info.status)}
                        </Badge>
                      </div>
                      {financialData.payment_info.method && (
                        <div>
                          <p className="text-sm text-slate-600">Método</p>
                          <p className="font-medium">{financialData.payment_info.method}</p>
                        </div>
                      )}
                      {financialData.payment_info.due_date && (
                        <div>
                          <p className="text-sm text-slate-600">Vencimento</p>
                          <p className="font-medium">
                            {new Intl.DateTimeFormat("pt-BR").format(
                              new Date(financialData.payment_info.due_date)
                            )}
                          </p>
                        </div>
                      )}
                      {financialData.payment_info.payment_date && (
                        <div>
                          <p className="text-sm text-slate-600">Data de Pagamento</p>
                          <p className="font-medium">
                            {new Intl.DateTimeFormat("pt-BR").format(
                              new Date(financialData.payment_info.payment_date)
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {financialData.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{financialData.notes}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Validation Results */}
          {validation && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Validação</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowValidation(!showValidation)}
                  >
                    {showValidation ? "Ocultar" : "Mostrar"}
                  </Button>
                </div>
              </CardHeader>
              {showValidation && (
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 mb-4">
                      <Badge
                        variant={validation.validation.is_valid ? "default" : "destructive"}
                      >
                        {validation.validation.is_valid ? "Válido" : "Com Problemas"}
                      </Badge>
                      <div className="text-sm text-slate-600">
                        {validation.validation.error_count > 0 && (
                          <span className="text-red-600 mr-3">
                            {validation.validation.error_count} erro(s)
                          </span>
                        )}
                        {validation.validation.warning_count > 0 && (
                          <span className="text-yellow-600 mr-3">
                            {validation.validation.warning_count} aviso(s)
                          </span>
                        )}
                        {validation.validation.info_count > 0 && (
                          <span className="text-blue-600">
                            {validation.validation.info_count} info(s)
                          </span>
                        )}
                      </div>
                    </div>

                    {validation.validation.errors.length > 0 && (
                      <div className="space-y-2">
                        {validation.validation.errors.map((error, index) => (
                          <div
                            key={index}
                            className={`p-2 rounded-md text-sm ${
                              error.severity === "error"
                                ? "bg-red-50 text-red-800"
                                : error.severity === "warning"
                                ? "bg-yellow-50 text-yellow-800"
                                : "bg-blue-50 text-blue-800"
                            }`}
                          >
                            <p className="font-medium">{error.field}</p>
                            <p>{error.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
