import { createHash } from 'node:crypto';
import type { ChatCompletionResponse, Message } from '@bab/protocol';

interface CacheEntry {
  response: ChatCompletionResponse;
  expiresAt: number;
}

/**
 * Verbatim response cache for stateless (native API) providers.
 *
 * Browser providers keep their conversation state in the DOM, so caching them
 * by message list would return stale/incorrect answers — they are excluded.
 * Only final answers (no tool_calls) are stored, and streaming is never cached.
 */
export class ResponseCache {
  private entries = new Map<string, CacheEntry>();

  constructor(
    private ttlMs = 10 * 60_000,
    private maxEntries = 100
  ) {}

  keyFor(providerId: string, model: string, messages: Message[]): string {
    const canonical = JSON.stringify({ providerId, model, messages });
    return createHash('sha1').update(canonical).digest('hex');
  }

  get(key: string): ChatCompletionResponse | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.response;
  }

  set(key: string, response: ChatCompletionResponse): void {
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, {
      response,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.entries.clear();
  }

  size(): number {
    return this.entries.size;
  }
}
