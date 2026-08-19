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
  updatedAt?: number;
  messageCount?: number;
  messages: Array<{ role: string; content: string }>;
}

export interface HealthStatus {
  status: string;
  timestamp: number;
  providers: Record<string, { healthy: boolean; latency?: number; error?: string; details?: Record<string, unknown> }>;
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
  /** Continue an existing session instead of creating a new one. */
  sessionId?: string;
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
  requestsTotal: number;
  requestsErrors: number;
  providerRequests: number;
  providerErrors: number;
  toolExecutions: number;
}

export interface ToolInfo {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  permission?: 'auto' | 'confirm' | 'deny';
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  sessionId: string;
  toolName: string;
  result: 'allowed' | 'denied' | 'error';
  reason?: string;
}

export interface Extension {
  id: string;
  name: string;
  type: 'provider' | 'tool';
  enabled: boolean;
  status?: string;
  providerId?: string;
  description?: string;
}

export interface PendingPermission {
  id: string;
  toolName: string;
  params: Record<string, unknown>;
  sessionId: string;
  scope: {
    allowedPaths: string[];
    allowedCommands: string[];
    deniedCommands: string[];
    maxExecutionTime: number;
  };
  createdAt: number;
}

export interface AppConfig {
  general: { serverPort: number; autoStart: boolean; minimizeToTray: boolean };
  browser: { useExistingProfile: boolean; headless: boolean; defaultTimeout: number };
  security: { requireConfirmation: boolean; dangerousCommands: string[]; auditLog: boolean };
  tools: { workingDirectory: string; maxExecutionTime: number; shell: string };
  onboarding?: { completed: boolean; provider?: string; model?: string };
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

  async exportSession(id: string, format: 'markdown' | 'json'): Promise<string> {
    const url = `${API_BASE}/v1/sessions/${id}/export?format=${format}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }
    return response.text();
  },

  /** Trigger a browser download of the exported session. */
  async downloadSession(id: string, format: 'markdown' | 'json'): Promise<void> {
    const content = await this.exportSession(id, format);
    const ext = format === 'json' ? 'json' : 'md';
    const blob = new Blob([content], {
      type: format === 'json' ? 'application/json' : 'text/markdown',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bab-session-${id.slice(0, 8)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Chat
  async chat(request_body: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    return request('/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify(request_body),
    });
  },

  /** Chat + the server-side session id so the conversation can be continued. */
  async chatWithMeta(request_body: ChatCompletionRequest): Promise<{
    response: ChatCompletionResponse;
    sessionId?: string;
  }> {
    const url = `${API_BASE}/v1/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request_body),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(error.error?.message || `API error: ${res.status}`);
    }
    const response: ChatCompletionResponse = await res.json();
    return {
      response,
      sessionId: res.headers.get('X-Session-Id') ?? undefined,
    };
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
  async getTools(): Promise<ToolInfo[]> {
    return request('/v1/tools');
  },

  async getMetricsJson(): Promise<MetricsData> {
    return request('/v1/metrics');
  },

  // Audit
  async getAudit(): Promise<{ object: string; data: AuditEntry[] }> {
    return request('/v1/audit');
  },

  // Extensions
  async getExtensions(): Promise<{ object: string; data: Extension[] }> {
    return request('/v1/extensions');
  },

  // Permissions
  async getPendingPermissions(): Promise<{ object: string; data: PendingPermission[] }> {
    return request('/v1/permissions/pending');
  },

  async approvePermission(id: string, mode: 'once' | 'session' | 'always'): Promise<{ approved: boolean; id: string }> {
    return request(`/v1/permissions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  },

  async denyPermission(id: string): Promise<{ denied: boolean; id: string }> {
    return request(`/v1/permissions/${id}/deny`, {
      method: 'POST',
    });
  },

  // Config
  async getConfig(): Promise<AppConfig> {
    return request('/v1/config');
  },

  async saveConfig(config: Partial<AppConfig>): Promise<AppConfig> {
    return request('/v1/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },
};
