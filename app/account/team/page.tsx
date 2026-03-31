'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import {
  Users,
  Mail,
  UserPlus,
  Trash2,
  RefreshCw,
  X,
  Calendar,
  Crown,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

interface TeamMember {
  id: number;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

interface PendingInvitation {
  id: number;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

interface SeatUsage {
  used: number;
  pending: number;
  total_used: number;
  max: number;
  available: number;
}

function TeamPageContent() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [seatUsage, setSeatUsage] = useState<SeatUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [isInviting, setIsInviting] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [removeMemberConfirmOpen, setRemoveMemberConfirmOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: number; name: string } | null>(null);
  const [cancelInviteConfirmOpen, setCancelInviteConfirmOpen] = useState(false);
  const [invitationToCancel, setInvitationToCancel] = useState<{ id: number; email: string } | null>(null);

  const fetchTeamData = async () => {
    try {
      const response = await api.get('/team/members');
      setMembers(response.data.members || []);
      setPendingInvitations(response.data.pending_invitations || []);
      setSeatUsage(response.data.seats || null);
    } catch (error: any) {
      console.error('Error fetching team data:', error);
      toast.error('Erro ao carregar equipe');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTeamData();
    }
  }, [user]);

  // Calculate available seats
  const availableSeats = seatUsage ? seatUsage.max - seatUsage.used : 0;

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast.error('Por favor, insira um e-mail válido');
      return;
    }

    setIsInviting(true);
    try {
      await api.post('/team/invite', null, {
        params: { email: inviteEmail, role: inviteRole },
      });
      toast.success('Convite enviado com sucesso!');
      setInviteEmail('');
      setInviteRole('viewer');
      setIsInviteModalOpen(false);
      fetchTeamData();
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast.error(error.response?.data?.detail || 'Erro ao enviar convite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMemberClick = (memberId: number, memberName: string) => {
    setMemberToRemove({ id: memberId, name: memberName });
    setRemoveMemberConfirmOpen(true);
  };

  const handleRemoveMemberConfirm = async () => {
    if (!memberToRemove) return;

    setRemovingMemberId(memberToRemove.id);
    try {
      await api.delete(`/team/members/${memberToRemove.id}`);
      toast.success('Membro removido com sucesso');
      fetchTeamData();
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error(error.response?.data?.detail || 'Erro ao remover membro');
    } finally {
      setRemovingMemberId(null);
      setMemberToRemove(null);
    }
  };

  const handleCancelInvitationClick = (invitationId: number, email: string) => {
    setInvitationToCancel({ id: invitationId, email });
    setCancelInviteConfirmOpen(true);
  };

  const handleCancelInvitationConfirm = async () => {
    if (!invitationToCancel) return;

    try {
      await api.delete(`/team/invitations/${invitationToCancel.id}`);
      toast.success('Convite cancelado');
      fetchTeamData();
    } catch (error: any) {
      console.error('Error canceling invitation:', error);
      toast.error(error.response?.data?.detail || 'Erro ao cancelar convite');
    } finally {
      setInvitationToCancel(null);
    }
  };

  const handleResendInvitation = async (invitationId: number, email: string) => {
    try {
      await api.post(`/team/invitations/${invitationId}/resend`);
      toast.success(`Convite reenviado para ${email}`);
      fetchTeamData();
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      toast.error(error.response?.data?.detail || 'Erro ao reenviar convite');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Check if user can manage team (owner or admin only)
  const canManageTeam = user.role === 'owner' || user.role === 'admin';

  if (!canManageTeam) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-background via-accent/20 to-accent/40 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden lg:pt-0">
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
            <div className="bg-card rounded-xl shadow-xl p-8 text-center max-w-md border border-border">
              <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito</h2>
              <p className="text-muted-foreground">
                Apenas proprietários e administradores podem acessar o gerenciamento de equipe.
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-accent/20 to-accent/40 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden lg:pt-0">
        {/* Top Header */}
        <header className="bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 pt-16 lg:pt-4 pb-4 sm:py-6">
            <div className="text-center lg:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">👥 Gerenciar Equipe</h1>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-1">
                Convide membros e gerencie acessos
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <>
                {/* Seat Usage Card */}
                {seatUsage && (
                  <div className="bg-card rounded-xl shadow-lg p-6 mb-6 border-2 border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">Uso de Licenças</h3>
                        <p className="text-muted-foreground">
                          {seatUsage.total_used} de {seatUsage.max} em uso
                          {seatUsage.pending > 0 && ` (${seatUsage.pending} convites pendentes)`}
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          if (availableSeats === 0) return;
                          setIsInviteModalOpen(true);
                        }}
                        disabled={availableSeats === 0}
                        className={
                          availableSeats === 0
                            ? '!bg-gray-400 dark:!bg-gray-600 !text-gray-100 dark:!text-gray-300 !cursor-not-allowed !opacity-100'
                            : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                        }
                        title={availableSeats === 0 ? 'Todas as licenças estão em uso. Faça upgrade para adicionar mais membros.' : 'Convidar novo membro'}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        {availableSeats === 0 ? 'Sem Vagas Disponíveis' : 'Convidar Membro'}
                      </Button>
                    </div>
                    <div className="mt-4">
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-300"
                          style={{ width: `${(seatUsage.total_used / seatUsage.max) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    {availableSeats === 0 && (
                      <div className="mt-4 p-3 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 dark:border-amber-500/30 rounded-lg">
                        <p className="text-sm text-amber-800 dark:text-amber-400">
                          ⚠️ Todas as licenças estão em uso. Faça upgrade do seu plano para adicionar mais membros.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Active Members Card */}
                <div className="bg-card rounded-xl shadow-lg p-6 mb-6 border-2 border-border">
                  <div className="flex items-center mb-6">
                    <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mr-2" />
                    <h2 className="text-2xl font-bold text-foreground">Membros Ativos</h2>
                    <span className="ml-3 px-3 py-1 bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-full text-sm font-semibold">
                      {members.length + 1}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Admin (current user) */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 dark:from-purple-500/20 dark:to-indigo-500/20 rounded-lg border-2 border-indigo-500/20 dark:border-indigo-500/30">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                          {user.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center">
                            <p className="font-semibold text-foreground">{user.full_name}</p>
                            <Crown className="w-4 h-4 text-amber-500 ml-2" />
                            <span className="ml-2 px-4 py-2 bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded text-base font-bold">
                              ADMIN
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">Você</div>
                    </div>

                    {/* Team Members */}
                    {members.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                        <p>Nenhum membro na equipe ainda.</p>
                        <p className="text-sm mt-1">Convide pessoas para colaborar!</p>
                      </div>
                    ) : (
                      members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border hover:border-accent transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-lg">
                              {member.full_name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground">{member.full_name}</p>
                                {member.role && (
                                  <span className={`px-4 py-2 text-base font-bold rounded ${
                                    member.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                                    member.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                                    member.role === 'accountant' ? 'bg-green-100 text-green-700' :
                                    member.role === 'bookkeeper' ? 'bg-cyan-100 text-cyan-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {member.role === 'owner' && '👑 Proprietário'}
                                    {member.role === 'admin' && '🛡️ Admin'}
                                    {member.role === 'accountant' && '📊 Contador'}
                                    {member.role === 'bookkeeper' && '📝 Auxiliar'}
                                    {member.role === 'viewer' && '👁️ Visualizador'}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Adicionado em {formatDate(member.created_at)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMemberClick(member.id, member.full_name)}
                            disabled={removingMemberId === member.id}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Pending Invitations Card */}
                {pendingInvitations.length > 0 && (
                  <div className="bg-card rounded-xl shadow-lg p-6 border-2 border-border">
                    <div className="flex items-center mb-6">
                      <Mail className="w-6 h-6 text-amber-600 dark:text-amber-400 mr-2" />
                      <h2 className="text-2xl font-bold text-foreground">Convites Pendentes</h2>
                      <span className="ml-3 px-3 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full text-sm font-semibold">
                        {pendingInvitations.length}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {pendingInvitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between p-4 bg-amber-500/10 dark:bg-amber-500/20 rounded-lg border border-amber-500/20 dark:border-amber-500/30"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center">
                              <Clock className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground">{invitation.email}</p>
                                {invitation.role && (
                                  <span className={`px-4 py-2 text-base font-bold rounded ${
                                    invitation.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                                    invitation.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                                    invitation.role === 'accountant' ? 'bg-green-100 text-green-700' :
                                    invitation.role === 'bookkeeper' ? 'bg-cyan-100 text-cyan-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {invitation.role === 'owner' && '👑 Proprietário'}
                                    {invitation.role === 'admin' && '🛡️ Admin'}
                                    {invitation.role === 'accountant' && '📊 Contador'}
                                    {invitation.role === 'bookkeeper' && '📝 Auxiliar'}
                                    {invitation.role === 'viewer' && '👁️ Visualizador'}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Enviado em {formatDate(invitation.created_at)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Expira em {formatDate(invitation.expires_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendInvitation(invitation.id, invitation.email)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-500/10"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelInvitationClick(invitation.id, invitation.email)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-md w-full p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground">Convidar Membro</h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-muted-foreground mb-4">
              Digite o e-mail e selecione a função para o novo membro.
            </p>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  E-mail
                </label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendInvite()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Função
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="viewer">👁️ Visualizador</option>
                  <option value="bookkeeper">📝 Auxiliar Contábil</option>
                  <option value="accountant">📊 Contador</option>
                  {user?.role === 'owner' && (
                    <>
                      <option value="admin">🛡️ Administrador</option>
                      <option value="owner">👑 Proprietário</option>
                    </>
                  )}
                </select>

                {/* Role Description */}
                <div className="mt-3 p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg border border-blue-500/20 dark:border-blue-500/30">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
                    {inviteRole === 'viewer' && '👁️ Visualizador - Somente Leitura'}
                    {inviteRole === 'bookkeeper' && '📝 Auxiliar Contábil - Criar e Editar'}
                    {inviteRole === 'accountant' && '📊 Contador - Acesso Completo a Finanças'}
                    {inviteRole === 'admin' && '🛡️ Administrador - Gerenciar Tudo Exceto Assinatura'}
                    {inviteRole === 'owner' && '👑 Proprietário - Controle Total'}
                  </p>
                  <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1 ml-4 list-disc">
                    {inviteRole === 'viewer' && (
                      <>
                        <li>Visualizar documentos, notas fiscais e relatórios</li>
                        <li>Ver clientes e fornecedores</li>
                        <li><strong>Não pode criar, editar ou excluir nada</strong></li>
                      </>
                    )}
                    {inviteRole === 'bookkeeper' && (
                      <>
                        <li>Criar, editar e visualizar documentos financeiros</li>
                        <li>Visualizar relatórios básicos</li>
                        <li>Ver clientes e fornecedores</li>
                        <li><strong>Não pode excluir ou gerenciar equipe</strong></li>
                      </>
                    )}
                    {inviteRole === 'accountant' && (
                      <>
                        <li>Acesso completo a todos os documentos financeiros</li>
                        <li>Criar, editar e excluir documentos e notas</li>
                        <li>Acessar todos os relatórios e análises avançadas</li>
                        <li>Gerenciar clientes e fornecedores</li>
                        <li><strong>Não pode gerenciar equipe ou assinatura</strong></li>
                      </>
                    )}
                    {inviteRole === 'admin' && (
                      <>
                        <li>Acesso completo a documentos, relatórios e clientes</li>
                        <li>Convidar e remover membros da equipe</li>
                        <li>Acessar dashboard administrativo e logs de auditoria</li>
                        <li><strong>Não pode gerenciar assinatura e cobrança</strong></li>
                      </>
                    )}
                    {inviteRole === 'owner' && (
                      <>
                        <li><strong>Controle total da empresa</strong></li>
                        <li>Todos os acessos de Administrador</li>
                        <li>Gerenciar assinatura e método de pagamento</li>
                        <li>Cancelar ou fazer upgrade do plano</li>
                        <li><strong>Atenção: Use apenas para co-proprietários</strong></li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => setIsInviteModalOpen(false)}
                variant="outline"
                className="flex-1"
                disabled={isInviting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSendInvite}
                disabled={isInviting || !inviteEmail}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                {isInviting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar Convite
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={removeMemberConfirmOpen}
        onClose={() => {
          setRemoveMemberConfirmOpen(false);
          setMemberToRemove(null);
        }}
        onConfirm={handleRemoveMemberConfirm}
        title="Remover Membro"
        message={`Tem certeza que deseja remover ${memberToRemove?.name || 'este membro'} da equipe? Esta ação não pode ser desfeita.`}
        confirmText="Remover"
        cancelText="Cancelar"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={cancelInviteConfirmOpen}
        onClose={() => {
          setCancelInviteConfirmOpen(false);
          setInvitationToCancel(null);
        }}
        onConfirm={handleCancelInvitationConfirm}
        title="Cancelar Convite"
        message={`Tem certeza que deseja cancelar o convite para ${invitationToCancel?.email || 'este email'}?`}
        confirmText="Cancelar Convite"
        cancelText="Voltar"
        variant="warning"
      />
    </div>
  );
}

export default function TeamPage() {
  return (
    <ProtectedRoute>
      <TeamPageContent />
    </ProtectedRoute>
  );
}
