'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import { toast } from 'sonner';
import {
  Users, Search, Filter, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Mail, Calendar, Building, User
} from 'lucide-react';

interface UserData {
  id: number;
  email: string;
  full_name: string | null;
  company_name: string | null;
  cnpj: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_admin: boolean;
  role: string;
  parent_user_id: number | null;
  created_at: string;
  trial_end_date: string | null;
  subscription_status: string | null;
}

interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

function AdminUsersPageContent() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    page_size: 50,
    total: 0,
    total_pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    is_active: '',
    is_verified: '',
    is_admin: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Check if user is owner or admin
  const canManageUsers = user?.role === 'owner' || user?.role === 'admin';

  useEffect(() => {
    if (canManageUsers && pagination) {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination?.page, filters.search, filters.is_active, filters.is_verified, filters.is_admin, canManageUsers]);

  if (!canManageUsers) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Negado</h1>
            <p className="text-muted-foreground">Apenas proprietários e administradores podem acessar o gerenciamento de usuários.</p>
          </div>
        </div>
      </div>
    );
  }

  const fetchUsers = async () => {
    if (!pagination) return;

    setIsLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        page_size: pagination.page_size,
      };

      if (filters.search) params.search = filters.search;
      if (filters.is_active) params.is_active = filters.is_active === 'true';
      if (filters.is_verified) params.is_verified = filters.is_verified === 'true';
      if (filters.is_admin) params.is_admin = filters.is_admin === 'true';

      const response = await api.get('/admin/users', { params });
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (userData: UserData) => {
    if (!userData.is_active) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">Inativo</span>;
    }
    if (!userData.is_verified) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Não Verificado</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Ativo</span>;
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                Gerenciar Usuários
              </h1>
              <p className="text-muted-foreground mt-2">
                Visualize e gerencie todos os usuários da plataforma
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Buscar
                  </label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Email, nome ou CNPJ..."
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Status
                  </label>
                  <select
                    value={filters.is_active}
                    onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                  >
                    <option value="">Todos</option>
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Verificação
                  </label>
                  <select
                    value={filters.is_verified}
                    onChange={(e) => setFilters({ ...filters, is_verified: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                  >
                    <option value="">Todos</option>
                    <option value="true">Verificado</option>
                    <option value="false">Não Verificado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tipo
                  </label>
                  <select
                    value={filters.is_admin}
                    onChange={(e) => setFilters({ ...filters, is_admin: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                  >
                    <option value="">Todos</option>
                    <option value="true">Admin</option>
                    <option value="false">Usuário</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          {pagination && (
            <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Total de usuários: <strong className="text-foreground">{pagination.total}</strong>
                </span>
                <span className="text-muted-foreground">
                  Página {pagination.page} de {pagination.total_pages}
                </span>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Empresa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Criado em
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Assinatura
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {users.map((userData) => (
                      <tr key={userData.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-foreground">
                                {userData.full_name || 'Sem nome'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {userData.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-foreground">{userData.company_name || '-'}</div>
                          <div className="text-sm text-muted-foreground">{userData.cnpj || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(userData)}
                            {userData.is_verified && (
                              <span className="flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle className="w-3 h-3" /> Verificado
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {userData.is_admin ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                              Admin
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                              Usuário
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(userData.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {userData.subscription_status ? (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              userData.subscription_status === 'active' ? 'bg-green-100 text-green-700' :
                              userData.subscription_status === 'trialing' ? 'bg-blue-100 text-blue-700' :
                              userData.subscription_status === 'past_due' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {userData.subscription_status}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sem assinatura</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-card text-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <span className="text-sm text-muted-foreground">
                Página {pagination.page} de {pagination.total_pages}
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.total_pages}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-card text-foreground"
              >
                Próxima
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <ProtectedRoute>
      <AdminUsersPageContent />
    </ProtectedRoute>
  );
}
