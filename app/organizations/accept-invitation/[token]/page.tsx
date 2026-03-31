'use client';

/**
 * Accept Organization Invitation Page
 * For EXISTING users being invited to join another organization.
 * Shows org details, role, and accept/decline buttons.
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Building2,
  User,
  Shield,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { orgApiClient, type InvitationDetail } from '@/lib/org-api';
import { authTokens } from '@/lib/auth-api';

// Role display config
const ROLE_DISPLAY: Record<string, { label: string; description: string; icon: string }> = {
  admin: {
    label: 'Administrador',
    description: 'Acesso completo exceto gerenciamento de assinatura',
    icon: '🛡️',
  },
  accountant: {
    label: 'Contador',
    description: 'Acesso completo a documentos e relatórios avançados',
    icon: '📊',
  },
  bookkeeper: {
    label: 'Auxiliar Contábil',
    description: 'Pode criar e editar documentos, relatórios básicos',
    icon: '📝',
  },
  viewer: {
    label: 'Visualizador',
    description: 'Acesso somente leitura a documentos e relatórios',
    icon: '👁️',
  },
  api_user: {
    label: 'Usuário API',
    description: 'Acesso programático via API keys',
    icon: '🔑',
  },
};

export default function AcceptOrgInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const token = params.token as string;

  const [isLoading, setIsLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Fetch invitation details
  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const data = await orgApiClient.getInvitationDetails(token);
        setInvitation(data);
      } catch (error: any) {
        setError(
          error.response?.data?.detail ||
            'Convite inválido ou expirado. Entre em contato com o administrador.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchInvitation();
    }
  }, [token]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !isLoading) {
      // Save the invitation URL so after login they get redirected back
      sessionStorage.setItem('redirect_after_login', `/organizations/accept-invitation/${token}`);
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, isLoading, token, router]);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      const response = await orgApiClient.acceptInvitation(token);

      // Update tokens with new org-scoped ones
      authTokens.setTokens(response.access_token, response.refresh_token);

      setAccepted(true);
      toast.success(response.message);

      // Redirect to dashboard after brief delay
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || 'Erro ao aceitar convite. Tente novamente.'
      );
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    try {
      await orgApiClient.declineInvitation(token);
      toast.info('Convite recusado.');
      router.push('/');
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || 'Erro ao recusar convite. Tente novamente.'
      );
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getRoleDisplay = (role: string) => {
    return (
      ROLE_DISPLAY[role] || {
        label: role,
        description: 'Função personalizada',
        icon: '👤',
      }
    );
  };

  // Loading state
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando convite...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Convite Inválido
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all"
          >
            Ir para o Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Expired invitation
  if (invitation.is_expired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Convite Expirado
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Este convite expirou em {formatDate(invitation.expires_at)}.
            Solicite um novo convite ao administrador da empresa.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all"
          >
            Ir para o Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Convite Aceito!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Você agora é membro da empresa <strong>{invitation.organization_name}</strong>.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Redirecionando para o dashboard...
          </p>
        </div>
      </div>
    );
  }

  const roleDisplay = getRoleDisplay(invitation.role);

  // Main invitation view
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-center">
          <Building2 className="w-16 h-16 text-white mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Nova Empresa</h1>
          <p className="text-indigo-100">Você foi convidado para participar</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Organization Details */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-lg p-6 mb-6 border-2 border-indigo-200 dark:border-indigo-800">
            <div className="space-y-4">
              <div className="flex items-center">
                <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Empresa</p>
                  <p className="font-bold text-lg text-gray-900 dark:text-white">
                    {invitation.organization_name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    CNPJ: {invitation.organization_cnpj}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Convidado por</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {invitation.inviter_name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {invitation.inviter_email}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Função</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {roleDisplay.icon} {roleDisplay.label}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {roleDisplay.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Convite expira em{' '}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatDate(invitation.expires_at)}
                </span>
              </p>
            </div>
          </div>

          {/* Current user info */}
          {user && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Logado como{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{user.email}</span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all text-lg disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Aceitar Convite
                </>
              )}
            </button>

            <button
              onClick={handleDecline}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              <XCircle className="w-5 h-5" />
              Recusar
            </button>
          </div>

          <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-500">
            Ao aceitar, você será redirecionado para o dashboard da nova empresa.
          </p>
        </div>
      </div>
    </div>
  );
}
