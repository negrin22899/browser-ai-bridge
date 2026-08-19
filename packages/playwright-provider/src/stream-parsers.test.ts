import { describe, it, expect } from 'vitest';
import {
  GeminiStreamParser,
  ChatGPTStreamParser,
  ClaudeStreamParser,
  DeepSeekStreamParser,
  getProviderStreamConfig,
  detectBlockError,
} from './stream-parsers.js';

describe('GeminiStreamParser', () => {
  it('diffs cumulative array payloads into deltas', () => {
    const parser = new GeminiStreamParser();
    expect(parser.parse('["Hello"]')).toEqual({ text: 'Hello' });
    expect(parser.parse('["Hello world"]')).toEqual({ text: ' world' });
    expect(parser.parse('["Hello world!"]')).toEqual({ text: '!' });
  });

  it('ignores non-JSON lines', () => {
    const parser = new GeminiStreamParser();
    expect(parser.parse('[DONE]')).toEqual({});
    expect(parser.parse('')).toEqual({});
  });

  it('extracts the deepest trailing string from nested payloads', () => {
    const parser = new GeminiStreamParser();
    expect(parser.parse('[[["hello", "world"]]]')).toEqual({ text: 'world' });
  });
});

describe('ChatGPTStreamParser', () => {
  it('extracts text from message.content.parts', () => {
    const parser = new ChatGPTStreamParser();
    const ev = parser.parse('{"message":{"content":{"content_type":"text","parts":["hi"]}}}');
    expect(ev).toEqual({ text: 'hi' });
  });

  it('handles plain string content', () => {
    const parser = new ChatGPTStreamParser();
    expect(parser.parse('{"message":{"content":"hello"}}')).toEqual({ text: 'hello' });
  });

  it('surfaces provider errors', () => {
    const parser = new ChatGPTStreamParser();
    expect(parser.parse('{"error":"quota exceeded"}').error).toContain('quota');
    expect(parser.parse('{"detail":"not authorized"}').error).toContain('not authorized');
  });
});

describe('ClaudeStreamParser', () => {
  it('extracts text from content_block_delta', () => {
    const parser = new ClaudeStreamParser();
    const ev = parser.parse('{"type":"content_block_delta","delta":{"type":"text_delta","text":"hello"}}');
    expect(ev).toEqual({ text: 'hello' });
  });

  it('marks message_stop as done', () => {
    const parser = new ClaudeStreamParser();
    expect(parser.parse('{"type":"message_stop"}')).toEqual({ done: true });
    expect(parser.parse('{"type":"message_delta","delta":{"stop_reason":"end_turn"}}')).toEqual({ done: true });
  });

  it('surfaces errors and legacy completion payloads', () => {
    const parser = new ClaudeStreamParser();
    expect(parser.parse('{"type":"error","error":{"message":"overloaded"}}').error).toBe('overloaded');
    expect(parser.parse('{"completion":"legacy"}')).toEqual({ text: 'legacy' });
  });
});

describe('DeepSeekStreamParser', () => {
  it('extracts OpenAI-style delta content', () => {
    const parser = new DeepSeekStreamParser();
    const ev = parser.parse('{"choices":[{"delta":{"content":"hi"}}]}');
    expect(ev).toEqual({ text: 'hi' });
  });

  it('surfaces errors', () => {
    const parser = new DeepSeekStreamParser();
    expect(parser.parse('{"error":{"message":"rate limited"}}').error).toBe('rate limited');
  });
});

describe('provider stream config registry', () => {
  it('has all four providers with URL patterns', () => {
    for (const id of ['gemini', 'chatgpt', 'claude', 'deepseek']) {
      const config = getProviderStreamConfig(id);
      expect(config.urlPatterns.length).toBeGreaterThan(0);
      expect(config.createParser().id).toBe(id);
    }
  });

  it('throws for unknown providers', () => {
    expect(() => getProviderStreamConfig('unknown')).toThrow();
  });
});

describe('detectBlockError', () => {
  it('detects auth, rate limit and captcha', () => {
    expect(detectBlockError(401, 'https://example.com/api')).toBe('auth_required');
    expect(detectBlockError(403, 'https://example.com/api')).toBe('auth_required');
    expect(detectBlockError(429, 'https://example.com/api')).toBe('rate_limited');
    expect(detectBlockError(undefined, 'https://example.com/recaptcha')).toBe('captcha');
    expect(detectBlockError(200, 'https://example.com/api')).toBeNull();
  });
});
