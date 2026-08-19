import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ResponseCache } from './response-cache.js';
import type { ChatCompletionResponse, Message } from '@bab/protocol';

function makeResponse(text: string): ChatCompletionResponse {
  return {
    id: `id-${text}`,
    object: 'chat.completion',
    created: 1,
    model: 'gpt-4o',
    choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
  };
}

describe('ResponseCache', () => {
  it('returns a stored response for the same key', () => {
    const cache = new ResponseCache();
    const key = cache.keyFor('openai', 'gpt-4o', [{ role: 'user', content: 'hi' }]);
    cache.set(key, makeResponse('hello'));
    expect(cache.get(key)?.choices[0].message.content).toBe('hello');
  });

  it('produces different keys for different messages', () => {
    const cache = new ResponseCache();
    const a = cache.keyFor('openai', 'gpt-4o', [{ role: 'user', content: 'a' }]);
    const b = cache.keyFor('openai', 'gpt-4o', [{ role: 'user', content: 'b' }]);
    expect(a).not.toBe(b);
  });

  it('produces different keys for different providers', () => {
    const cache = new ResponseCache();
    const a = cache.keyFor('openai', 'gpt-4o', [{ role: 'user', content: 'a' }]);
    const b = cache.keyFor('anthropic', 'gpt-4o', [{ role: 'user', content: 'a' }]);
    expect(a).not.toBe(b);
  });

  it('expires entries after the TTL', () => {
    const cache = new ResponseCache({ ttlMs: 10 });
    const key = cache.keyFor('openai', 'gpt-4o', [{ role: 'user', content: 'hi' }]);
    cache.set(key, makeResponse('hello'));
    expect(cache.get(key)).toBeDefined();

    return new Promise((resolve) => {
      setTimeout(() => {
        expect(cache.get(key)).toBeUndefined();
        resolve();
      }, 20);
    });
  });

  it('persists entries to disk and reloads them', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bab-cache-'));
    try {
      const first = new ResponseCache({ cacheDir: dir });
      const key = first.keyFor('openai', 'gpt-4o', [{ role: 'user', content: 'persist me' }]);
      first.set(key, makeResponse('cached'));

      const second = new ResponseCache({ cacheDir: dir });
      expect(second.get(key)?.choices[0].message.content).toBe('cached');
      expect(second.stats().persistent).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses to cache sensitive prompts', () => {
    const cache = new ResponseCache();
    const secret: Message[] = [{ role: 'user', content: 'OPENAI_API_KEY=sk-live-12345 use it' }];
    const normal: Message[] = [{ role: 'user', content: 'write a hello world' }];

    expect(cache.shouldCache(secret)).toBe(false);
    expect(cache.shouldCache(normal)).toBe(true);
  });

  it('tracks hits and misses in stats', () => {
    const cache = new ResponseCache();
    const key = cache.keyFor('openai', 'gpt-4o', [{ role: 'user', content: 'hi' }]);

    cache.get(key); // miss
    cache.set(key, makeResponse('hello'));
    cache.get(key); // hit
    cache.get(key); // hit

    expect(cache.stats()).toMatchObject({ size: 1, hits: 2, misses: 1, persistent: false });
  });
});
