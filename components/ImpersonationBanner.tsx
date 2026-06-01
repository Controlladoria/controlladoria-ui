'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { toast } from 'sonner';

interface ImpersonationContext {
  target_user_email: string;
  target_user_name: string;
  sysadmin_email: string;
  session_id: number;
}

export default function ImpersonationBanner() {
  const [impersonation, setImpersonation] = useState<ImpersonationContext | null>(null);

  useEffect(() => {
    const token = Cookies.get('access_token');
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.is_impersonation) {
        setImpersonation({
          target_user_email: payload.target_user_email || 'Unknown',
          target_user_name: payload.target_user_name || 'Unknown User',
          sysadmin_email: payload.sysadmin_email || 'Unknown Admin',
          session_id: payload.impersonation_session_id,
        });
      }
    } catch {
      // Invalid token — ignore
    }
  }, []);

  const endImpersonation = async () => {
    if (!impersonation) return;
    try {
      const token = Cookies.get('access_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      await axios.post(
        `${apiUrl}/sysadmin/impersonate/${impersonation.session_id}/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      // Non-blocking — clear session even if API call fails
    }
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    toast.success('Impersonation ended');
    window.location.href = '/login';
  };

  if (!impersonation) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-6 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 animate-pulse" />
          <div>
            <p className="font-bold text-lg">
              ⚠️ Visualizando como {impersonation.target_user_name} ({impersonation.target_user_email})
            </p>
            <p className="text-sm text-red-100">
              Você é: {impersonation.sysadmin_email} • Todas as ações estão sendo registradas
            </p>
          </div>
        </div>
        <button
          onClick={endImpersonation}
          className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
        >
          <X className="w-4 h-4" />
          Encerrar Impersonação
        </button>
      </div>
    </div>
  );
}
