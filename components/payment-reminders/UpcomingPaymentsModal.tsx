"use client";

/**
 * UpcomingPaymentsModal — what the company has to pay today / this week /
 * this month.
 *
 * Opened from the login alert, from the reminder email's link
 * (/?pagamentos=previa) and from the notifications settings page.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { CalendarClock, Loader2, Settings, X } from "lucide-react";
import {
  FREQUENCY_LABELS,
  formatWeekdayDate,
  paymentRemindersApi,
  type PaymentsPreview,
  type ReminderFrequency,
} from "@/lib/payment-reminders-api";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFrequency?: ReminderFrequency;
  /** Reuse data the caller already fetched, to avoid a second request. */
  initialPreview?: PaymentsPreview | null;
}

const TABS: ReminderFrequency[] = ["daily", "weekly", "monthly"];

export default function UpcomingPaymentsModal({
  open,
  onOpenChange,
  initialFrequency = "daily",
  initialPreview = null,
}: Props) {
  const [frequency, setFrequency] = useState<ReminderFrequency>(initialFrequency);
  const [preview, setPreview] = useState<PaymentsPreview | null>(initialPreview);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setFrequency(initialFrequency);
  }, [open, initialFrequency]);

  useEffect(() => {
    if (!open) return;
    if (preview && preview.frequency === frequency) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    paymentRemindersApi
      .getPreview(frequency)
      .then((data) => !cancelled && setPreview(data))
      .catch(() => !cancelled && setError("Não foi possível carregar os pagamentos."))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
    // `preview` is intentionally not a dependency: it is the result, not an input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, frequency]);

  const showDates = frequency !== "daily";
  const groups = groupByDate(preview?.items ?? []);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-2xl border border-border bg-card shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[480px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 pb-4 pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d767b] to-[#095a5e] text-white dark:from-[#d15a12] dark:to-[#fa8c4a]">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                  Pagamentos previstos
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-muted-foreground">
                  {preview ? capitalize(preview.period_label) : "Carregando…"}
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Period tabs */}
          <div className="flex gap-1 border-b border-border px-5 py-2" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={frequency === tab}
                onClick={() => setFrequency(tab)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  frequency === tab
                    ? "bg-[#0d767b] text-white dark:bg-[#d15a12]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {FREQUENCY_LABELS[tab]}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="min-h-[180px] flex-1 overflow-y-auto px-5 py-4">
            {loading ? (
              <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando pagamentos…
              </div>
            ) : error ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{error}</p>
            ) : !preview || preview.count === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-foreground">Nenhum pagamento previsto</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Nada com vencimento {emptyPhrase(frequency)} entre os documentos cadastrados.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {groups.map(([day, items]) => (
                  <div key={day}>
                    {showDates && (
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {formatWeekdayDate(day)}
                      </p>
                    )}
                    <ul className="divide-y divide-border rounded-xl border border-border">
                      {items.map((item, index) => (
                        <li
                          key={`${item.document_id}-${index}`}
                          className="flex items-start justify-between gap-3 px-3.5 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                            {item.category_label && item.category_label !== item.label && (
                              <p className="truncate text-xs text-muted-foreground">{item.category_label}</p>
                            )}
                          </div>
                          <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                            {item.amount_label}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
            <Link
              href="/account/notifications"
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Settings className="h-3.5 w-3.5" />
              Configurar lembretes
            </Link>
            {preview && preview.count > 0 && (
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Total · {preview.count} {preview.count === 1 ? "pagamento" : "pagamentos"}
                </p>
                <p className="text-lg font-bold tabular-nums text-[#0d767b] dark:text-[#fa8c4a]">
                  {preview.total_label}
                </p>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function groupByDate<T extends { due_date: string }>(items: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const bucket = map.get(item.due_date) ?? [];
    bucket.push(item);
    map.set(item.due_date, bucket);
  }
  return Array.from(map.entries());
}

function emptyPhrase(frequency: ReminderFrequency): string {
  if (frequency === "weekly") return "até o fim da semana";
  if (frequency === "monthly") return "até o fim do mês";
  return "para hoje";
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
