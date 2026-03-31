'use client';

import { useState } from 'react';
import { Mail, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authApiClient } from '@/lib/auth-api';
import { toast } from 'sonner';

export default function EmailVerificationBanner() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Don't show if: not authenticated, loading, already verified, or dismissed
  if (!isAuthenticated || isLoading || !user || user.is_verified || dismissed) {
    return null;
  }

  const handleResend = async () => {
    setSending(true);
    try {
      await authApiClient.resendVerificationEmail(user.email);
      setSent(true);
      toast.success('E-mail de verificação reenviado! Verifique sua caixa de entrada.');
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Erro ao reenviar e-mail';
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg">
      <div className="max-w-screen-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Mail className="w-5 h-5 text-white flex-shrink-0" />
            <div className="flex-1">
              <p className="text-white font-semibold text-sm md:text-base">
                Verifique seu e-mail
              </p>
              <p className="text-white/90 text-xs md:text-sm">
                Enviamos um link de verificação para <strong>{user.email}</strong>.
                {' '}O link expira em 24 horas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {sent ? (
              <span className="flex items-center gap-2 text-white font-semibold text-sm bg-white/20 px-4 py-2 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
                Enviado!
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={sending}
                className="bg-white hover:bg-gray-100 text-orange-700 font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${sending ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">
                  {sending ? 'Enviando...' : 'Reenviar E-mail'}
                </span>
                <span className="sm:hidden">
                  {sending ? '...' : 'Reenviar'}
                </span>
              </button>
            )}

            <button
              onClick={() => setDismissed(true)}
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
