/**
 * Payment reminders API — upcoming outgoing payments for the active company.
 *
 * The preview is computed server-side by the same module that builds the
 * reminder email, so the modal and the email always list the same payments.
 */

import { api } from './api';

export type ReminderFrequency = 'daily' | 'weekly' | 'monthly';

export interface ReminderSettings {
  email_enabled: boolean;
  in_app_enabled: boolean;
  frequency: ReminderFrequency;
}

export interface UpcomingPayment {
  document_id: number;
  due_date: string; // YYYY-MM-DD
  amount: number;
  amount_label: string;
  label: string;
  category: string | null;
  category_label: string | null;
  payee: string | null;
}

export interface PaymentsPreview {
  frequency: ReminderFrequency;
  start_date: string;
  end_date: string;
  period_label: string;
  /** Stable per period — used to remember that the alert was dismissed. */
  period_key: string;
  count: number;
  total: number;
  total_label: string;
  items: UpcomingPayment[];
}

/** Fired after settings change so the login alert re-syncs without a reload. */
export const REMINDERS_UPDATED_EVENT = 'payment-reminders:updated';

export const FREQUENCY_LABELS: Record<ReminderFrequency, string> = {
  daily: 'Hoje',
  weekly: 'Esta semana',
  monthly: 'Este mês',
};

export const paymentRemindersApi = {
  async getSettings(): Promise<ReminderSettings> {
    const { data } = await api.get<ReminderSettings>('/payment-reminders/settings');
    return data;
  },

  async updateSettings(patch: Partial<ReminderSettings>): Promise<ReminderSettings> {
    const { data } = await api.put<ReminderSettings>('/payment-reminders/settings', patch);
    return data;
  },

  async getPreview(frequency?: ReminderFrequency): Promise<PaymentsPreview> {
    const { data } = await api.get<PaymentsPreview>('/payment-reminders/preview', {
      params: frequency ? { frequency } : undefined,
    });
    return data;
  },

  async sendTestEmail(): Promise<{ sent: boolean; reason?: string; to?: string; count?: number }> {
    const { data } = await api.post('/payment-reminders/test-email');
    return data;
  },
};

/** "2026-09-24" → "24/09" without timezone drift (no Date parsing). */
export function formatShortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

/** "2026-09-24" → "quinta, 24/09" */
export function formatWeekdayDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  // Noon local time: safe from DST/offset rollovers across the date line.
  const weekday = new Date(year, month - 1, day, 12).toLocaleDateString('pt-BR', { weekday: 'long' });
  return `${weekday.split('-')[0]}, ${formatShortDate(iso)}`;
}
