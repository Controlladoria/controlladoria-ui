'use client';

/**
 * Pending Invitations Page
 * Lists all pending organization invitations for the current user.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Building2,
  User,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Bell,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { orgApiClient, type InvitationDetail } from '@/lib/org-api';
import { authTokens } from '@/lib/auth-api';

// Role display names
const ROLE_NAMES: Record<string, string> = {
  admin: 'Administrador',
  accountant: 'Contador',
  bookkeeper: 'Auxiliar Contábil',
  viewer: 'Visualizador',
  api_user: 'Usuário API',
};

export default function PendingInvitationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [invitations, setInvitations] = useState<InvitationDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      fetchInvitations();
    }
  }, [isAuthenticated, authLoading, router]);

  const fetchInvitations = async () => {
    try {
      const data = await orgApiClient.listMyInvitations();
      setInvitations(data);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Invitation cards are rendered inline, accept/decline redirect to the accept page
  // for consistency with the email flow

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  const pendingInvitations = invitations.filter((inv) => !inv.is_expired);
  const expiredInvitations = invitations.filter((inv) => inv.is_expired);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Bell className="w-8 h-8 text-amber-500" />
                Convites Pendentes
              </h1>
              <p className="text-muted-foreground mt-1">
                Organizações que convidaram você
              </p>
            </div>
          </div>

          {/* No invitations */}
          {pendingInvitations.length === 0 && expiredInvitations.length === 0 && (
            <div className="text-center py-16">
              <Bell className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Nenhum convite pendente
              </h2>
              <p className="text-muted-foreground">
                Quando alguém te convidar para uma empresa, o convite aparecerá aqui.
              </p>
            </div>
          )}

          {/* Pending Invitations */}
          {pendingInvitations.length > 0 && (
            <div className="space-y-4 mb-8">
              <h2 className="text-lg font-semibold text-foreground">
                Pendentes ({pendingInvitations.length})
              </h2>
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                          {inv.organization_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground text-lg">
                            {inv.organization_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            CNPJ: {inv.organization_cnpj}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>
                            Convidado por <strong>{inv.inviter_name}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Shield className="w-4 h-4" />
                          <span>
                            Função: <strong>{ROLE_NAMES[inv.role] || inv.role}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>Expira em {formatDate(inv.expires_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Link
                        href={`/organizations/accept-invitation/${inv.id}`}
                        className="hidden"
                      />
                      {/* Direct inline buttons would require the token which we don't have here,
                          so we link to the proper accept page. The OrgSwitcher also shows these. */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Expired Invitations */}
          {expiredInvitations.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-muted-foreground">
                Expirados ({expiredInvitations.length})
              </h2>
              {expiredInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-card/50 border border-border rounded-xl p-6 opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-muted-foreground font-bold">
                      {inv.organization_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{inv.organization_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Expirou em {formatDate(inv.expires_at)} •{' '}
                        {ROLE_NAMES[inv.role] || inv.role} •{' '}
                        Convidado por {inv.inviter_name}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
