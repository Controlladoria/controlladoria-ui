"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, CalendarClock, Eye, Info, Loader2, Mail, Send } from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Sidebar from "@/components/layout/Sidebar";
import UpcomingPaymentsModal from "@/components/payment-reminders/UpcomingPaymentsModal";
import {
  paymentRemindersApi,
  REMINDERS_UPDATED_EVENT,
  type ReminderFrequency,
  type ReminderSettings,
} from "@/lib/payment-reminders-api";
import { cn } from "@/lib/utils";

const FREQUENCY_OPTIONS: { value: ReminderFrequency; title: string; detail: string }[] = [
  { value: "daily", title: "Diário", detail: "Todo dia, com os pagamentos do dia" },
  { value: "weekly", title: "Semanal", detail: "Às segundas, com os pagamentos da semana" },
  { value: "monthly", title: "Mensal", detail: "No dia 1º, com os pagamentos do mês" },
];

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-[#0d767b] dark:bg-[#d15a12]" : "bg-muted-foreground/30"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

function NotificationsContent() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    paymentRemindersApi
      .getSettings()
      .then(setSettings)
      .catch(() => toast.error("Não foi possível carregar suas preferências."));
  }, []);

  const update = async (patch: Partial<ReminderSettings>) => {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, ...patch }); // optimistic
    setSaving(true);
    try {
      setSettings(await paymentRemindersApi.updateSettings(patch));
      window.dispatchEvent(new Event(REMINDERS_UPDATED_EVENT));
      toast.success("Preferências salvas");
    } catch {
      setSettings(previous);
      toast.error("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setSendingTest(true);
    try {
      const result = await paymentRemindersApi.sendTestEmail();
      if (result.sent) {
        toast.success(`E-mail de teste enviado para ${result.to}`);
      } else {
        toast.info(result.reason ?? "Nada para enviar no momento.");
      }
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      toast.error(
        status === 429
          ? "Limite de e-mails de teste atingido. Tente novamente mais tarde."
          : "Não foi possível enviar o e-mail de teste."
      );
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-background via-muted/30 to-accent/20">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="hidden h-2 bg-gradient-to-r from-[#095a5e] via-[#0d767b] to-[#1a9da3] lg:block dark:from-[#d15a12] dark:via-[#f86a15] dark:to-[#fa8c4a]" />

        <header className="border-b border-border bg-card/80 backdrop-blur-md">
          <div className="px-4 pb-4 pt-16 sm:px-6 sm:py-6 lg:px-8 lg:pt-6">
            <h1 className="flex items-center gap-3 text-xl font-bold text-foreground sm:text-2xl lg:text-3xl">
              <CalendarClock className="h-7 w-7 text-[#0d767b] dark:text-[#fa8c4a]" />
              Lembretes de pagamento
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Seja avisado sobre os pagamentos que vão vencer
            </p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {!settings ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Channels */}
                <section className="divide-y divide-border rounded-xl border-2 border-border bg-card shadow-sm">
                  <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
                    <div className="flex gap-3">
                      <Bell className="mt-0.5 h-5 w-5 shrink-0 text-[#0d767b] dark:text-[#fa8c4a]" />
                      <div>
                        <h2 className="font-semibold text-foreground">Aviso ao entrar</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Mostra um aviso ao entrar quando houver pagamentos no período, com acesso à prévia.
                        </p>
                      </div>
                    </div>
                    <Toggle
                      label="Aviso ao entrar"
                      checked={settings.in_app_enabled}
                      disabled={saving}
                      onChange={(value) => update({ in_app_enabled: value })}
                    />
                  </div>

                  <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
                    <div className="flex gap-3">
                      <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#0d767b] dark:text-[#fa8c4a]" />
                      <div>
                        <h2 className="font-semibold text-foreground">Lembrete por e-mail</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Enviado às 7h (horário de Brasília). Se não houver nada a pagar, nenhum e-mail é enviado.
                        </p>
                      </div>
                    </div>
                    <Toggle
                      label="Lembrete por e-mail"
                      checked={settings.email_enabled}
                      disabled={saving}
                      onChange={(value) => update({ email_enabled: value })}
                    />
                  </div>
                </section>

                {/* Frequency */}
                <section className="rounded-xl border-2 border-border bg-card p-5 shadow-sm sm:p-6">
                  <h2 className="font-semibold text-foreground">Período</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Vale para o aviso ao entrar e para o e-mail.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Período">
                    {FREQUENCY_OPTIONS.map((option) => {
                      const selected = settings.frequency === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={saving}
                          onClick={() => !selected && update({ frequency: option.value })}
                          className={cn(
                            "rounded-xl border-2 p-4 text-left transition-colors disabled:opacity-60",
                            selected
                              ? "border-[#0d767b] bg-[#0d767b]/5 dark:border-[#fa8c4a] dark:bg-[#fa8c4a]/10"
                              : "border-border hover:border-muted-foreground/40"
                          )}
                        >
                          <p className="font-semibold text-foreground">{option.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{option.detail}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Actions */}
                <section className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0d767b] to-[#095a5e] px-5 py-3 font-semibold text-white shadow transition-shadow hover:shadow-lg dark:from-[#d15a12] dark:to-[#fa8c4a]"
                  >
                    <Eye className="h-4 w-4" />
                    Ver prévia
                  </button>
                  <button
                    type="button"
                    onClick={sendTest}
                    disabled={sendingTest}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-border bg-card px-5 py-3 font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                  >
                    {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Enviar e-mail de teste
                  </button>
                </section>

                {/* How it works */}
                <section className="flex gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-1.5">
                    <p>
                      Entram no lembrete as <strong className="text-foreground">saídas</strong> (despesas, custos e
                      investimentos) com vencimento no período, a partir de hoje.
                    </p>
                    <p>
                      Pagamentos de dias que já passaram são considerados pagos, e lançamentos cadastrados no
                      próprio dia do vencimento não geram lembrete — já foram pagos.
                    </p>
                    <p>
                      Para boletos e guias (DARF, DAS), usamos a data de vencimento do documento.
                    </p>
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      <UpcomingPaymentsModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        initialFrequency={settings?.frequency ?? "daily"}
      />
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}
