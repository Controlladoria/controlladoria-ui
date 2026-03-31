'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApiClient } from '@/lib/auth-api';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authApiClient.requestPasswordReset(email);
      setSubmitted(true);
      toast.success('Instruções enviadas para seu e-mail!');
    } catch (error) {
      console.error('Password reset request error:', error);
      // Always show success to prevent email enumeration
      setSubmitted(true);
      toast.success('Se o e-mail existir, você receberá instruções para resetar sua senha.');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d767b]/5 to-[#0d767b]/15 px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">E-mail Enviado!</h1>
              <p className="text-gray-600">
                Se o endereço <strong>{email}</strong> estiver cadastrado, você receberá um link para
                redefinir sua senha.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-500">Não recebeu o e-mail?</p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-[#0d767b] hover:text-[#095a5e] font-medium transition-colors"
              >
                Tentar novamente
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
                ← Voltar para o login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d767b]/5 to-[#0d767b]/15 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Esqueceu a Senha?</h1>
            <p className="text-gray-600">
              Digite seu e-mail para receber instruções de recuperação
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-mail
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d767b] focus:border-transparent transition-all"
                placeholder="seu@email.com"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0d767b] hover:bg-[#095a5e] text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Enviando...' : 'Enviar Instruções'}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
              ← Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
