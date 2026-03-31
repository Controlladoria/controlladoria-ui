'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import { toast } from 'sonner';
import { Monitor, Smartphone, Tablet, MapPin, Clock, Trash2, LogOut, AlertTriangle } from 'lucide-react';

interface Session {
  id: string;
  device_type: string;
  device_os: string;
  device_name: string;
  browser: string;
  ip_address: string;
  created_at: string;
  last_activity: string;
  expires_at: string;
  is_active: boolean;
}

function SessionsPageContent() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [showRevokeAllModal, setShowRevokeAllModal] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await api.get('/auth/sessions');
      setSessions(response.data.sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Erro ao carregar sessões');
    } finally {
      setIsLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      toast.success('Sessão revogada com sucesso');
      await fetchSessions();
    } catch (error) {
      console.error('Error revoking session:', error);
      toast.error('Erro ao revogar sessão');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const revokeAllSessions = async () => {
    try {
      const response = await api.delete('/auth/sessions', {
        params: { except_current: true }
      });
      toast.success(response.data.message);
      setShowRevokeAllModal(false);
      await fetchSessions();
    } catch (error) {
      console.error('Error revoking all sessions:', error);
      toast.error('Erro ao revogar todas as sessões');
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-5 h-5" />;
      case 'tablet':
        return <Tablet className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Monitor className="w-8 h-8 text-blue-600" />
              Sessões Ativas
            </h1>
            <p className="text-gray-600 mt-2">
              Gerencie os dispositivos conectados à sua conta
            </p>
          </div>

          {/* Warning about device limits */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3 flex-shrink-0" />
              <div className="text-sm text-yellow-700">
                <p className="font-semibold mb-1">Limite de Dispositivos</p>
                <p>
                  Você pode estar conectado em até <strong>2 dispositivos simultâneos</strong>:
                  1 dispositivo móvel E 1 computador (desktop/laptop/tablet).
                  O login em um terceiro dispositivo desconectará automaticamente o dispositivo mais antigo.
                </p>
              </div>
            </div>
          </div>

          {/* Sessions count and actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  Sessões ativas: <strong className="text-gray-900">{sessions.length}</strong>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Máximo permitido: 2 dispositivos (1 móvel + 1 desktop)
                </p>
              </div>
              {sessions.length > 1 && (
                <button
                  onClick={() => setShowRevokeAllModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Desconectar Todos
                </button>
              )}
            </div>
          </div>

          {/* Sessions list */}
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhuma sessão ativa encontrada</p>
              </div>
            ) : (
              sessions.map((session, index) => (
                <div
                  key={session.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Device Icon */}
                      <div className={`p-3 rounded-lg ${
                        session.device_type === 'mobile' ? 'bg-blue-100 text-blue-600' :
                        session.device_type === 'tablet' ? 'bg-purple-100 text-purple-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {getDeviceIcon(session.device_type)}
                      </div>

                      {/* Device Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {session.device_name}
                          </h3>
                          {index === 0 && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                              Atual
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>IP: {session.ip_address}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>Última atividade: {formatDate(session.last_activity)}</span>
                          </div>

                          <div>
                            <span className="text-gray-500">Sistema:</span> {session.device_os}
                          </div>

                          <div>
                            <span className="text-gray-500">Navegador:</span> {session.browser}
                          </div>

                          <div>
                            <span className="text-gray-500">Criada em:</span>{' '}
                            {new Date(session.created_at).toLocaleString('pt-BR')}
                          </div>

                          <div>
                            <span className="text-gray-500">Expira em:</span>{' '}
                            {new Date(session.expires_at).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Revoke button */}
                    <button
                      onClick={() => revokeSession(session.id)}
                      disabled={revokingSessionId === session.id}
                      className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Desconectar dispositivo"
                    >
                      {revokingSessionId === session.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Info section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">ℹ️ Sobre Sessões</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Cada sessão representa um dispositivo conectado à sua conta</li>
              <li>• Sessões expiram automaticamente após 30 dias de inatividade</li>
              <li>• Você pode desconectar dispositivos a qualquer momento</li>
              <li>• Por segurança, monitore regularmente suas sessões ativas</li>
              <li>• Se você detectar atividade suspeita, desconecte todos os dispositivos e altere sua senha imediatamente</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Revoke All Modal */}
      {showRevokeAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Desconectar Todos os Dispositivos?
            </h3>
            <p className="text-gray-600 mb-6">
              Isso desconectará todos os dispositivos, exceto o atual.
              Você precisará fazer login novamente em todos os outros dispositivos.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRevokeAllModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={revokeAllSessions}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Desconectar Todos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SessionsPage() {
  return (
    <ProtectedRoute>
      <SessionsPageContent />
    </ProtectedRoute>
  );
}
