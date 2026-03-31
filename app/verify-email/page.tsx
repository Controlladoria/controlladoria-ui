'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de verificação não encontrado.');
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(data.message || 'E-mail verificado com sucesso!');
          setEmail(data.email || '');
        } else {
          setStatus('error');
          const detail = data.detail || 'Token de verificação inválido ou expirado.';
          setMessage(detail);
          // Detect expired token message
          if (detail.toLowerCase().includes('expirado')) {
            setIsExpired(true);
          }
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('Erro ao verificar e-mail. Tente novamente mais tarde.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-10 text-center">
      {/* Logo */}
      <div className="flex justify-center mb-8">
        <Image
          src="/logo-horizontal.svg"
          alt="ControlladorIA"
          width={180}
          height={50}
          priority
          className="h-14 w-auto"
        />
      </div>

      {status === 'loading' && (
        <div>
          <Loader2 className="w-16 h-16 text-[#0d767b] animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificando e-mail...</h1>
          <p className="text-gray-600">Aguarde um momento</p>
        </div>
      )}

      {status === 'success' && (
        <div>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">E-mail Verificado!</h1>
          <p className="text-gray-600 mb-2">{message}</p>
          {email && (
            <p className="text-sm text-gray-500 mb-8">{email}</p>
          )}
          <Link
            href="/login"
            className="inline-block bg-[#0d767b] hover:bg-[#095a5e] text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Fazer Login
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div>
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isExpired ? 'Link Expirado' : 'Erro na Verificação'}
          </h1>
          <p className="text-gray-600 mb-6">{message}</p>

          {/* Resend form for expired tokens */}
          {isExpired && !resent && (
            <div className="mb-6 p-4 bg-[#0d767b]/5 rounded-lg">
              <p className="text-sm text-gray-700 mb-3">
                Digite seu e-mail para receber um novo link:
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0d767b] focus:border-transparent"
                />
                <button
                  onClick={async () => {
                    if (!resendEmail) return;
                    setResending(true);
                    try {
                      await fetch(`${API_BASE_URL}/auth/resend-verification`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: resendEmail }),
                      });
                      setResent(true);
                    } catch {
                      setMessage('Erro ao reenviar. Tente novamente.');
                    } finally {
                      setResending(false);
                    }
                  }}
                  disabled={resending || !resendEmail}
                  className="bg-[#0d767b] hover:bg-[#095a5e] text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                  {resending ? 'Enviando...' : 'Reenviar'}
                </button>
              </div>
            </div>
          )}

          {resent && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-green-700 text-sm font-medium">
                ✅ Novo link enviado! Verifique sua caixa de entrada.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Link
              href="/login"
              className="inline-block bg-[#0d767b] hover:bg-[#095a5e] text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Ir para Login
            </Link>
            <p className="text-sm text-gray-500">
              Precisa de ajuda?{' '}
              <Link href="/contato" className="text-[#0d767b] hover:text-[#095a5e] font-medium">
                Entre em contato
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d767b]/5 to-[#0d767b]/15 px-4 py-8">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="bg-white rounded-2xl shadow-xl p-10 text-center">
              <Loader2 className="w-16 h-16 text-[#0d767b] animate-spin mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Carregando...</h1>
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
