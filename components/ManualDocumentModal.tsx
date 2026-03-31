"use client";

import { useState } from "react";
import { X, Plus, Trash2, Save, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  product_code?: string;
}

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

interface ManualDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManualDocumentModal({ isOpen, onClose, onSuccess }: ManualDocumentModalProps) {
  const { user } = useAuth();
  const [documentType, setDocumentType] = useState<"single" | "ledger">("single");
  const [loading, setLoading] = useState(false);

  // Single document fields
  const [docNumber, setDocNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [transactionType, setTransactionType] = useState<"income" | "expense" | "gasto" | "investimento">("expense");
  const [category, setCategory] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [issuerName, setIssuerName] = useState("");
  const [issuerTaxId, setIssuerTaxId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientTaxId, setRecipientTaxId] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Ledger fields
  const [transactions, setTransactions] = useState<Transaction[]>([
    { date: "", description: "", category: "", amount: 0, transaction_type: "expense" }
  ]);

  if (!isOpen) return null;

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unit_price: 0, total_price: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate total if quantity and unit_price are set
    if (field === "quantity" || field === "unit_price") {
      const qty = field === "quantity" ? value : updated[index].quantity || 0;
      const price = field === "unit_price" ? value : updated[index].unit_price || 0;
      updated[index].total_price = qty * price;
    }

    setLineItems(updated);
  };

  const addTransaction = () => {
    setTransactions([...transactions, {
      date: "",
      description: "",
      category: "",
      amount: 0,
      transaction_type: "expense"
    }]);
  };

  const removeTransaction = (index: number) => {
    if (transactions.length === 1) {
      toast.error("Deve haver pelo menos uma transação");
      return;
    }
    setTransactions(transactions.filter((_, i) => i !== index));
  };

  const updateTransaction = (index: number, field: keyof Transaction, value: any) => {
    const updated = [...transactions];
    updated[index] = { ...updated[index], [field]: value };
    setTransactions(updated);
  };

  // Auto-fill functions
  const fillIssuerWithMyCompany = () => {
    if (!user) {
      toast.error("Informações do usuário não disponíveis");
      return;
    }
    setIssuerName(user.company_name || user.full_name || "");
    setIssuerTaxId(user.cnpj || "");
    toast.success("Emissor preenchido com seus dados!");
  };

  const fillRecipientWithMyCompany = () => {
    if (!user) {
      toast.error("Informações do usuário não disponíveis");
      return;
    }
    setRecipientName(user.company_name || user.full_name || "");
    setRecipientTaxId(user.cnpj || "");
    toast.success("Destinatário preenchido com seus dados!");
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (documentType === "single") {
        // Validate single document
        if (!totalAmount || parseFloat(totalAmount) <= 0) {
          toast.error("Informe um valor total válido");
          setLoading(false);
          return;
        }

        const documentData = {
          document_type: "invoice",
          document_number: docNumber || undefined,
          issue_date: issueDate || undefined,
          transaction_type: transactionType,
          category: category || undefined,
          total_amount: parseFloat(totalAmount),
          currency: "BRL",
          issuer: issuerName ? {
            name: issuerName,
            tax_id: issuerTaxId || undefined,
          } : undefined,
          recipient: recipientName ? {
            name: recipientName,
            tax_id: recipientTaxId || undefined,
          } : undefined,
          line_items: lineItems.length > 0 ? lineItems : undefined,
          notes: notes || undefined,
          confidence_score: 1.0, // Manual entry = 100% confidence
        };

        await apiClient.createManualDocument(documentData);
        toast.success("Documento criado com sucesso!");
      } else {
        // Validate ledger
        const validTransactions = transactions.filter(t => t.amount > 0);
        if (validTransactions.length === 0) {
          toast.error("Adicione pelo menos uma transação com valor válido");
          setLoading(false);
          return;
        }

        const totalIncome = validTransactions
          .filter(t => ["receita", "income"].includes(t.transaction_type))
          .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = validTransactions
          .filter(t => !["receita", "income"].includes(t.transaction_type))
          .reduce((sum, t) => sum + t.amount, 0);

        const ledgerData = {
          document_type: "transaction_ledger",
          file_name: "Manual Entry",
          total_transactions: validTransactions.length,
          total_income: totalIncome,
          total_expense: totalExpense,
          net_balance: totalIncome - totalExpense,
          currency: "BRL",
          transactions: validTransactions,
          confidence_score: 1.0,
        };

        await apiClient.createManualDocument(ledgerData);
        toast.success("Lançamentos criados com sucesso!");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error creating document:", error);
      toast.error(error.message || "Erro ao criar documento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col border-2 border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-border bg-gradient-to-r from-[#0d767b]/10 to-[#f86a15]/10 dark:from-[#0d767b]/20 dark:to-[#f86a15]/20">
          <div>
            <h2 className="text-3xl font-bold text-foreground">➕ Criar Documento Manual</h2>
            <p className="text-base text-muted-foreground mt-1">Adicione documentos e transações manualmente</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-accent rounded-xl transition-colors">
            <X className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Document Type Selector */}
          <div className="mb-6">
            <label className="block text-lg font-bold text-foreground mb-3">Tipo de Registro</label>
            <div className="flex gap-4">
              <Button
                variant={documentType === "single" ? "default" : "outline"}
                onClick={() => setDocumentType("single")}
                className="flex-1 text-lg px-6 py-6 h-auto"
              >
                📄 Documento Único
                <span className="block text-xs mt-1 opacity-80">Nota Fiscal, Recibo, etc.</span>
              </Button>
              <Button
                variant={documentType === "ledger" ? "default" : "outline"}
                onClick={() => setDocumentType("ledger")}
                className="flex-1 text-lg px-6 py-6 h-auto"
              >
                📊 Múltiplos Lançamentos
                <span className="block text-xs mt-1 opacity-80">Planilha de Transações</span>
              </Button>
            </div>
          </div>

          {documentType === "single" ? (
            // Single Document Form
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-base font-semibold text-foreground mb-2">Número do Documento</label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="NF-12345"
                    className="w-full px-4 py-3 text-base bg-background border-2 border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-foreground mb-2">Data de Emissão</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-4 py-3 text-base bg-background border-2 border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-foreground mb-2">Tipo *</label>
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value as "income" | "expense" | "gasto" | "investimento")}
                    className="w-full px-4 py-3 text-base bg-background border-2 border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="expense">💸 Despesa</option>
                    <option value="income">💰 Receita</option>
                    <option value="gasto">💸 Gasto</option>
                    <option value="investimento">📈 Investimento</option>
                  </select>
                </div>
              </div>

              {/* Financial Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-semibold text-foreground mb-2">Valor Total * (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="1000.00"
                    className="w-full px-4 py-3 text-base bg-background border-2 border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-foreground mb-2">Categoria</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Materiais de Escritório"
                    className="w-full px-4 py-3 text-base bg-background border-2 border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* Issuer */}
              <div className="border-2 border-border rounded-xl p-5 bg-accent/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-foreground">👤 Emissor (Quem emitiu o documento)</h3>
                  <Button
                    onClick={fillIssuerWithMyCompany}
                    variant="outline"
                    className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600 text-base px-5 py-2.5"
                  >
                    <Building2 className="w-5 h-5 mr-2" />
                    Usar Minha Empresa
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-base font-semibold text-foreground mb-2">Nome/Razão Social</label>
                    <input
                      type="text"
                      value={issuerName}
                      onChange={(e) => setIssuerName(e.target.value)}
                      placeholder="Empresa XYZ Ltda"
                      className="w-full px-4 py-3 text-base bg-background border-2 border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-foreground mb-2">CNPJ/CPF</label>
                    <input
                      type="text"
                      value={issuerTaxId}
                      onChange={(e) => setIssuerTaxId(e.target.value)}
                      placeholder="12.345.678/0001-90"
                      className="w-full px-4 py-3 text-base bg-background border-2 border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Recipient */}
              <div className="border-2 border-border rounded-xl p-5 bg-accent/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-foreground">🏢 Destinatário (Para quem foi emitido)</h3>
                  <Button
                    onClick={fillRecipientWithMyCompany}
                    variant="outline"
                    className="bg-purple-600 text-white hover:bg-purple-700 border-purple-600 text-base px-5 py-2.5"
                  >
                    <Building2 className="w-5 h-5 mr-2" />
                    Usar Minha Empresa
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-base font-semibold text-foreground mb-2">Nome/Razão Social</label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Minha Empresa Ltda"
                      className="w-full px-4 py-3 text-base bg-background border-2 border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-foreground mb-2">CNPJ/CPF</label>
                    <input
                      type="text"
                      value={recipientTaxId}
                      onChange={(e) => setRecipientTaxId(e.target.value)}
                      placeholder="98.765.432/0001-10"
                      className="w-full px-4 py-3 text-base bg-background border-2 border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="border-2 border-border rounded-xl p-4 bg-accent/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-foreground">🛒 Itens do Documento (Opcional)</h3>
                  <Button onClick={addLineItem} variant="outline" className="text-sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Item
                  </Button>
                </div>

                {lineItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 mb-3 items-start">
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                        placeholder="Descrição do item"
                        className="w-full px-3 py-2 text-sm bg-background border-2 border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={item.product_code || ""}
                        onChange={(e) => updateLineItem(idx, "product_code", e.target.value)}
                        placeholder="Código"
                        className="w-full px-3 py-2 text-sm bg-background border-2 border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.quantity || ""}
                        onChange={(e) => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                        placeholder="Qtd"
                        className="w-full px-3 py-2 text-sm bg-background border-2 border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.unit_price || ""}
                        onChange={(e) => updateLineItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                        placeholder="Preço"
                        className="w-full px-3 py-2 text-sm bg-background border-2 border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="col-span-1">
                      <p className="text-sm font-bold text-foreground px-3 py-2">
                        R$ {(item.total_price || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="col-span-1">
                      <Button
                        onClick={() => removeLineItem(idx)}
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-base font-semibold text-foreground mb-2">Observações</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Notas adicionais sobre este documento..."
                  className="w-full px-4 py-3 text-lg bg-background border-2 border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>
            </div>
          ) : (
            // Ledger Form
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-foreground">📊 Transações</h3>
                <Button onClick={addTransaction} className="text-base px-6 py-3">
                  <Plus className="w-5 h-5 mr-2" />
                  Adicionar Transação
                </Button>
              </div>

              <div className="space-y-3">
                {transactions.map((txn, idx) => (
                  <div key={idx} className="border-2 border-border rounded-xl p-4 bg-card hover:border-accent transition-colors">
                    <div className="grid grid-cols-12 gap-3 items-start">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Data</label>
                        <input
                          type="date"
                          value={txn.date || ""}
                          onChange={(e) => updateTransaction(idx, "date", e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-background border-2 border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Descrição</label>
                        <input
                          type="text"
                          value={txn.description || ""}
                          onChange={(e) => updateTransaction(idx, "description", e.target.value)}
                          placeholder="Descrição"
                          className="w-full px-3 py-2 text-sm bg-background border-2 border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Categoria</label>
                        <input
                          type="text"
                          value={txn.category || ""}
                          onChange={(e) => updateTransaction(idx, "category", e.target.value)}
                          placeholder="Categoria"
                          className="w-full px-3 py-2 text-sm bg-background border-2 border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Tipo</label>
                        <select
                          value={txn.transaction_type}
                          onChange={(e) => updateTransaction(idx, "transaction_type", e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-background border-2 border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="expense">Despesa</option>
                          <option value="income">Receita</option>
                          <option value="gasto">Gasto</option>
                          <option value="investimento">Investimento</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Valor (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={txn.amount || ""}
                          onChange={(e) => updateTransaction(idx, "amount", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 text-sm bg-background border-2 border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                        />
                      </div>
                      <div className="col-span-1 flex items-end">
                        <Button
                          onClick={() => removeTransaction(idx)}
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 w-full"
                          disabled={transactions.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-500/10 border-2 border-green-500/20 dark:bg-green-500/20 dark:border-green-500/30 rounded-xl p-4">
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium">💰 Total Receitas</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-300 mt-1">
                    R$ {transactions.filter(t => ["receita", "income"].includes(t.transaction_type)).reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-red-500/10 border-2 border-red-500/20 dark:bg-red-500/20 dark:border-red-500/30 rounded-xl p-4">
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">💸 Total Despesas</p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-300 mt-1">
                    R$ {transactions.filter(t => !["receita", "income"].includes(t.transaction_type)).reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-blue-500/10 border-2 border-blue-500/20 dark:bg-blue-500/20 dark:border-blue-500/30 rounded-xl p-4">
                  <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">📊 Saldo</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-300 mt-1">
                    R$ {(
                      transactions.filter(t => ["receita", "income"].includes(t.transaction_type)).reduce((sum, t) => sum + (t.amount || 0), 0) -
                      transactions.filter(t => !["receita", "income"].includes(t.transaction_type)).reduce((sum, t) => sum + (t.amount || 0), 0)
                    ).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-muted/50">
          <Button variant="outline" onClick={onClose} className="text-base px-6 py-3">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-base px-8 py-3"
          >
            <Save className="w-5 h-5 mr-2" />
            {loading ? "Salvando..." : "Criar Documento"}
          </Button>
        </div>
      </div>
    </div>
  );
}
