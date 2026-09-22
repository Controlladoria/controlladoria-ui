"use client";

/**
 * AdvisorChat — the conversation surface for the AI financial consultant.
 *
 * Rendered inside AdvisorLauncher's modal. Kept as its own component so the
 * same chat can later be dropped into a full page without touching the
 * launcher.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertCircle,
  ArrowUp,
  Loader2,
  MessageSquarePlus,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import {
  advisorApi,
  streamChat,
  AdvisorAccessError,
  type AdvisorMessage,
  type AdvisorPeriod,
  type ConversationSummary,
} from "@/lib/advisor-api";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** True while chunks are still arriving for this message. */
  streaming?: boolean;
  error?: boolean;
}

interface AdvisorChatProps {
  period?: AdvisorPeriod;
  /** Human-readable period, shown in the header so context is never implicit. */
  periodLabel?: string;
  /**
   * Rendered at the end of the header controls. The launcher passes its dialog
   * close button here so it shares the header row — an absolutely positioned
   * close would sit on top of the "Nova conversa" button.
   */
  headerAction?: React.ReactNode;
}

let messageSeq = 0;
const nextId = () => `m${++messageSeq}`;

export default function AdvisorChat({
  period,
  periodLabel,
  headerAction,
}: AdvisorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const periodKey = useMemo(() => JSON.stringify(period ?? {}), [period]);

  // -- data loading --------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    setLoadingSuggestions(true);

    advisorApi
      .getSuggestions(period ?? {})
      .then((items) => {
        if (!cancelled) setSuggestions(items);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestions(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey]);

  const refreshConversations = useCallback(() => {
    advisorApi
      .listConversations()
      .then(setConversations)
      .catch(() => setConversations([]));
  }, []);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Abort any in-flight stream when the chat unmounts (modal closed).
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // -- scrolling -----------------------------------------------------------

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // -- sending -------------------------------------------------------------

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setInput("");
      setFatalError(null);

      const assistantId = nextId();
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", content: trimmed },
        { id: assistantId, role: "assistant", content: "", streaming: true },
      ]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const patchAssistant = (patch: Partial<ChatMessage>) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, ...patch } : m))
        );

      try {
        for await (const event of streamChat({
          message: trimmed,
          conversationId,
          ...(period ?? {}),
          signal: controller.signal,
        })) {
          if (event.type === "connected") {
            setConversationId(event.conversationId);
          } else if (event.type === "chunk") {
            // Functional update: chunks arrive faster than React re-renders.
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + event.text } : m
              )
            );
          } else if (event.type === "error") {
            patchAssistant({ content: event.message, error: true, streaming: false });
          } else if (event.type === "done") {
            patchAssistant({ streaming: false });
          }
        }
      } catch (err) {
        if (controller.signal.aborted) {
          // User pressed stop — keep whatever streamed in as a normal message.
          patchAssistant({ streaming: false });
        } else if (err instanceof AdvisorAccessError) {
          setFatalError(err.message);
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        } else {
          patchAssistant({
            content:
              "Não consegui completar a resposta. Verifique sua conexão e tente novamente.",
            error: true,
            streaming: false,
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        patchAssistant({ streaming: false });
        refreshConversations();
      }
    },
    [conversationId, isStreaming, period, refreshConversations]
  );

  const stop = () => abortRef.current?.abort();

  const startNewConversation = () => {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setFatalError(null);
    setShowHistory(false);
    textareaRef.current?.focus();
  };

  const openConversation = async (id: number) => {
    abortRef.current?.abort();
    setShowHistory(false);
    setFatalError(null);
    try {
      const detail = await advisorApi.getConversation(id);
      setConversationId(detail.id);
      setMessages(
        detail.messages.map((m: AdvisorMessage) => ({
          id: `s${m.id}`,
          role: m.role,
          content: m.content,
        }))
      );
    } catch {
      setFatalError("Não foi possível abrir esta conversa.");
    }
  };

  const removeConversation = async (id: number, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await advisorApi.deleteConversation(id);
      if (id === conversationId) startNewConversation();
      refreshConversations();
    } catch {
      setFatalError("Não foi possível excluir esta conversa.");
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(input);
    }
  };

  const isEmpty = messages.length === 0;

  // -- render --------------------------------------------------------------

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-[#0d767b] dark:text-[#fa8c4a]" />
            <h2 className="truncate text-sm font-semibold text-foreground">
              Consultor IA
            </h2>
          </div>
          {periodLabel && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              Analisando {periodLabel}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Conversas
          </button>
          <button
            type="button"
            onClick={startNewConversation}
            title="Nova conversa"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
          {headerAction}
        </div>
      </div>

      {/* History drawer */}
      {showHistory && (
        <div className="max-h-52 overflow-y-auto border-b border-border bg-muted/40">
          {conversations.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">
              Nenhuma conversa ainda.
            </p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openConversation(c.id)}
                className={cn(
                  "group flex w-full items-center justify-between gap-2 px-4 py-2 text-left transition-colors hover:bg-muted",
                  c.id === conversationId && "bg-muted"
                )}
              >
                <span className="truncate text-xs text-foreground">
                  {c.title || "Conversa sem título"}
                </span>
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => removeConversation(c.id, e)}
                  className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0d767b] to-[#095a5e] text-white shadow-lg dark:from-[#d15a12] dark:to-[#fa8c4a]">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="max-w-xs">
              <p className="text-sm font-semibold text-foreground">
                Pergunte sobre seus números
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Analiso seu DRE, Balanço, Indicadores e Fluxo de Caixa e sugiro o
                que fazer a seguir.
              </p>
            </div>

            <div className="w-full max-w-sm space-y-2">
              {loadingSuggestions ? (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Analisando seus dados...
                </div>
              ) : (
                suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-left text-xs text-foreground transition-all hover:border-[#0d767b] hover:shadow-sm dark:hover:border-[#fa8c4a]"
                  >
                    {s}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>

      {/* Fatal errors (plan/session) sit above the composer */}
      {fatalError && (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{fatalError}</span>
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2 focus-within:border-[#0d767b] dark:focus-within:border-[#fa8c4a]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Pergunte sobre seus resultados..."
            disabled={isStreaming}
            className="max-h-28 flex-1 resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              title="Parar"
              className="shrink-0 rounded-xl bg-muted p-2 text-foreground transition-colors hover:bg-border"
            >
              <Square className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => send(input)}
              disabled={!input.trim()}
              title="Enviar"
              className="shrink-0 rounded-xl bg-gradient-to-br from-[#0d767b] to-[#095a5e] p-2 text-white transition-opacity disabled:opacity-40 dark:from-[#d15a12] dark:to-[#fa8c4a]"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="mt-1.5 px-1 text-[10px] leading-tight text-muted-foreground">
          Análise gerencial baseada nos seus documentos. Para decisões fiscais,
          consulte seu contador.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-to-br from-[#0d767b] to-[#095a5e] px-3.5 py-2 text-sm text-white dark:from-[#d15a12] dark:to-[#fa8c4a]">
          {message.content}
        </div>
      </div>
    );
  }

  const isThinking = message.streaming && !message.content;

  return (
    <div className="flex justify-start">
      <div
        className={cn(
          "max-w-[92%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm",
          message.error
            ? "border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200"
            : "bg-muted text-foreground"
        )}
      >
        {isThinking ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-xs">Analisando...</span>
          </span>
        ) : (
          <div
            className={cn(
              "advisor-prose",
              message.streaming && "after:ml-0.5 after:animate-pulse after:content-['▌']"
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
