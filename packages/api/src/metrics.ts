export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface MetricsConfig {
  enabled: boolean;
  prefix?: string;
}

/**
 * Metrics Collector - collects and stores metrics
 */
export class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map();
  private enabled: boolean;
  private prefix: string;

  constructor(config?: MetricsConfig) {
    this.enabled = config?.enabled ?? true;
    this.prefix = config?.prefix ?? 'bab';
  }

  /**
   * Increment a counter
   */
  increment(name: string, labels?: Record<string, string>): void {
    if (!this.enabled) return;

    const key = this.getKey(name, labels);
    const existing = this.metrics.get(key);

    if (existing && existing.length > 0) {
      const last = existing[existing.length - 1];
      this.record(name, last.value + 1, labels);
    } else {
      this.record(name, 1, labels);
    }
  }

  /**
   * Record a gauge value
   */
  gauge(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.enabled) return;
    this.record(name, value, labels);
  }

  /**
   * Record a histogram value
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.enabled) return;
    this.record(name, value, labels);
  }

  /**
   * Record a metric
   */
  private record(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const metric: Metric = {
      name: `${this.prefix}.${name}`,
      value,
      timestamp: Date.now(),
      labels,
    };

    const existing = this.metrics.get(key) ?? [];
    existing.push(metric);

    // Keep only last 1000 entries per metric
    if (existing.length > 1000) {
      existing.shift();
    }

    this.metrics.set(key, existing);
  }

  /**
   * Get metric key
   */
  private getKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  /**
   * Get all metrics
   */
  getMetrics(): Metric[] {
    const result: Metric[] = [];
    for (const metrics of this.metrics.values()) {
      if (metrics.length > 0) {
        result.push(metrics[metrics.length - 1]);
      }
    }
    return result;
  }

  /**
   * Get metric history
   */
  getHistory(name: string, labels?: Record<string, string>): Metric[] {
    const key = this.getKey(name, labels);
    return this.metrics.get(key) ?? [];
  }

  /**
   * Get metric value
   */
  getValue(name: string, labels?: Record<string, string>): number | undefined {
    const key = this.getKey(name, labels);
    const metrics = this.metrics.get(key);
    if (metrics && metrics.length > 0) {
      return metrics[metrics.length - 1].value;
    }
    return undefined;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
  }

  /**
   * Get metrics as Prometheus format
   */
  toPrometheus(): string {
    const lines: string[] = [];

    for (const metrics of this.metrics.values()) {
      if (metrics.length === 0) continue;

      const last = metrics[metrics.length - 1];
      const labelStr = last.labels
        ? Object.entries(last.labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',')
        : '';

      lines.push(`${last.name}${labelStr ? `{${labelStr}}` : ''} ${last.value}`);
    }

    return lines.join('\n');
  }
}

/**
 * Request metrics middleware helper
 */
export function createRequestMetrics(collector: MetricsCollector) {
  return {
    startRequest(): () => void {
      const start = Date.now();
      collector.increment('requests.total');

      return () => {
        const duration = Date.now() - start;
        collector.histogram('requests.duration', duration);
      };
    },

    recordError(error: string): void {
      collector.increment('requests.errors', { error });
    },

    recordProviderRequest(provider: string): void {
      collector.increment('provider.requests', { provider });
    },

    recordProviderError(provider: string, error: string): void {
      collector.increment('provider.errors', { provider, error });
    },

    recordToolExecution(tool: string): void {
      collector.increment('tool.executions', { tool });
    },

    recordToolError(tool: string, error: string): void {
      collector.increment('tool.errors', { tool, error });
    },
  };
}
