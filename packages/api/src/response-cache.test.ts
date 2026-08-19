import { describe, it, expect } from 'vitest';
import { ResponseCache } from './response-cache.js';
import type { ChatCompletionResponse } from '@bab/protocol';

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
    const cache = new ResponseCache(10);
    const key = cache.keyFor('openai', 'gpt-4o', [{ role: 'user', content: 'hi' }]);
    cache.set(key, makeResponse('hello'));
    expect(cache.get(key)).toBeDefined();

    // Wait past the 10ms TTL.
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(cache.get(key)).toBeUndefined();
        resolve();
      }, 20);
    });
  });
});
