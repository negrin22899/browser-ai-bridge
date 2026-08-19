import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ChatCompletionResponse, Message } from '@bab/protocol';
import { containsSensitiveData } from './redaction.js';

interface CacheEntry {
  response: ChatCompletionResponse;
  expiresAt: number;
}

export interface ResponseCacheOptions {
  ttlMs?: number;
  maxEntries?: number;
  /** Enable disk persistence so the cache survives restarts (opt-in). */
  cacheDir?: string;
}

export interface ResponseCacheStats {
  size: number;
  maxEntries: number;
  hits: number;
  misses: number;
  persistent: boolean;
  cacheDir?: string;
}

const DEFAULT_TTL_MS = 10 * 60_000;
const DEFAULT_MAX_ENTRIES = 100;

/**
 * Verbatim response cache for stateless (native API) providers.
 *
 * Browser providers keep their conversation state in the DOM, so caching them
 * by message list would return stale/incorrect answers — they are excluded.
 * Only final answers (no tool_calls) are stored, and streaming is never cached.
 *
 * When `cacheDir` is set, entries persist to disk so identical prompts are
 * answered instantly (and free) across restarts. Privacy is respected: requests
 * whose content looks like secrets are never cached (see `shouldCache`).
 */
export class ResponseCache {
  private entries = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly cacheDir?: string;
  private readonly cacheFile?: string;

  constructor(options: ResponseCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.cacheDir = options.cacheDir;
    this.cacheFile = options.cacheDir ? path.join(options.cacheDir, 'responses.json') : undefined;

    if (this.cacheFile) this.load();
  }

  keyFor(providerId: string, model: string, messages: Message[]): string {
    const canonical = JSON.stringify({ providerId, model, messages });
    return createHash('sha1').update(canonical).digest('hex');
  }

  /** Never cache prompts that carry credentials/tokens. */
  shouldCache(messages: Message[]): boolean {
    return !containsSensitiveData(JSON.stringify(messages));
  }

  get(key: string): ChatCompletionResponse | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (entry.expiresAt < Date.now()) {
      this.entries.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.response;
  }

  set(key: string, response: ChatCompletionResponse): void {
    if (this.entries.size >= this.maxEntries && !this.entries.has(key)) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, {
      response,
      expiresAt: Date.now() + this.ttlMs,
    });
    if (this.cacheFile) this.save();
  }

  clear(): void {
    this.entries.clear();
    if (this.cacheFile) {
      try {
        fs.rmSync(this.cacheFile, { force: true });
      } catch {
        // Ignore cleanup errors.
      }
    }
  }

  size(): number {
    return this.entries.size;
  }

  stats(): ResponseCacheStats {
    return {
      size: this.entries.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      persistent: !!this.cacheFile,
      cacheDir: this.cacheDir,
    };
  }

  private load(): void {
    try {
      if (!this.cacheFile || !fs.existsSync(this.cacheFile)) return;
      const raw = JSON.parse(fs.readFileSync(this.cacheFile, 'utf-8'));
      const entries = Array.isArray(raw?.entries) ? raw.entries : [];
      for (const entry of entries) {
        if (!entry?.key || !entry?.response) continue;
        if (entry.expiresAt < Date.now()) continue;
        this.entries.set(entry.key, { response: entry.response, expiresAt: entry.expiresAt });
      }
    } catch (error) {
      console.error('Failed to load response cache:', error);
    }
  }

  private save(): void {
    try {
      if (!this.cacheFile || !this.cacheDir) return;
      fs.mkdirSync(this.cacheDir, { recursive: true });
      const entries = Array.from(this.entries.entries()).map(([key, entry]) => ({
        key,
        response: entry.response,
        expiresAt: entry.expiresAt,
      }));
      fs.writeFileSync(this.cacheFile, JSON.stringify({ entries }, null, 2));
    } catch (error) {
      console.error('Failed to persist response cache:', error);
    }
  }
}
