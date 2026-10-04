import { describe, it, expect } from 'vitest';
import { computeReliability } from './provider-reliability.js';
import { MetricsCollector } from './metrics.js';

describe('computeReliability', () => {
  it('scores providers with no traffic at 100', () => {
    const metrics = new MetricsCollector();
    expect(computeReliability(metrics, 'unknown').score).toBe(100);
    expect(computeReliability(metrics, 'unknown').successRate).toBe(1);
  });

  it('derives score from request and error counters', () => {
    const metrics = new MetricsCollector();
    for (let i = 0; i < 3; i++) metrics.increment('provider.requests', { provider: 'a' });
    metrics.increment('provider.errors', { provider: 'a', error: 'boom' });

    const rel = computeReliability(metrics, 'a');
    expect(rel.requests).toBe(3);
    expect(rel.errors).toBe(1);
    expect(rel.score).toBe(67);
  });

  it('scores an error-heavy provider lower', () => {
    const metrics = new MetricsCollector();
    metrics.increment('provider.requests', { provider: 'good' });
    metrics.increment('provider.requests', { provider: 'bad' });
    metrics.increment('provider.errors', { provider: 'bad', error: 'x' });

    const good = computeReliability(metrics, 'good');
    const bad = computeReliability(metrics, 'bad');
    expect(good.score).toBeGreaterThan(bad.score);
  });
});
