/**
 * Browser AI Bridge - Dashboard API Client
 * 
 * Connects to the real BAB API server.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
  } catch (err) {
    // Network error - server not running or unreachable
    throw new Error('Server not running. Start the server first.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `API error: ${response.status}`);
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

  // Chat
  async chat(request_body: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    return request('/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify(request_body),
    });
  },

  async *chatStream(request_body: ChatCompletionRequest): AsyncGenerator<string> {
    const url = `${API_BASE}/v1/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request_body, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`Stream error: ${response.status}`);
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
