'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Shield, Mail, Smartphone } from 'lucide-react';
import { api } from '@/lib/api';
import { authTokens } from '@/lib/auth-api';

export default function LoginPage() {
  const router = useRouter();
  const { login, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<'totp' | 'email' | null>(null);
  const [tempToken, setTempToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [isVerifyingMFA, setIsVerifyingMFA] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await login(formData);

      // Check if MFA is required
      if (response && 'mfa_required' in response && response.mfa_required) {
        setMfaRequired(true);
        setMfaMethod(response.mfa_method as 'totp' | 'email');
        setTempToken(response.temp_token);
        toast.info(
          response.mfa_method === 'email'
            ? 'Código de verificação enviado para seu email'
            : 'Digite o código do seu autenticador'
        );
      } else {
        // Login successful without MFA
        toast.success('Login realizado com sucesso!');
        router.push('/');
      }
    } catch (error: unknown) {
      console.error('Login error:', error);

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: { message?: string }; detail?: string } } };
        const message = axiosError.response?.data?.error?.message || axiosError.response?.data?.detail || 'Falha no login';
        toast.error(message);
      } else {
        toast.error('Erro ao fazer login. Verifique suas credenciais.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFASubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mfaCode.length !== 6) {
      toast.error('Digite um código de 6 dígitos');
      return;
    }

    setIsVerifyingMFA(true);

    try {
      const response = await api.post('/auth/mfa/verify-login', null, {
        params: {
          temp_token: tempToken,
          mfa_code: mfaCode,
          trust_device: trustDevice,
        },
      });

      // Store tokens in cookies (same mechanism as normal login)
      authTokens.setTokens(response.data.access_token, response.data.refresh_token);

      // Load user into AuthContext before redirecting
      await refreshUser();

      toast.success('Login realizado com sucesso!');
      router.push('/');
    } catch (error: unknown) {
      console.error('MFA verification error:', error);

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string } } };
        const message = axiosError.response?.data?.detail || 'Código inválido';
        toast.error(message);
      } else {
        toast.error('Erro ao verificar código');
      }
    } finally {
      setIsVerifyingMFA(false);
    }
  };

  const handleResendEmailCode = async () => {
    setIsSendingEmail(true);
    try {
      // The email code was already sent during login, but user can request a new one
      // We would need to add an endpoint for this, for now just show a message
      toast.info('Verifique seu email para o código de verificação');
    } catch (error) {
      toast.error('Erro ao enviar código');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleBackToLogin = () => {
    setMfaRequired(false);
    setMfaCode('');
    setTrustDevice(false);
  };

  // MFA Verification UI
  if (mfaRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d767b]/5 to-[#0d767b]/15 px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl shadow-xl p-10">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0d767b]/10 rounded-full mb-4">
                <Shield className="w-8 h-8 text-[#0d767b]" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">Verificação em Duas Etapas</h1>
              <p className="text-xl text-gray-600">
                {mfaMethod === 'email' ? (
                  <>
                    <Mail className="inline w-5 h-5 mr-2" />
                    Digite o código enviado para {formData.email}
                  </>
                ) : (
                  <>
                    <Smartphone className="inline w-5 h-5 mr-2" />
                    Digite o código do seu autenticador
                  </>
                )}
              </p>
            </div>

            {/* MFA Form */}
            <form onSubmit={handleMFASubmit} className="space-y-7">
              {/* MFA Code Input */}
              <div>
                <label htmlFor="mfa_code" className="block text-base font-medium text-gray-700 mb-2">
                  Código de Verificação
                </label>
                <input
                  type="text"
                  id="mfa_code"
                  name="mfa_code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  className="w-full px-5 py-4 text-base text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d767b] focus:border-transparent transition-all text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                  autoComplete="off"
                  autoFocus
                  disabled={isVerifyingMFA}
                />
                <p className="mt-2 text-sm text-gray-500">
                  Digite o código de 6 dígitos
                </p>
              </div>

              {/* Trust Device Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="trust_device"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                  className="w-5 h-5 text-[#0d767b] border-gray-300 rounded focus:ring-[#0d767b]"
                  disabled={isVerifyingMFA}
                />
                <label htmlFor="trust_device" className="ml-3 text-base text-gray-700">
                  Confiar neste dispositivo por 30 dias
                </label>
              </div>

              {/* Resend Email Code (only for email MFA) */}
              {mfaMethod === 'email' && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendEmailCode}
                    disabled={isSendingEmail}
                    className="text-base text-[#0d767b] hover:text-[#095a5e] transition-colors font-medium"
                  >
                    {isSendingEmail ? 'Enviando...' : 'Reenviar código'}
                  </button>
                </div>
              )}

              {/* Backup Code Link */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Perdeu acesso?{' '}
                  <button
                    type="button"
                    onClick={() => toast.info('Use um dos seus códigos de backup de 10 caracteres')}
                    className="text-[#0d767b] hover:text-[#095a5e] font-medium"
                  >
                    Usar código de backup
                  </button>
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isVerifyingMFA || mfaCode.length !== 6}
                className="w-full bg-[#0d767b] hover:bg-[#095a5e] text-white text-lg font-semibold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifyingMFA ? 'Verificando...' : 'Verificar'}
              </button>

              {/* Back to Login */}
              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Voltar ao login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Regular Login UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d767b]/5 to-[#0d767b]/15 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl p-10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <Image
                src="/logo-horizontal.svg"
                alt="ControlladorIA"
                width={320}
                height={96}
                priority
                className="h-24 w-auto"
              />
            </div>
            <p className="text-xl text-gray-600">Entre na sua conta</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-7">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-base font-medium text-gray-700 mb-2">
                E-mail
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-5 py-4 text-base text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d767b] focus:border-transparent transition-all"
                placeholder="seu@email.com"
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-base font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-5 py-4 pr-14 text-base text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d767b] focus:border-transparent transition-all"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-6 h-6" />
                  ) : (
                    <Eye className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-base text-[#0d767b] hover:text-[#095a5e] transition-colors font-medium"
              >
                Esqueceu a senha?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0d767b] hover:bg-[#095a5e] text-white text-lg font-semibold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-8 text-center">
            <p className="text-base text-gray-600">
              Não tem uma conta?{' '}
              <Link href="/register" className="text-base text-[#0d767b] hover:text-[#095a5e] font-semibold transition-colors">
                Cadastre-se
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
