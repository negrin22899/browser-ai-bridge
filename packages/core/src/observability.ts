import { randomUUID } from 'node:crypto';

/**
 * Observability - Trace ID management
 * 
 * Every request gets a trace_id that follows it through the entire pipeline.
 */

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
  attributes: Record<string, unknown>;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  attributes: Record<string, unknown>;
  events: Array<{
    name: string;
    timestamp: number;
    attributes: Record<string, unknown>;
  }>;
}

/**
 * Create a new trace context
 */
export function createTraceContext(attributes?: Record<string, unknown>): TraceContext {
  return {
    traceId: randomUUID(),
    spanId: randomUUID(),
    startTime: Date.now(),
    attributes: attributes ?? {},
  };
}

/**
 * Create a child span from a trace context
 */
export function createSpan(
  parent: TraceContext,
  name: string,
  attributes?: Record<string, unknown>
): TraceContext {
  return {
    traceId: parent.traceId,
    spanId: randomUUID(),
    parentSpanId: parent.spanId,
    startTime: Date.now(),
    attributes: { ...parent.attributes, spanName: name, ...attributes },
  };
}

/**
 * Trace collector - collects spans for a trace
 */
export class TraceCollector {
  private traces = new Map<string, Span[]>();

  /**
   * Start a new span
   */
  startSpan(
    traceId: string,
    spanId: string,
    name: string,
    parentSpanId?: string,
    attributes?: Record<string, unknown>
  ): void {
    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      name,
      startTime: Date.now(),
      attributes: attributes ?? {},
      events: [],
    };

    const spans = this.traces.get(traceId) ?? [];
    spans.push(span);
    this.traces.set(traceId, spans);
  }

  /**
   * End a span
   */
  endSpan(traceId: string, spanId: string): void {
    const spans = this.traces.get(traceId);
    if (!spans) return;

    const span = spans.find(s => s.spanId === spanId);
    if (span) {
      span.endTime = Date.now();
    }
  }

  /**
   * Add event to a span
   */
  addEvent(
    traceId: string,
    spanId: string,
    eventName: string,
    attributes?: Record<string, unknown>
  ): void {
    const spans = this.traces.get(traceId);
    if (!spans) return;

    const span = spans.find(s => s.spanId === spanId);
    if (span) {
      span.events.push({
        name: eventName,
        timestamp: Date.now(),
        attributes: attributes ?? {},
      });
    }
  }

  /**
   * Get all spans for a trace
   */
  getTrace(traceId: string): Span[] {
    return this.traces.get(traceId) ?? [];
  }

  /**
   * Get trace duration
   */
  getTraceDuration(traceId: string): number {
    const spans = this.traces.get(traceId);
    if (!spans || spans.length === 0) return 0;

    const startTime = Math.min(...spans.map(s => s.startTime));
    const endTime = Math.max(...spans.filter(s => s.endTime).map(s => s.endTime!));

    return endTime - startTime;
  }

  /**
   * Clear old traces
   */
  cleanup(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [traceId, spans] of this.traces) {
      const lastActivity = Math.max(...spans.map(s => s.endTime ?? s.startTime));
      if (now - lastActivity > maxAge) {
        this.traces.delete(traceId);
      }
    }
  }

  /**
   * Export trace as JSON
   */
  exportTrace(traceId: string): string | null {
    const spans = this.traces.get(traceId);
    if (!spans) return null;

    return JSON.stringify({
      traceId,
      spans,
      duration: this.getTraceDuration(traceId),
    }, null, 2);
  }
}

/**
 * Global trace collector instance
 */
export const traceCollector = new TraceCollector();
