/**
 * Browser AI Bridge - Dashboard API Client
 *
 * Connects to the real BAB API server.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type ApiErrorCode =
  | 'SERVER_DOWN'
  | 'NO_PROVIDER'
  | 'PROVIDER_NOT_SIGNED_IN'
  | 'RATE_LIMITED'
  | 'BAD_REQUEST'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export class ApiError extends Error {
  code: ApiErrorCode;
  status?: number;
  constructor(code: ApiErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

function classifyErrorPayload(status: number, msg: string): ApiErrorCode {
  const m = (msg || '').toLowerCase();
  if (status === 429) return 'RATE_LIMITED';
  if (status === 400) return 'BAD_REQUEST';
  if (status === 503 || m.includes('no provider available')) return 'NO_PROVIDER';
  if (m.includes('not signed in') || m.includes('login') || m.includes('sign in')) return 'PROVIDER_NOT_SIGNED_IN';
  if (status >= 500) return 'SERVER_ERROR';
  return 'UNKNOWN';
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  } catch {
    throw new ApiError('SERVER_DOWN', 'Local server is not reachable');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: { message: response.statusText } }));
    const raw = payload?.error?.message || `HTTP ${response.status}`;
    throw new ApiError(classifyErrorPayload(response.status, raw), raw, response.status);
  }

  return response.json();
}

// Types
export interface Provider {
  id: string;
  name: string;
  status: string;
}

export interface Session {
  id: string;
  providerId: string;
  model: string;
  createdAt: number;
  messages: Array<{ role: string; content: string }>;
}

export interface HealthStatus {
  status: string;
  timestamp: number;
  providers: Record<string, { healthy: boolean; latency?: number; error?: string }>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface MetricsData {
  requests_total: number;
  requests_duration: number;
  provider_requests: Record<string, number>;
  provider_errors: Record<string, number>;
}

// API methods
export const api = {
  // Health
  async getHealth(): Promise<HealthStatus> {
    return request('/health');
  },

  // Models/Providers
  async getModels(): Promise<{ object: string; data: Array<{ id: string; object: string; created: number; owned_by: string }> }> {
    return request('/v1/models');
  },

  // Sessions
  async getSessions(): Promise<{ object: string; data: Session[] }> {
    return request('/v1/sessions');
  },

  async createSession(providerId: string, model: string): Promise<Session> {
    return request('/v1/sessions', {
      method: 'POST',
      body: JSON.stringify({ providerId, model }),
    });
  },

  async getSession(id: string): Promise<Session> {
    return request(`/v1/sessions/${id}`);
  },

  async deleteSession(id: string): Promise<{ deleted: boolean; id: string }> {
    return request(`/v1/sessions/${id}`, { method: 'DELETE' });
  },

  // Chat
  async chat(request_body: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    return request('/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify(request_body),
    });
  },

  async *chatStream(request_body: ChatCompletionRequest): AsyncGenerator<string> {
    const url = `${API_BASE}/v1/chat/completions`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request_body, stream: true }),
      });
    } catch {
      throw new ApiError('SERVER_DOWN', 'Local server is not reachable');
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: { message: response.statusText } }));
      const raw = payload?.error?.message || `HTTP ${response.status}`;
      throw new ApiError(classifyErrorPayload(response.status, raw), raw, response.status);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No stream body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  },

  // Metrics
  async getMetrics(): Promise<string> {
    const url = `${API_BASE}/metrics`;
    const response = await fetch(url);
    return response.text();
  },

  // Tools
  async getTools(): Promise<Array<{ name: string; description: string; parameters: Record<string, unknown> }>> {
    return request('/v1/tools');
  },
};

/**
 * Poll /health until the given provider is healthy or timeout elapses.
 * Returns the final HealthStatus row (may be undefined if provider never appeared).
 */
export async function waitForProviderHealthy(
  providerId: string,
  { timeoutMs = 20000, intervalMs = 500 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<HealthStatus['providers'][string] | undefined> {
  const deadline = Date.now() + timeoutMs;
  let lastRow: HealthStatus['providers'][string] | undefined;
  while (Date.now() < deadline) {
    try {
      const h = await api.getHealth();
      lastRow = h.providers?.[providerId];
      if (lastRow?.healthy) return lastRow;
    } catch {
      // server may still be booting — keep polling
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return lastRow;
}
