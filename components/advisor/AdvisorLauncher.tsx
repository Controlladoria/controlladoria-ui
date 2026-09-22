"use client";

/**
 * AdvisorLauncher — floating action button that opens the Consultor IA modal.
 *
 * Mounted globally in the root layout, but renders nothing unless the user is
 * authenticated *and* their plan includes the advisor. Access is resolved from
 * `/advisor/status` rather than from the subscription context alone, because
 * the backend also factors in the demo-mode override — asking the server keeps
 * one source of truth.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Sparkles, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { advisorApi, type AdvisorPeriod } from "@/lib/advisor-api";
import AdvisorChat from "./AdvisorChat";

/**
 * Routes where a floating chat button would be noise rather than help —
 * unauthenticated flows and legal pages.
 */
const HIDDEN_PREFIXES = [
  "/login",
  "/register",
  "/cadastro",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/terms",
  "/privacy",
  "/pricing",
  "/contato",
];

function currentPeriod(): { period: AdvisorPeriod; label: string } {
  const now = new Date();
  const months = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return {
    period: {
      period_type: "month",
      reference_date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    },
    label: `${months[now.getMonth()]} de ${now.getFullYear()}`,
  };
}

export default function AdvisorLauncher() {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const [hasAccess, setHasAccess] = useState(false);
  const [open, setOpen] = useState(false);
  const [{ period, label }] = useState(currentPeriod);

  const hiddenRoute = HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (isLoading || !isAuthenticated || hiddenRoute) {
      setHasAccess(false);
      return;
    }

    let cancelled = false;
    advisorApi
      .getStatus()
      .then((status) => {
        if (!cancelled) setHasAccess(Boolean(status.has_access));
      })
      .catch(() => {
        // A failure here just means no button — never block the page.
        if (!cancelled) setHasAccess(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, hiddenRoute]);

  if (!hasAccess || hiddenRoute) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Abrir Consultor IA"
          className="group fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-to-br from-[#0d767b] to-[#095a5e] px-4 py-3 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl dark:from-[#d15a12] dark:to-[#fa8c4a]"
        >
          <Sparkles className="h-5 w-5" />
          <span className="hidden text-sm font-semibold sm:inline">
            Consultor IA
          </span>
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />

        <DialogPrimitive.Content
          // Anchored bottom-right on desktop like a chat widget; full-screen on
          // mobile, where a floating panel would be unusable.
          className="fixed inset-0 z-50 flex flex-col bg-card shadow-2xl data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(640px,calc(100vh-3rem))] sm:w-[420px] sm:rounded-2xl sm:border sm:border-border"
        >
          <DialogPrimitive.Title className="sr-only">
            Consultor IA
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Converse com o consultor financeiro sobre seu DRE, balanço e indicadores.
          </DialogPrimitive.Description>

          {/* Remount per open so a closed conversation doesn't keep a stale
              stream or scroll position alive in the background. */}
          {open && (
            <AdvisorChat
              period={period}
              periodLabel={label}
              headerAction={
                <DialogPrimitive.Close
                  aria-label="Fechar"
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </DialogPrimitive.Close>
              }
            />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
