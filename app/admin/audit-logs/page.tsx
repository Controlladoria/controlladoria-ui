'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import { toast } from 'sonner';
import {
  FileText, Filter, Download, ChevronLeft, ChevronRight,
  Eye, Search, Calendar, User, FileEdit, Trash2, PlusCircle
} from 'lucide-react';
import { formatBrazilianDateTime } from '@/lib/date-utils';

interface AuditLog {
  id: number;
  user_id: number;
  user_email: string | null;
  user_name: string | null;
  document_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  before_value: string | null;
  after_value: string | null;
  changes_summary: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

function AuditLogsPageContent() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    page_size: 50,
    total: 0,
    total_pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    entity_type: '',
    user_id: '',
    date_from: '',
    date_to: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Check if user has permission to view audit logs (owner or admin only)
  const canViewAuditLogs = user?.role === 'owner' || user?.role === 'admin';

  if (!canViewAuditLogs) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Negado</h1>
            <p className="text-muted-foreground">Apenas proprietários e administradores podem acessar os logs de auditoria.</p>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, filters]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        page_size: pagination.page_size,
      };

      if (filters.action) params.action = filters.action;
      if (filters.entity_type) params.entity_type = filters.entity_type;
      if (filters.user_id) params.user_id = filters.user_id;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const response = await api.get('/admin/audit-logs', { params });
      setLogs(response.data.logs);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Erro ao carregar logs de auditoria');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'ID', 'Data/Hora', 'Usuário', 'Email', 'Ação', 'Tipo',
      'ID Entidade', 'Resumo', 'IP', 'Navegador'
    ];

    const csvData = logs.map(log => [
      log.id,
      formatBrazilianDateTime(log.created_at),
      log.user_name || '-',
      log.user_email || '-',
      log.action,
      log.entity_type,
      log.entity_id || '-',
      log.changes_summary || '-',
      log.ip_address || '-',
      log.user_agent || '-',
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exportados com sucesso!');
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <PlusCircle className="w-4 h-4 text-green-600" />;
      case 'update':
        return <FileEdit className="w-4 h-4 text-blue-600" />;
      case 'delete':
        return <Trash2 className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActionBadge = (action: string) => {
    const colors = {
      create: 'bg-green-100 text-green-700',
      update: 'bg-blue-100 text-blue-700',
      delete: 'bg-red-100 text-red-700',
    };
    return colors[action as keyof typeof colors] || 'bg-muted text-foreground';
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              Logs de Auditoria
            </h1>
            <p className="text-muted-foreground mt-2">
              Histórico completo de ações realizadas na plataforma
            </p>
          </div>

          {/* Actions Bar */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    showFilters
                      ? 'bg-blue-50 border-blue-600 text-blue-600'
                      : 'border-border text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filtros
                </button>
                <p className="text-sm text-muted-foreground">
                  Total: <strong>{pagination.total}</strong> registros
                </p>
              </div>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Ação
                    </label>
                    <select
                      value={filters.action}
                      onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                    >
                      <option value="">Todas</option>
                      <option value="create">Criação</option>
                      <option value="update">Atualização</option>
                      <option value="delete">Exclusão</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Tipo de Entidade
                    </label>
                    <select
                      value={filters.entity_type}
                      onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                    >
                      <option value="">Todos</option>
                      <option value="document">Documento</option>
                      <option value="transaction">Transação</option>
                      <option value="user">Usuário</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Data Início
                    </label>
                    <input
                      type="date"
                      value={filters.date_from}
                      onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Data Fim
                    </label>
                    <input
                      type="date"
                      value={filters.date_to}
                      onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-end">
                    <button
                      onClick={() => setFilters({ action: '', entity_type: '', user_id: '', date_from: '', date_to: '' })}
                      className="px-4 py-2 text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      Limpar Filtros
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Logs Table */}
          <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum log encontrado</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Data/Hora
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Usuário
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Ação
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Resumo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          IP
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Detalhes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3 text-sm text-foreground">
                            {formatBrazilianDateTime(log.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-foreground">
                              {log.user_name || 'Desconhecido'}
                            </div>
                            <div className="text-xs text-muted-foreground">{log.user_email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${getActionBadge(log.action)}`}>
                              {getActionIcon(log.action)}
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {log.entity_type}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                            {log.changes_summary || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {log.ip_address || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Eye className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-4 py-3 border-t border-border bg-muted flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Página {pagination.page} de {pagination.total_pages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-card"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                      disabled={pagination.page >= pagination.total_pages}
                      className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-card"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-card rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-foreground mb-4">Detalhes do Log</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">ID</p>
                <p className="text-foreground">{selectedLog.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data/Hora</p>
                <p className="text-foreground">{formatBrazilianDateTime(selectedLog.created_at)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Usuário</p>
                <p className="text-foreground">{selectedLog.user_name} ({selectedLog.user_email})</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ação</p>
                <p className="text-foreground">{selectedLog.action}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tipo de Entidade</p>
                <p className="text-foreground">{selectedLog.entity_type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">ID da Entidade</p>
                <p className="text-foreground">{selectedLog.entity_id || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">IP</p>
                <p className="text-foreground">{selectedLog.ip_address || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">ID do Documento</p>
                <p className="text-foreground">{selectedLog.document_id || '-'}</p>
              </div>
            </div>

            {selectedLog.user_agent && (
              <div className="mb-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">Navegador</p>
                <p className="text-sm text-foreground font-mono bg-muted p-2 rounded">
                  {selectedLog.user_agent}
                </p>
              </div>
            )}

            {selectedLog.changes_summary && (
              <div className="mb-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">Resumo das Alterações</p>
                <p className="text-foreground bg-blue-50 p-3 rounded">{selectedLog.changes_summary}</p>
              </div>
            )}

            {selectedLog.before_value && (
              <div className="mb-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">Valor Anterior</p>
                <pre className="text-sm bg-muted p-3 rounded overflow-x-auto text-foreground">
                  {JSON.stringify(JSON.parse(selectedLog.before_value), null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.after_value && (
              <div className="mb-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">Valor Posterior</p>
                <pre className="text-sm bg-muted p-3 rounded overflow-x-auto text-foreground">
                  {JSON.stringify(JSON.parse(selectedLog.after_value), null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <ProtectedRoute>
      <AuditLogsPageContent />
    </ProtectedRoute>
  );
}
