/**
 * AI Advisor API Client
 *
 * The chat endpoint streams Server-Sent Events, which axios cannot consume —
 * it buffers the whole body before resolving. So this module talks to the
 * backend with `fetch` + a ReadableStream reader instead, and therefore has to
 * reimplement the two things the shared axios instance normally provides:
 * the bearer token and the 401 → refresh → retry dance.
 *
 * Non-streaming routes still go through the shared `api` client.
 */

import { api } from './api';
import { authTokens, authApiClient } from './auth-api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface AdvisorPeriod {
  period_type?: string;
  start_date?: string | null;
  end_date?: string | null;
  reference_date?: string | null;
}

export interface AdvisorMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  provider?: string | null;
  model?: string | null;
  created_at?: string | null;
}

export interface ConversationSummary {
  id: number;
  title: string | null;
  message_count: number;
  updated_at: string | null;
}

export interface ConversationDetail extends ConversationSummary {
  messages: AdvisorMessage[];
}

export interface AdvisorStatus {
  enabled: boolean;
  has_access: boolean;
  required_plans: string[];
}

/** Events surfaced to the UI as the answer streams in. */
export type StreamEvent =
  | { type: 'connected'; conversationId: number }
  | { type: 'chunk'; text: string }
  | { type: 'done'; conversationId: number; provider?: string; model?: string }
  | { type: 'error'; message: string };

export class AdvisorAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdvisorAccessError';
  }
}

interface ChatParams extends AdvisorPeriod {
  message: string;
  conversationId?: number | null;
  signal?: AbortSignal;
}

/**
 * Stream an answer as an async generator.
 *
 * Usage:
 *   for await (const event of streamChat({ message })) { ... }
 *
 * Pass an AbortSignal to cancel — the backend treats the disconnect as a
 * cancellation and persists whatever it had already generated.
 */
export async function* streamChat(params: ChatParams): AsyncGenerator<StreamEvent> {
  const body = JSON.stringify({
    message: params.message,
    conversation_id: params.conversationId ?? null,
    period_type: params.period_type ?? 'month',
    start_date: params.start_date ?? null,
    end_date: params.end_date ?? null,
    reference_date: params.reference_date ?? null,
  });

  const send = (token?: string) =>
    fetch(`${API_BASE_URL}/advisor/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
      signal: params.signal,
    });

  let response = await send(authTokens.getAccessToken());

  // The axios interceptor doesn't run for fetch, so handle expiry here.
  if (response.status === 401) {
    try {
      const refreshed = await authApiClient.refreshToken();
      response = await send(refreshed.access_token);
    } catch {
      throw new AdvisorAccessError('Sua sessão expirou. Faça login novamente.');
    }
  }

  if (response.status === 403) {
    const detail = await safeDetail(response);
    throw new AdvisorAccessError(detail || 'O Consultor IA está disponível nos planos Pro e Max.');
  }

  if (!response.ok) {
    const detail = await safeDetail(response);
    throw new Error(detail || `Erro ${response.status} ao contatar o consultor.`);
  }

  if (!response.body) {
    throw new Error('Streaming não suportado neste navegador.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line. Keep the trailing partial
      // frame in the buffer until its terminator arrives.
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        const event = parseFrame(frame);
        if (event) yield event;
      }
    }

    const tail = parseFrame(buffer);
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

function parseFrame(frame: string): StreamEvent | null {
  const line = frame
    .split('\n')
    .find((l) => l.startsWith('data:'));
  if (!line) return null;

  const raw = line.slice(5).trim();
  if (!raw) return null;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof payload.chunk === 'string') {
    return { type: 'chunk', text: payload.chunk };
  }

  switch (payload.event) {
    case 'connected':
      return { type: 'connected', conversationId: Number(payload.conversation_id) };
    case 'done':
      return {
        type: 'done',
        conversationId: Number(payload.conversation_id),
        provider: payload.provider as string | undefined,
        model: payload.model as string | undefined,
      };
    case 'error':
      return {
        type: 'error',
        message: (payload.message as string) || 'Erro ao gerar a resposta.',
      };
    default:
      return null;
  }
}

/**
 * Pull the human-readable message out of an error body.
 *
 * The API wraps errors as `{ error: { code, message } }` via its global
 * exception handler, but a few paths (and FastAPI's own validation layer)
 * still return the raw `{ detail }` shape — so handle both.
 */
async function safeDetail(response: Response): Promise<string | null> {
  try {
    const data = await response.json();
    if (typeof data?.error?.message === 'string') return data.error.message;
    if (typeof data?.detail === 'string') return data.detail;
    return null;
  } catch {
    return null;
  }
}

export const advisorApi = {
  async getStatus(): Promise<AdvisorStatus> {
    const { data } = await api.get<AdvisorStatus>('/advisor/status');
    return data;
  },

  async getSuggestions(period: AdvisorPeriod = {}): Promise<string[]> {
    const { data } = await api.get<{ suggestions: string[] }>('/advisor/suggestions', {
      params: {
        period_type: period.period_type ?? 'month',
        start_date: period.start_date ?? undefined,
        end_date: period.end_date ?? undefined,
        reference_date: period.reference_date ?? undefined,
      },
    });
    return data.suggestions ?? [];
  },

  async listConversations(limit = 30): Promise<ConversationSummary[]> {
    const { data } = await api.get<ConversationSummary[]>('/advisor/conversations', {
      params: { limit },
    });
    return data;
  },

  async getConversation(id: number): Promise<ConversationDetail> {
    const { data } = await api.get<ConversationDetail>(`/advisor/conversations/${id}`);
    return data;
  },

  async deleteConversation(id: number): Promise<void> {
    await api.delete(`/advisor/conversations/${id}`);
  },
};
