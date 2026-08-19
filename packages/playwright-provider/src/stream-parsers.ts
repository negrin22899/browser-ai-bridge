/**
 * Provider SSE parsers.
 *
 * The CDP network interceptor captures the raw text chunks of the provider's
 * own streaming endpoint. Each provider formats those chunks differently, so
 * each parser converts one `data:` payload into a text delta (or a done/error
 * signal). Payload shapes drift as sites change; keep these parsers tolerant
 * and add more fallbacks instead of throwing.
 */

export type BlockErrorCode = 'auth_required' | 'rate_limited' | 'captcha';

export interface ParsedEvent {
  /** Text delta to emit to the client. */
  text?: string;
  /** Stream finished. */
  done?: boolean;
  /** Provider reported an error. */
  error?: string;
}

export interface StreamEventParser {
  readonly id: string;
  parse(data: string): ParsedEvent;
}

export interface ProviderStreamConfig {
  readonly id: string;
  /** Regex patterns matched against captured response URLs. */
  readonly urlPatterns: string[];
  /** A fresh parser per stream (parsers may hold per-stream state). */
  createParser(): StreamEventParser;
}

/** Error raised when the provider blocks the request (auth/rate-limit/CAPTCHA). */
export class ProviderBlockError extends Error {
  readonly code: BlockErrorCode;

  constructor(code: BlockErrorCode, message: string) {
    super(message);
    this.name = 'ProviderBlockError';
    this.code = code;
  }
}

export class ProviderStreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderStreamError';
  }
}

/** Map a response status / URL to a block code, if any. */
export function detectBlockError(status: number | undefined, url: string): BlockErrorCode | null {
  const u = url.toLowerCase();
  if (/captcha|recaptcha|challenge|verify|areyouhuman/i.test(u)) return 'captcha';
  if (status === 429) return 'rate_limited';
  if (status === 401) return 'auth_required';
  if (status === 403) return 'auth_required';
  return null;
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
  }
}

function parseJson(data: string): unknown {
  const trimmed = data.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

// ── Gemini ──────────────────────────────────────────────────────
// gemini.google.com streams cumulative text as JSON arrays
// (e.g. `["hello"]` then `["hello world"]`), so we diff against the
// previous value to emit a delta.

export class GeminiStreamParser implements StreamEventParser {
  readonly id = 'gemini';
  private lastText = '';

  parse(data: string): ParsedEvent {
    const parsed = parseJson(data);
    if (parsed === undefined) return {};

    const strings: string[] = [];
    collectStrings(parsed, strings);
    if (strings.length === 0) return {};

    const text = strings[strings.length - 1] ?? '';
    let delta = text;
    if (this.lastText && text.startsWith(this.lastText)) {
      delta = text.slice(this.lastText.length);
    }
    this.lastText = text;
    return delta ? { text: delta } : {};
  }
}

// ── ChatGPT ─────────────────────────────────────────────────────
// chatgpt.com/backend-api/conversation → SSE with
// `data: {"message":{"content":{"parts":["..."]}}}` and `data: [DONE]`.

export class ChatGPTStreamParser implements StreamEventParser {
  readonly id = 'chatgpt';

  parse(data: string): ParsedEvent {
    const parsed = parseJson(data);
    if (parsed === undefined) return {};

    const obj = parsed as Record<string, unknown>;
    if (obj.error) {
      return { error: typeof obj.error === 'string' ? obj.error : 'ChatGPT error' };
    }
    if (obj.detail) {
      return { error: String(obj.detail) };
    }

    const message = obj.message as Record<string, unknown> | undefined;
    const content = message?.content;
    if (typeof content === 'string' && content) return { text: content };

    const parts = (content as { parts?: unknown } | undefined)?.parts;
    if (Array.isArray(parts)) {
      const text = parts.filter((p): p is string => typeof p === 'string').join('');
      if (text) return { text };
    }

    if (typeof obj.text === 'string') return { text: obj.text };
    const delta = obj.delta as Record<string, unknown> | undefined;
    if (typeof obj.delta === 'string') return { text: obj.delta };
    if (typeof delta?.content === 'string') return { text: delta.content };
    return {};
  }
}

// ── Claude ──────────────────────────────────────────────────────
// claude.ai → SSE with `content_block_delta` events carrying
// `delta.text`, ending with `message_stop` / `message_delta`.

export class ClaudeStreamParser implements StreamEventParser {
  readonly id = 'claude';

  parse(data: string): ParsedEvent {
    const parsed = parseJson(data);
    if (parsed === undefined) return {};

    const obj = parsed as Record<string, unknown>;
    if (obj.type === 'error') {
      const err = obj.error as { message?: string } | undefined;
      return { error: err?.message ?? 'Claude error' };
    }
    if (obj.type === 'message_stop') return { done: true };
    if (obj.type === 'message_delta') {
      const stop = (obj.delta as { stop_reason?: string } | undefined)?.stop_reason;
      if (stop) return { done: true };
    }
    if (obj.type === 'content_block_delta') {
      const delta = obj.delta as { type?: string; text?: string } | undefined;
      if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
        return { text: delta.text };
      }
      if (typeof delta?.text === 'string') return { text: delta.text };
    }
    if (typeof obj.completion === 'string') return { text: obj.completion };
    const delta = obj.delta as { text?: string } | undefined;
    if (typeof delta?.text === 'string') return { text: delta.text };
    if (typeof obj.text === 'string') return { text: obj.text };
    return {};
  }
}

// ── DeepSeek ────────────────────────────────────────────────────
// chat.deepseek.com → OpenAI-compatible SSE:
// `data: {"choices":[{"delta":{"content":"..."}}]}` and `data: [DONE]`.

export class DeepSeekStreamParser implements StreamEventParser {
  readonly id = 'deepseek';

  parse(data: string): ParsedEvent {
    const parsed = parseJson(data);
    if (parsed === undefined) return {};

    const obj = parsed as Record<string, unknown>;
    const err = obj.error as { message?: string } | undefined;
    if (err?.message) return { error: err.message };

    const choices = obj.choices as Array<Record<string, unknown>> | undefined;
    const first = choices?.[0];
    const delta = first?.delta as Record<string, unknown> | undefined;
    if (typeof delta?.content === 'string' && delta.content) return { text: delta.content };

    const message = first?.message as { content?: string } | undefined;
    if (typeof message?.content === 'string' && message.content) return { text: message.content };

    return {};
  }
}

// ── Config registry ─────────────────────────────────────────────

export const PROVIDER_STREAM_CONFIGS: Record<string, ProviderStreamConfig> = {
  gemini: {
    id: 'gemini',
    urlPatterns: ['StreamGenerateContent'],
    createParser: () => new GeminiStreamParser(),
  },
  chatgpt: {
    id: 'chatgpt',
    urlPatterns: ['backend-api/conversation'],
    createParser: () => new ChatGPTStreamParser(),
  },
  claude: {
    id: 'claude',
    urlPatterns: ['chat_conversations.*completion', '/completion'],
    createParser: () => new ClaudeStreamParser(),
  },
  deepseek: {
    id: 'deepseek',
    urlPatterns: ['chat/completion'],
    createParser: () => new DeepSeekStreamParser(),
  },
};

export function getProviderStreamConfig(id: string): ProviderStreamConfig {
  const config = PROVIDER_STREAM_CONFIGS[id];
  if (!config) throw new Error(`Unknown provider stream config: ${id}`);
  return config;
}
