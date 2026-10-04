import type { MetricsCollector } from './metrics.js';

export interface ProviderReliability {
  requests: number;
  errors: number;
  successRate: number;
  /** 0–100 score used to rank providers. */
  score: number;
}

/**
 * Derive a provider's reliability from the request/error counters.
 * Providers with no recorded traffic score 100 (neutral, not penalized).
 */
export function computeReliability(
  metrics: MetricsCollector,
  providerId: string
): ProviderReliability {
  let requests = 0;
  let errors = 0;

  for (const metric of metrics.getMetrics()) {
    if (metric.labels?.provider !== providerId) continue;
    if (metric.name === 'bab.provider.requests') requests += metric.value;
    else if (metric.name === 'bab.provider.errors') errors += metric.value;
  }

  const successRate = requests > 0 ? (requests - errors) / requests : 1;
  return {
    requests,
    errors,
    successRate,
    score: Math.max(0, Math.round(successRate * 100)),
  };
}
