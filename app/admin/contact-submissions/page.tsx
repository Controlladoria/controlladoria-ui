'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import { toast } from 'sonner';
import {
  Mail, Eye, EyeOff, Phone, User, Calendar, MessageSquare, CheckCircle
} from 'lucide-react';

interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  submitted_date: string;
  read: boolean;
  ip_address: string | null;
}

function AdminContactSubmissionsContent() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Check if user is owner or admin
  const canViewSubmissions = user?.role === 'owner' || user?.role === 'admin';

  if (!canViewSubmissions) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
            <p className="text-gray-600">Apenas proprietários e administradores podem acessar as mensagens de contato.</p>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/contact/submissions');
      setSubmissions(response.data.submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Erro ao carregar mensagens de contato');
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (submissionId: number) => {
    try {
      await api.patch(`/contact/submissions/${submissionId}/mark-read`);
      toast.success('Mensagem marcada como lida');
      fetchSubmissions();
      if (selectedSubmission?.id === submissionId) {
        setSelectedSubmission({ ...selectedSubmission, read: true });
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Erro ao marcar mensagem como lida');
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

  const filteredSubmissions = submissions.filter((submission) => {
    if (filter === 'unread') return !submission.read;
    if (filter === 'read') return submission.read;
    return true;
  });

  const unreadCount = submissions.filter((s) => !s.read).length;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Mail className="w-8 h-8 text-blue-600" />
              Mensagens de Contato
            </h1>
            <p className="text-gray-600 mt-2">
              Visualize e gerencie mensagens enviadas através do formulário de contato
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Mensagens</p>
                  <p className="text-2xl font-bold text-gray-900">{submissions.length}</p>
                </div>
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Não Lidas</p>
                  <p className="text-2xl font-bold text-red-600">{unreadCount}</p>
                </div>
                <EyeOff className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Lidas</p>
                  <p className="text-2xl font-bold text-green-600">{submissions.length - unreadCount}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Filtrar:</span>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todas ({submissions.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'unread'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Não Lidas ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'read'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Lidas ({submissions.length - unreadCount})
              </button>
            </div>
          </div>

          {/* Submissions List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhuma mensagem encontrada</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !submission.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedSubmission(submission)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold text-gray-900">{submission.name}</span>
                          </div>
                          {!submission.read && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                              Nova
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {submission.email}
                          </div>
                          {submission.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              {submission.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(submission.submitted_date)}
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-gray-700">
                          <MessageSquare className="w-4 h-4 mt-0.5 text-gray-400" />
                          <p className="line-clamp-2">{submission.message}</p>
                        </div>
                      </div>
                      {!submission.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(submission.id);
                          }}
                          className="ml-4 flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Marcar como lida
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Mensagem de Contato</h3>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Nome</p>
                      <p className="text-gray-900">{selectedSubmission.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Email</p>
                      <p className="text-gray-900">{selectedSubmission.email}</p>
                    </div>
                    {selectedSubmission.phone && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Telefone</p>
                        <p className="text-gray-900">{selectedSubmission.phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Data de Envio</p>
                      <p className="text-gray-900">{formatDate(selectedSubmission.submitted_date)}</p>
                    </div>
                    {selectedSubmission.ip_address && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">IP Address</p>
                        <p className="text-gray-900 font-mono text-sm">{selectedSubmission.ip_address}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Mensagem</p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedSubmission.message}</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  {!selectedSubmission.read && (
                    <button
                      onClick={() => markAsRead(selectedSubmission.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Marcar como Lida
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedSubmission(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminContactSubmissionsPage() {
  return (
    <ProtectedRoute>
      <AdminContactSubmissionsContent />
    </ProtectedRoute>
  );
}
