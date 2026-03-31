'use client';

/**
 * Organization Dashboard
 * Shows organization-level statistics and team activity
 * Displays: team members, documents, and recent activity within the organization
 * For organization owners and admins to monitor their team's usage
 *
 * Note: All data is tenant-scoped - only shows data for the current organization
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/layout/Sidebar';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { FileText, Users, TrendingUp, Clock } from 'lucide-react';
import { FullPageLoading } from '@/components/ui/loading';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { formatBrazilianDate } from '@/lib/date-utils';

interface OrgStats {
  users: {
    total: number;
    active: number;
    verified: number;
    new_this_week: number;
  };
  documents: {
    total: number;
    completed: number;
    processing: number;
    new_this_week: number;
  };
  // Removed: subscriptions (org only has 1), contacts (system-wide)
}

interface RecentUser {
  id: number;
  email: string;
  full_name: string | null;
  company_name: string | null;
  created_at: string;
  last_login: string | null;
}

interface RecentDocument {
  id: number;
  file_name: string;
  file_type: string;
  status: string;
  upload_date: string;
  user_email: string | null;
}

interface RecentContact {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  submitted_date: string;
  read: boolean;
}

interface RecentActivity {
  recent_users: RecentUser[];
  recent_documents: RecentDocument[];
  // recent_contacts not shown - they're system-wide, not org-specific
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [activity, setActivity] = useState<RecentActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if not owner or admin
    const canAccessAdmin = user?.role === 'owner' || user?.role === 'admin';

    if (!authLoading && (!user || !canAccessAdmin)) {
      toast.error('Acesso negado. Apenas proprietários e administradores podem acessar esta página.');
      router.push('/');
      return;
    }

    if (user && canAccessAdmin) {
      loadAdminData();
    }
  }, [user, authLoading, router]);

  const loadAdminData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load stats and activity in parallel
      const [statsResponse, activityResponse] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/recent-activity')
      ]);

      setStats(statsResponse.data);
      setActivity(activityResponse.data);
    } catch (err: any) {
      console.error('Error loading admin data:', err);
      setError(err.response?.data?.detail || 'Falha ao carregar dados administrativos');
      toast.error('Erro ao carregar dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  // Access denied state
  const canAccessAdmin = user?.role === 'owner' || user?.role === 'admin';

  if (!authLoading && !canAccessAdmin) {
    return null; // ProtectedRoute will handle redirect
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 ml-0 lg:ml-64">
          <div className="max-w-7xl mx-auto py-8 px-4">

        {/* Loading State */}
        {(authLoading || isLoading) && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-purple-600 dark:border-purple-400 border-r-transparent"></div>
              <p className="mt-4 text-muted-foreground">Carregando dashboard...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !stats && !isLoading && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full border border-border">
              <div className="text-center">
                <div className="text-destructive text-6xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Erro</h2>
                <p className="text-muted-foreground mb-6">{error}</p>
                <button
                  onClick={loadAdminData}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && stats && (
          <>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            📊 Painel da Empresa
          </h1>
          <p className="text-muted-foreground mt-2">
            Visão geral da sua equipe e atividades
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Team Members Card */}
            <div className="bg-card rounded-lg shadow-lg p-6 border-t-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Membros da Equipe</p>
                  <h3 className="text-3xl font-bold text-foreground mt-1">
                    {stats.users.total}
                  </h3>
                </div>
                <div className="bg-blue-500/20 rounded-full p-3">
                  <span className="text-blue-600 dark:text-blue-400 text-2xl">👥</span>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-sm">
                <p className="text-muted-foreground">
                  <span className="text-green-600 dark:text-green-400 font-medium">{stats.users.active}</span> ativos
                </p>
                <p className="text-muted-foreground">
                  <span className="text-blue-600 dark:text-blue-400 font-medium">{stats.users.verified}</span> verificados
                </p>
                <p className="text-muted-foreground">
                  <span className="text-purple-600 dark:text-purple-400 font-medium">{stats.users.new_this_week}</span> novos (7 dias)
                </p>
              </div>
            </div>

            {/* Documents Card */}
            <div className="bg-card rounded-lg shadow-lg p-6 border-t-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Documentos</p>
                  <h3 className="text-3xl font-bold text-foreground mt-1">
                    {stats.documents.total}
                  </h3>
                </div>
                <div className="bg-purple-500/20 rounded-full p-3">
                  <span className="text-purple-600 dark:text-purple-400 text-2xl">📄</span>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-sm">
                <p className="text-muted-foreground">
                  <span className="text-green-600 dark:text-green-400 font-medium">{stats.documents.completed}</span> completos
                </p>
                <p className="text-muted-foreground">
                  <span className="text-orange-600 dark:text-orange-400 font-medium">{stats.documents.processing}</span> processando
                </p>
                <p className="text-muted-foreground">
                  <span className="text-purple-600 dark:text-purple-400 font-medium">{stats.documents.new_this_week}</span> novos (7 dias)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {activity && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Team Members */}
            <div className="bg-card rounded-lg shadow-lg p-6 border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                👤 Membros Recentes
              </h3>
              <div className="space-y-3">
                {activity.recent_users.slice(0, 5).map((user) => (
                  <div
                    key={user.id}
                    className="border-l-4 border-blue-500 pl-3 py-2 hover:bg-muted/50 transition-colors"
                  >
                    <p className="font-medium text-foreground">{user.email}</p>
                    <p className="text-sm text-muted-foreground">{user.full_name || 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground">
                      Último acesso: {user.last_login ? formatBrazilianDate(user.last_login) : formatBrazilianDate(user.created_at)}
                    </p>
                  </div>
                ))}
                {activity.recent_users.length === 0 && (
                  <p className="text-muted-foreground text-sm">Nenhum membro recente</p>
                )}
              </div>
            </div>

            {/* Recent Documents */}
            <div className="bg-card rounded-lg shadow-lg p-6 border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                📄 Documentos Recentes
              </h3>
              <div className="space-y-3">
                {activity.recent_documents.slice(0, 5).map((doc) => (
                  <div
                    key={doc.id}
                    className="border-l-4 border-purple-500 pl-3 py-2 hover:bg-muted/50 transition-colors"
                  >
                    <p className="font-medium text-foreground truncate" title={doc.file_name}>
                      {doc.file_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {doc.user_email || 'Usuário desconhecido'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          doc.status === 'completed'
                            ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                            : doc.status === 'processing'
                            ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                            : doc.status === 'failed'
                            ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {doc.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatBrazilianDate(doc.upload_date)}
                      </span>
                    </div>
                  </div>
                ))}
                {activity.recent_documents.length === 0 && (
                  <p className="text-muted-foreground text-sm">Nenhum documento recente</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/admin/audit-logs')}
            className="bg-card hover:bg-muted border border-border rounded-lg p-4 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <h3 className="font-semibold text-foreground">Logs de Auditoria</h3>
                <p className="text-sm text-muted-foreground">Ver todas as ações da equipe</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => router.push('/admin/users')}
            className="bg-card hover:bg-muted border border-border rounded-lg p-4 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <div>
                <h3 className="font-semibold text-foreground">Gerenciar Membros</h3>
                <p className="text-sm text-muted-foreground">Ver detalhes e último acesso</p>
              </div>
            </div>
          </button>
        </div>

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={loadAdminData}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Atualizando...' : '🔄 Atualizar Dados'}
          </button>
        </div>
          </>
        )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
