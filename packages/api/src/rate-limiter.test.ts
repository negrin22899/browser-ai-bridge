import { describe, it, expect } from 'vitest';
import { RateLimiter } from '../rate-limiter.js';

describe('RateLimiter', () => {
  it('should allow requests within limit', () => {
    const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 10 });

    const result = limiter.check('test-key');

    expect(result.allowed).toBe(true);
    expect(result.info.remaining).toBe(9);
    expect(result.info.total).toBe(10);
  });

  it('should block requests when limit exceeded', () => {
    const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 2 });

    limiter.check('test-key');
    limiter.check('test-key');
    const result = limiter.check('test-key');

    expect(result.allowed).toBe(false);
    expect(result.info.remaining).toBe(0);
  });

  it('should track different keys separately', () => {
    const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 2 });

    limiter.check('key1');
    limiter.check('key1');

    const result = limiter.check('key2');

    expect(result.allowed).toBe(true);
    expect(result.info.remaining).toBe(1);
  });

  it('should reset after window expires', () => {
    const limiter = new RateLimiter({ windowMs: 100, maxRequests: 1 });

    limiter.check('test-key');
    const blocked = limiter.check('test-key');
    expect(blocked.allowed).toBe(false);

    // Wait for window to expire
    return new Promise(resolve => setTimeout(resolve, 150)).then(() => {
      const result = limiter.check('test-key');
      expect(result.allowed).toBe(true);
    });
  });

  it('should get info without incrementing', () => {
    const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 10 });

    limiter.check('test-key');
    const info = limiter.getInfo('test-key');

    expect(info.remaining).toBe(9);
  });

  it('should reset specific key', () => {
    const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 1 });

    limiter.check('test-key');
    limiter.reset('test-key');

    const result = limiter.check('test-key');
    expect(result.allowed).toBe(true);
  });
});
