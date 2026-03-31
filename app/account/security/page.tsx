'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import { toast } from 'sonner';
import { Shield, Smartphone, Download, Key, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import QRCode from 'qrcode';

interface MFAStatus {
  enabled: boolean;
  method: string | null;
  enabled_at: string | null;
  backup_codes_remaining: number;
}

interface MFASetup {
  secret: string;
  provisioning_uri: string;
}

function SecurityPageContent() {
  const { user } = useAuth();
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupData, setSetupData] = useState<MFASetup | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);

  useEffect(() => {
    fetchMFAStatus();
  }, []);

  const fetchMFAStatus = async () => {
    try {
      const response = await api.get('/auth/mfa/status');
      setMfaStatus(response.data);
    } catch (error) {
      console.error('Error fetching MFA status:', error);
      toast.error('Erro ao carregar status da verificação');
    } finally {
      setIsLoading(false);
    }
  };

  const startMFASetup = async () => {
    setIsSettingUp(true);
    try {
      const response = await api.post('/auth/mfa/setup/totp');
      const data = response.data;
      setSetupData(data);

      // Generate QR code
      const qrUrl = await QRCode.toDataURL(data.provisioning_uri);
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error('Error setting up MFA:', error);
      toast.error('Erro ao configurar verificação em duas etapas');
      setIsSettingUp(false);
    }
  };

  const completeMFASetup = async () => {
    if (!setupData || !verificationCode || verificationCode.length !== 6) {
      toast.error('Digite um código de 6 dígitos');
      return;
    }

    try {
      const response = await api.post('/auth/mfa/enable', {
        secret: setupData.secret,
        code: verificationCode,
      });

      setBackupCodes(response.data.backup_codes);
      setShowBackupCodes(true);
      toast.success('Verificação em duas etapas ativada!');

      // Refresh status
      await fetchMFAStatus();
    } catch (error: any) {
      console.error('Error enabling MFA:', error);
      const message = error.response?.data?.detail || 'Código inválido';
      toast.error(message);
    }
  };

  const disableMFA = async () => {
    if (!disablePassword) {
      toast.error('Digite sua senha para confirmar');
      return;
    }

    setIsDisabling(true);
    try {
      await api.post('/auth/mfa/disable', { password: disablePassword });
      toast.success('Verificação em duas etapas desativada');
      setDisablePassword('');
      await fetchMFAStatus();
    } catch (error: any) {
      console.error('Error disabling MFA:', error);
      const message = error.response?.data?.detail || 'Erro ao desativar verificação';
      toast.error(message);
    } finally {
      setIsDisabling(false);
    }
  };

  const downloadBackupCodes = () => {
    const text = `Códigos de Backup - ControlladorIA
Gerado em: ${new Date().toLocaleString('pt-BR')}
Email: ${user?.email}

IMPORTANTE: Guarde estes códigos em local seguro. Cada código só pode ser usado uma vez.

${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

----
Estes códigos permitem acesso à sua conta se você perder acesso ao Google Authenticator.
`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cancelSetup = () => {
    setIsSettingUp(false);
    setSetupData(null);
    setQrCodeUrl('');
    setVerificationCode('');
  };

  const closeBackupCodes = () => {
    setShowBackupCodes(false);
    setBackupCodes([]);
    setIsSettingUp(false);
    setSetupData(null);
    setQrCodeUrl('');
    setVerificationCode('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0d767b]"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-accent/20 to-accent/40 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden lg:pt-0">
        {/* Top Header */}
        <header className="bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 pt-16 lg:pt-4 pb-4 sm:py-6">
            <div className="text-center lg:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center justify-center lg:justify-start gap-3">
                <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-[#0d767b]" />
                Segurança
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-1">
                Configure a verificação em duas etapas para proteger sua conta
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">

            {/* MFA Status Card */}
            <div className="bg-card rounded-xl shadow-xl p-6 sm:p-8 lg:p-10 border-2 border-border">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                    Verificação em Duas Etapas
                  </h2>
                  <div className="flex items-center gap-2 mt-3">
                    {mfaStatus?.enabled ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        Ativado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                        <XCircle className="w-4 h-4" />
                        Desativado
                      </span>
                    )}
                  </div>

                  {mfaStatus?.enabled && (
                    <div className="space-y-2 text-base text-muted-foreground mt-4">
                      <p>
                        <strong className="text-foreground">Método:</strong> {mfaStatus.method === 'totp' ? 'Google Authenticator (TOTP)' : 'Email'}
                      </p>
                      <p>
                        <strong className="text-foreground">Ativado em:</strong> {mfaStatus.enabled_at ? new Date(mfaStatus.enabled_at).toLocaleString('pt-BR') : '-'}
                      </p>
                      <p>
                        <strong className="text-foreground">Códigos de backup restantes:</strong> {mfaStatus.backup_codes_remaining}
                      </p>
                    </div>
                  )}
                </div>

                {!mfaStatus?.enabled && !isSettingUp && (
                  <Button
                    onClick={startMFASetup}
                    className="bg-gradient-to-r from-[#0d767b] to-[#095a5e] hover:from-[#095a5e] hover:to-[#084a4e] text-white text-base sm:text-lg font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-xl w-full sm:w-auto whitespace-nowrap"
                  >
                    Configurar Verificação
                  </Button>
                )}
              </div>

              {/* Disable MFA Section */}
              {mfaStatus?.enabled && !isSettingUp && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-lg font-bold text-foreground mb-3">
                    Desativar Verificação
                  </h3>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-500 p-4 mb-4 rounded-r-lg">
                    <div className="flex">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Desativar a verificação em duas etapas tornará sua conta menos segura. Digite sua senha para confirmar.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      placeholder="Digite sua senha"
                      className="flex-1 text-lg"
                    />
                    <Button
                      onClick={disableMFA}
                      disabled={isDisabling || !disablePassword}
                      variant="destructive"
                      className="text-base font-bold py-3 px-6 rounded-xl whitespace-nowrap"
                    >
                      {isDisabling ? 'Desativando...' : 'Desativar Verificação'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* MFA Setup Flow */}
            {isSettingUp && !showBackupCodes && (
              <div className="bg-card rounded-xl shadow-xl p-6 sm:p-8 lg:p-10 border-2 border-border">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">
                  Configurar Google Authenticator
                </h2>

                {/* Step 1: Download App */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0d767b] to-[#095a5e] text-white flex items-center justify-center font-bold text-lg">
                      1
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Baixe o Google Authenticator</h3>
                  </div>
                  <div className="ml-[52px] space-y-3 text-muted-foreground">
                    <p className="text-base">Instale o aplicativo no seu celular:</p>
                    <div className="flex gap-4">
                      <a
                        href="https://apps.apple.com/app/google-authenticator/id388497605"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0d767b] hover:underline font-medium"
                      >
                        App Store (iOS)
                      </a>
                      <a
                        href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0d767b] hover:underline font-medium"
                      >
                        Play Store (Android)
                      </a>
                    </div>
                  </div>
                </div>

                {/* Step 2: Scan QR Code */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0d767b] to-[#095a5e] text-white flex items-center justify-center font-bold text-lg">
                      2
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Escaneie o QR Code</h3>
                  </div>
                  <div className="ml-[52px]">
                    <p className="text-base text-muted-foreground mb-4">
                      Abra o Google Authenticator e escaneie este código:
                    </p>
                    {qrCodeUrl ? (
                      <div className="inline-block p-4 bg-white border-2 border-border rounded-xl shadow-md">
                        <img src={qrCodeUrl} alt="QR Code" className="w-56 h-56 sm:w-64 sm:h-64" />
                      </div>
                    ) : (
                      <div className="w-56 h-56 sm:w-64 sm:h-64 bg-muted animate-pulse rounded-xl"></div>
                    )}
                    <p className="text-sm text-muted-foreground mt-4">
                      Ou digite manualmente: <code className="bg-muted px-3 py-1.5 rounded-lg border border-border font-mono text-foreground">{setupData?.secret}</code>
                    </p>
                  </div>
                </div>

                {/* Step 3: Verify Code */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0d767b] to-[#095a5e] text-white flex items-center justify-center font-bold text-lg">
                      3
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Digite o código de verificação</h3>
                  </div>
                  <div className="ml-[52px]">
                    <p className="text-base text-muted-foreground mb-4">
                      Digite o código de 6 dígitos exibido no aplicativo:
                    </p>
                    <Input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-48 text-2xl text-center font-mono py-4"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-end pt-6 border-t border-border">
                  <Button
                    onClick={cancelSetup}
                    variant="outline"
                    className="text-base font-bold py-4 px-8 rounded-xl border-2"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={completeMFASetup}
                    disabled={verificationCode.length !== 6}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-base font-bold py-4 px-8 rounded-xl"
                  >
                    Ativar Verificação
                  </Button>
                </div>
              </div>
            )}

            {/* Backup Codes Display */}
            {showBackupCodes && (
              <div className="bg-card rounded-xl shadow-xl p-6 sm:p-8 lg:p-10 border-2 border-border">
                <div className="mb-6">
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                    Códigos de Backup
                  </h2>
                  <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 dark:border-green-500 p-4 mb-4 rounded-r-lg">
                    <div className="flex">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                      <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                        Verificação em duas etapas ativada! Salve estes códigos de backup em local seguro.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500 p-4 mb-6 rounded-r-lg">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-700 dark:text-red-300">
                      <p className="font-bold mb-2">IMPORTANTE:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Guarde estes códigos em local seguro (gerenciador de senhas recomendado)</li>
                        <li>Cada código só pode ser usado UMA vez</li>
                        <li>Use-os se perder acesso ao Google Authenticator</li>
                        <li>Esta é a ÚNICA vez que estes códigos serão exibidos</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6 p-4 bg-muted/50 rounded-xl border-2 border-border">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="font-mono text-base sm:text-lg text-foreground bg-card p-3 rounded-lg border border-border text-center">
                      {code}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <Button
                    onClick={downloadBackupCodes}
                    variant="outline"
                    className="text-base font-bold py-4 px-6 rounded-xl border-2 gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Baixar Códigos
                  </Button>
                  <Button
                    onClick={closeBackupCodes}
                    className="bg-gradient-to-r from-[#0d767b] to-[#095a5e] hover:from-[#095a5e] hover:to-[#084a4e] text-white text-base font-bold py-4 px-8 rounded-xl"
                  >
                    Concluir
                  </Button>
                </div>
              </div>
            )}

            {/* Info Cards */}
            {!isSettingUp && !showBackupCodes && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-[#0d767b]/5 dark:bg-[#0d767b]/10 border-2 border-[#0d767b]/20 rounded-xl p-6 sm:p-8">
                  <div className="flex items-start gap-4">
                    <Smartphone className="w-7 h-7 text-[#0d767b] flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-foreground text-lg mb-2">Google Authenticator (TOTP)</h3>
                      <p className="text-muted-foreground">
                        Gera códigos temporários de 6 dígitos que mudam a cada 30 segundos. Funciona offline.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-500/5 dark:bg-purple-500/10 border-2 border-purple-500/20 rounded-xl p-6 sm:p-8">
                  <div className="flex items-start gap-4">
                    <Key className="w-7 h-7 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-foreground text-lg mb-2">Códigos de Backup</h3>
                      <p className="text-muted-foreground">
                        10 códigos de uso único para acesso de emergência caso você perca seu dispositivo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <ProtectedRoute>
      <SecurityPageContent />
    </ProtectedRoute>
  );
}
