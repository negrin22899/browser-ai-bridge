import type {
  Provider,
  ProviderStatus,
  ProviderType,
  ProviderCapabilities,
  HealthCheckResult,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  ToolDescription,
} from '@bab/protocol';
import {
  AnthropicAdapter,
  GoogleAdapter,
} from '@bab/protocol';

export type ApiProviderFormat = 'openai' | 'anthropic' | 'google';

export interface ApiProviderOptions {
  /** Provider id (used as the model name clients send). */
  id: string;
  name?: string;
  format: ApiProviderFormat;
  /** Base URL without trailing slash, e.g. https://api.openai.com/v1 */
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

const DEFAULT_BASE_URLS: Record<ApiProviderFormat, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta',
};

const ENV_KEYS: Record<ApiProviderFormat, string[]> = {
  openai: ['OPENAI_API_KEY'],
  anthropic: ['ANTHROPIC_API_KEY'],
  google: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'],
};

function resolveApiKey(format: ApiProviderFormat, explicit?: string): string {
  if (explicit) return explicit;
  for (const key of ENV_KEYS[format]) {
    const value = process.env[key];
    if (value) return value;
  }
  return '';
}

/**
 * Native API provider.
 *
 * Talks to OpenAI / Anthropic / Google directly with an API key instead of
 * automating a logged-in browser session. Useful as a fallback when the
 * browser is unavailable, rate-limited, or blocked.
 */
export class ApiProvider implements Provider {
  readonly id: string;
  readonly name: string;
  readonly type: ProviderType = 'api';

  private format: ApiProviderFormat;
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private _status: ProviderStatus = 'disconnected';
  private tools: ToolDescription[] = [];
  private abortController: AbortController | null = null;
  private lastError: string | null = null;

  private anthropicAdapter = new AnthropicAdapter();
  private googleAdapter = new GoogleAdapter();

  constructor(options: ApiProviderOptions) {
    this.id = options.id;
    this.name = options.name ?? options.id;
    this.format = options.format;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URLS[options.format]).replace(/\/$/, '');
    this.apiKey = resolveApiKey(options.format, options.apiKey);
    this.model = options.model ?? options.id;
  }

  get status(): ProviderStatus {
    return this._status;
  }

  async connect(): Promise<void> {
    if (!this.apiKey) {
      this._status = 'error';
      this.lastError = `No API key for ${this.format}. Set ${ENV_KEYS[this.format].join(' or ')}.`;
      throw new Error(this.lastError);
    }
    this._status = 'connected';
  }

  async disconnect(): Promise<void> {
    this.cancel();
    this._status = 'disconnected';
  }

  async send(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.ensureConnected();
    this._status = 'busy';
    this.abortController = new AbortController();

    try {
      if (this.format === 'anthropic') {
        const body = this.anthropicAdapter.formatForAnthropic(request);
        const json = await this.post('/messages', body, {
          'anthropic-version': '2023-06-01',
        });
        return this.anthropicAdapter.parseAnthropicResponse(json as never);
      }

      if (this.format === 'google') {
        const body = this.googleAdapter.formatForGoogle(request);
        const json = await this.post(`/models/${encodeURIComponent(this.model)}:generateContent`, body);
        return this.googleAdapter.parseGoogleResponse(json as never);
      }

      // OpenAI-compatible passthrough.
      const body = {
        model: this.model,
        messages: request.messages,
        tools: request.tools,
        tool_choice: request.tool_choice,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
      };
      const json = await this.post('/chat/completions', body);
      return json as ChatCompletionResponse;
    } catch (error) {
      this._status = 'error';
      this.lastError = error instanceof Error ? error.message : 'Request failed';
      throw error;
    } finally {
      this._status = this._status === 'error' ? 'error' : 'connected';
    }
  }

  async *stream(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    this.ensureConnected();
    this._status = 'busy';
    this.abortController = new AbortController();
    const chunkId = `api-${Date.now()}`;

    const makeChunk = (content: string | undefined, finishReason: 'stop' | 'tool_calls' | 'length' | null = null): ChatCompletionChunk => ({
      id: chunkId,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [{
        index: 0,
        delta: { role: 'assistant' as const, content },
        finish_reason: finishReason,
      }],
    });

    try {
      const sse = await this.postStream(request);

      for await (const event of sse) {
        if (event === '[DONE]') {
          yield makeChunk(undefined, 'stop');
          return;
        }
        const text = this.extractDelta(event, this.format);
        if (text) yield makeChunk(text);
      }

      yield makeChunk(undefined, 'stop');
    } catch (error) {
      this._status = 'error';
      this.lastError = error instanceof Error ? error.message : 'Stream failed';
      throw error;
    } finally {
      this._status = this._status === 'error' ? 'error' : 'connected';
    }
  }

  async health(): Promise<HealthCheckResult> {
    return {
      healthy: this._status === 'connected' || this._status === 'busy',
      error: this.lastError ?? (!this.apiKey ? 'Missing API key' : undefined),
      details: {
        status: this._status,
        format: this.format,
        model: this.model,
      },
    };
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      images: false,
      files: false,
      thinking: false,
      toolCalling: true,
      webSearch: false,
      markdown: true,
      codeGeneration: true,
      multiModal: false,
    };
  }

  getTools(): ToolDescription[] {
    return this.tools;
  }

  setTools(tools: ToolDescription[]): void {
    this.tools = tools;
  }

  cancel(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  private ensureConnected(): void {
    if (this._status !== 'connected' && this._status !== 'busy') {
      throw new Error('Provider not connected');
    }
  }

  private authHeaders(): Record<string, string> {
    if (this.format === 'anthropic') {
      return { 'x-api-key': this.apiKey };
    }
    if (this.format === 'google') {
      return { 'x-goog-api-key': this.apiKey };
    }
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  private async post(path: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders(),
        ...extraHeaders,
      },
      body: JSON.stringify(body),
      signal: this.abortController?.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API error ${res.status}: ${text.slice(0, 300)}`);
    }

    return res.json();
  }

  /**
   * POST with stream:true and yield raw `data:` payload strings.
   */
  private async *postStream(request: ChatCompletionRequest): AsyncIterable<string> {
    let url: string;
    let body: unknown;
    const headers = this.authHeaders();

    if (this.format === 'anthropic') {
      url = `${this.baseUrl}/messages`;
      body = { ...this.anthropicAdapter.formatForAnthropic(request), stream: true };
      headers['anthropic-version'] = '2023-06-01';
    } else if (this.format === 'google') {
      url = `${this.baseUrl}/models/${encodeURIComponent(this.model)}:streamGenerateContent?alt=sse`;
      body = this.googleAdapter.formatForGoogle(request);
    } else {
      url = `${this.baseUrl}/chat/completions`;
      body = {
        model: this.model,
        messages: request.messages,
        tools: request.tools,
        stream: true,
      };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: this.abortController?.signal,
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw new Error(`Stream error ${res.status}: ${text.slice(0, 300)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Anthropic streams events without a "data:" prefix.
        if (this.format === 'anthropic') {
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';
          for (const raw of events) {
            const dataLine = raw.split('\n').find((l) => l.startsWith('data:'));
            if (dataLine) yield dataLine.slice(5).trim();
          }
          continue;
        }

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) yield trimmed.slice(5).trim();
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private extractDelta(event: string, format: ApiProviderFormat): string | undefined {
    if (!event) return undefined;
    try {
      const obj = JSON.parse(event) as Record<string, unknown>;

      if (format === 'anthropic') {
        if (obj.type === 'content_block_delta') {
          const delta = obj.delta as { type?: string; text?: string } | undefined;
          if (delta?.type === 'text_delta' && typeof delta.text === 'string') return delta.text;
        }
        return undefined;
      }

      if (format === 'google') {
        const candidates = obj.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
        const text = candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
        return text || undefined;
      }

      // OpenAI-compatible.
      const choices = obj.choices as Array<{ delta?: { content?: string } }> | undefined;
      return choices?.[0]?.delta?.content ?? undefined;
    } catch {
      return undefined;
    }
  }
}
