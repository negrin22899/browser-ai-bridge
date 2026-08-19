import { describe, it, expect } from 'vitest';
import { estimateTokens, estimateMessageTokens, DEFAULT_CONTEXT_LIMIT } from './tokenizer.js';

describe('estimateTokens', () => {
  it('returns 0 for empty input', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('estimates latin text at ~4 chars per token', () => {
    expect(estimateTokens('hello world')).toBeGreaterThan(0);
    expect(estimateTokens('hello world')).toBeLessThanOrEqual(4);
  });

  it('counts CJK characters as roughly one token each', () => {
    const fourCjk = '你好世界';
    expect(estimateTokens(fourCjk)).toBe(4);
  });

  it('grows with longer input', () => {
    expect(estimateTokens('a'.repeat(400))).toBeGreaterThan(estimateTokens('a'));
  });
});

describe('estimateMessageTokens', () => {
  it('sums message contents', () => {
    const total = estimateMessageTokens([
      { content: 'hello world' },
      { content: '你好世界' },
      { content: null },
    ]);
    expect(total).toBeGreaterThan(0);
  });
});

describe('DEFAULT_CONTEXT_LIMIT', () => {
  it('is a sane default', () => {
    expect(DEFAULT_CONTEXT_LIMIT).toBeGreaterThan(1000);
  });
});
