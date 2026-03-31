"use client";

import { useState, useEffect } from "react";
import { History, User, Clock, MapPin, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

interface AuditLogEntry {
  id: number;
  action: string;
  entity_type: string;
  user: {
    id: number;
    name: string;
  };
  before_value?: any;
  after_value?: any;
  changes_summary?: string;
  ip_address?: string;
  created_at: string;
}

interface AuditTrailViewerProps {
  documentId?: number;  // If provided, show logs for specific document
  documentName?: string;
}

export default function AuditTrailViewer({ documentId, documentName }: AuditTrailViewerProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [totalChanges, setTotalChanges] = useState(0);

  useEffect(() => {
    loadAuditLogs();
  }, [documentId]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      if (documentId) {
        // Load logs for specific document
        const response = await apiClient.getDocumentAuditLog(documentId, 100);
        setAuditLogs(response.audit_log || []);
        setTotalChanges(response.total_changes || 0);
      } else {
        // Load all logs
        const response = await apiClient.getAllAuditLogs({ limit: 50 });
        setAuditLogs(response.audit_logs || []);
        setTotalChanges(response.total || 0);
      }
    } catch (error: any) {
      console.error("Error loading audit logs:", error);
      toast.error("Erro ao carregar histórico de auditoria");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const getActionBadge = (action: string) => {
    const styles: Record<string, { bg: string; text: string; icon: string }> = {
      create: { bg: "bg-green-100", text: "text-green-700", icon: "✓" },
      update: { bg: "bg-blue-100", text: "text-blue-700", icon: "✎" },
      delete: { bg: "bg-red-100", text: "text-red-700", icon: "✕" },
      bulk_create: { bg: "bg-purple-100", text: "text-purple-700", icon: "⚡" },
    };

    const style = styles[action] || styles.create;

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${style.bg} ${style.text}`}>
        <span>{style.icon}</span>
        {action === "create" && "Criado"}
        {action === "update" && "Editado"}
        {action === "delete" && "Excluído"}
        {action === "bulk_create" && "Importação"}
      </span>
    );
  };

  const renderValueComparison = (before: any, after: any) => {
    if (!before && !after) return null;

    // Simple value comparison
    if (typeof before !== "object" && typeof after !== "object") {
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-xs font-medium text-red-700 mb-2">Antes</p>
            <p className="text-base text-red-900 font-mono">{String(before || "-")}</p>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <p className="text-xs font-medium text-green-700 mb-2">Depois</p>
            <p className="text-base text-green-900 font-mono">{String(after || "-")}</p>
          </div>
        </div>
      );
    }

    // Complex object comparison
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <p className="text-xs font-medium text-red-700 mb-2">Antes</p>
          <pre className="text-xs text-red-900 overflow-auto max-h-64">
            {JSON.stringify(before, null, 2)}
          </pre>
        </div>
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <p className="text-xs font-medium text-green-700 mb-2">Depois</p>
          <pre className="text-xs text-green-900 overflow-auto max-h-64">
            {JSON.stringify(after, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-lg text-gray-700">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma alteração registrada</h3>
        <p className="text-gray-600">
          {documentId
            ? "Este documento ainda não foi editado."
            : "Nenhum registro de auditoria encontrado."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
            <History className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              📋 Histórico de Auditoria
            </h2>
            {documentName && (
              <p className="text-base text-gray-700 mt-1">Documento: {documentName}</p>
            )}
          </div>
        </div>
        <p className="text-lg text-indigo-800">
          Total de alterações: <strong>{totalChanges}</strong>
        </p>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {auditLogs.map((log, index) => (
          <div
            key={log.id}
            className="relative bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-all"
          >
            {/* Timeline connector */}
            {index < auditLogs.length - 1 && (
              <div className="absolute left-[35px] top-[80px] w-0.5 h-[calc(100%+16px)] bg-gray-300" />
            )}

            {/* Timeline dot */}
            <div className="absolute left-6 top-6 w-5 h-5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full border-4 border-white shadow-lg" />

            <div className="ml-12">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getActionBadge(log.action)}
                    <span className="text-sm text-gray-500">#{log.id}</span>
                  </div>
                  {log.changes_summary && (
                    <p className="text-lg font-semibold text-gray-900 mb-2">
                      {log.changes_summary}
                    </p>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">{log.user.name}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-4 h-4 text-green-600" />
                  <span className="text-sm">{formatDate(log.created_at)}</span>
                </div>
                {log.ip_address && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-mono">{log.ip_address}</span>
                  </div>
                )}
              </div>

              {/* Expand/Collapse for details */}
              {(log.before_value || log.after_value) && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    className="text-sm mb-3"
                  >
                    {expandedLog === log.id ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-2" />
                        Ocultar Detalhes
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Ver Alterações
                      </>
                    )}
                  </Button>

                  {expandedLog === log.id && (
                    <div className="mt-4">
                      {renderValueComparison(log.before_value, log.after_value)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Load more hint */}
      {auditLogs.length >= 50 && (
        <div className="text-center text-sm text-gray-500">
          Mostrando os {auditLogs.length} registros mais recentes
        </div>
      )}
    </div>
  );
}
