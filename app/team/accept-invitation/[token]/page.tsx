'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Mail,
  Building2,
  User,
  Lock,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface InvitationDetails {
  email: string;
  inviter_name: string;
  company_name: string;
  expires_at: string;
}

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [isLoading, setIsLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const fetchInvitationDetails = async () => {
      try {
        const response = await axios.get(`${API_URL}/team/invitations/${token}`);
        setInvitation(response.data);
      } catch (error: any) {
        console.error('Error fetching invitation:', error);
        setError(
          error.response?.data?.detail ||
            'Convite inválido ou expirado. Entre em contato com o administrador.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchInvitationDetails();
    }
  }, [token]);

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.full_name.trim()) {
      toast.error('Por favor, insira seu nome completo');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsAccepting(true);
    try {
      await axios.post(`${API_URL}/team/invitations/${token}/accept`, {
        full_name: formData.full_name,
        password: formData.password,
      });

      toast.success('Conta criada com sucesso! Faça login para continuar.');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(
        error.response?.data?.detail || 'Erro ao aceitar convite. Tente novamente.'
      );
      setIsAccepting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando convite...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Convite Inválido</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/login">
            <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
              Ir para Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-white mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Você foi convidado!</h1>
          <p className="text-green-100">Aceite o convite para fazer parte da equipe</p>
        </div>

        {/* Invitation Details */}
        <div className="p-8">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 mb-8 border-2 border-green-200">
            <div className="space-y-4">
              <div className="flex items-center">
                <Building2 className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Empresa</p>
                  <p className="font-semibold text-gray-900">{invitation.company_name}</p>
                </div>
              </div>

              <div className="flex items-center">
                <User className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Convidado por</p>
                  <p className="font-semibold text-gray-900">{invitation.inviter_name}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Mail className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">E-mail</p>
                  <p className="font-semibold text-gray-900">{invitation.email}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-green-200">
              <p className="text-sm text-gray-600">
                Este convite expira em{' '}
                <span className="font-semibold text-gray-900">
                  {formatDate(invitation.expires_at)}
                </span>
              </p>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleAcceptInvitation} className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Complete seu cadastro</h2>
              <p className="text-gray-600 text-sm mb-6">
                Crie sua senha para acessar a plataforma
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Seu nome completo"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  placeholder="Digite a senha novamente"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isAccepting}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 text-lg"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Criando conta...
                </>
              ) : (
                <>
                  Aceitar Convite e Criar Conta
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{' '}
              <Link
                href="/login"
                className="text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
