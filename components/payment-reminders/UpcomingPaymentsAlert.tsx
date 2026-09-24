"use client";

/**
 * UpcomingPaymentsAlert — the "você tem pagamentos hoje" card shown after login.
 *
 * Appears only when the in-app reminder is on *and* something is actually due
 * in the user's chosen window, so it never nags about nothing. Dismissing it
 * hides it for the rest of that period (the day, week or month), per company.
 *
 * Also owns the /?pagamentos=previa deep link used by the reminder email: that
 * opens the modal directly, even if the in-app alert is switched off.
 */

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  paymentRemindersApi,
  REMINDERS_UPDATED_EVENT,
  type PaymentsPreview,
  type ReminderFrequency,
} from "@/lib/payment-reminders-api";
import UpcomingPaymentsModal from "./UpcomingPaymentsModal";

const HIDDEN_PREFIXES = [
  "/login", "/register", "/cadastro", "/forgot-password", "/reset-password",
  "/verify-email", "/terms", "/privacy", "/pricing", "/contato",
];

const DEEP_LINK_PARAM = "pagamentos";

/** The settings page has its own "Ver prévia"; the card would only cover it. */
const SETTINGS_PATH = "/account/notifications";

function shortPeriod(frequency: ReminderFrequency): string {
  if (frequency === "weekly") return "esta semana";
  if (frequency === "monthly") return "este mês";
  return "hoje";
}

function dismissKey(orgId: number | string | undefined, periodKey: string) {
  return `payments-alert-dismissed:${orgId ?? "none"}:${periodKey}`;
}

// Storage can throw (private mode, blocked site data) — the alert must still work.
function readDismissed(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
}

export default function UpcomingPaymentsAlert() {
  const { isAuthenticated, isLoading } = useAuth();
  const { activeOrg } = useOrganization();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [preview, setPreview] = useState<PaymentsPreview | null>(null);
  const [frequency, setFrequency] = useState<ReminderFrequency>("daily");
  const [dismissed, setDismissed] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const hiddenRoute = HIDDEN_PREFIXES.some((prefix) => pathname?.startsWith(prefix));
  const orgId = activeOrg?.id;

  // Re-sync when the user changes their preferences elsewhere in the app.
  useEffect(() => {
    const onUpdated = () => setRefreshToken((n) => n + 1);
    window.addEventListener(REMINDERS_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(REMINDERS_UPDATED_EVENT, onUpdated);
  }, []);

  // Deep link from the email.
  useEffect(() => {
    if (!isAuthenticated || searchParams?.get(DEEP_LINK_PARAM) !== "previa") return;
    setModalOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete(DEEP_LINK_PARAM);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname || "/", { scroll: false });
  }, [isAuthenticated, searchParams, pathname, router]);

  // Load once per company after sign-in.
  useEffect(() => {
    if (isLoading || !isAuthenticated || hiddenRoute) return;

    let cancelled = false;
    (async () => {
      try {
        const settings = await paymentRemindersApi.getSettings();
        if (cancelled) return;
        setFrequency(settings.frequency);
        if (!settings.in_app_enabled) {
          setPreview(null);
          return;
        }
        const data = await paymentRemindersApi.getPreview(settings.frequency);
        if (cancelled) return;
        setPreview(data);
        setDismissed(readDismissed(dismissKey(orgId, data.period_key)));
      } catch {
        // A failed reminder check must never get in the way of the page.
        if (!cancelled) setPreview(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, hiddenRoute, orgId, refreshToken]);

  if (!isAuthenticated || hiddenRoute) return null;

  const showCard =
    !!preview && preview.count > 0 && !dismissed && !pathname?.startsWith(SETTINGS_PATH);

  const dismiss = () => {
    if (preview) writeDismissed(dismissKey(orgId, preview.period_key));
    setDismissed(true);
  };

  return (
    <>
      {showCard && (
        // Floating, not in the document flow: pages are built on h-screen
        // containers, so a bar pushed above them would make every page scroll
        // and hide its bottom edge. Sits above the Consultor IA button, clear
        // of the toasts at the top-right.
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-40 animate-in fade-in-0 slide-in-from-bottom-2 sm:inset-x-auto sm:right-5 sm:w-[340px]"
        >
          <div className="rounded-2xl border border-border bg-card p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d767b] to-[#095a5e] text-white dark:from-[#d15a12] dark:to-[#fa8c4a]">
                <CalendarClock className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {preview.count === 1 ? "1 pagamento" : `${preview.count} pagamentos`} para{" "}
                  {shortPeriod(preview.frequency)}
                </p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-[#0d767b] dark:text-[#fa8c4a]">
                  {preview.total_label}
                </p>
              </div>
              <button
                type="button"
                aria-label="Dispensar"
                onClick={dismiss}
                className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-3 w-full rounded-xl bg-[#0d767b] py-2 text-sm font-semibold text-white transition-colors hover:bg-[#095a5e] dark:bg-[#d15a12] dark:hover:bg-[#f86a15]"
            >
              Ver prévia
            </button>
          </div>
        </div>
      )}

      <UpcomingPaymentsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialFrequency={frequency}
        initialPreview={preview}
      />
    </>
  );
}
