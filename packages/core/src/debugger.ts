import { randomUUID } from 'node:crypto';

/**
 * AI Debugger — Trace System
 * 
 * Built on top of existing Event Bus, Recorder, Replay, and trace_id.
 * This is an observation and control layer, NOT a new runtime architecture.
 */

// ============================================================================
// TRACE DATA MODEL
// ============================================================================

export interface Trace {
  /** Unique trace ID */
  traceId: string;
  
  /** Associated session ID */
  sessionId: string;
  
  /** Associated request ID */
  requestId?: string;
  
  /** Provider ID */
  providerId?: string;
  
  /** Trace start time */
  startTime: number;
  
  /** Trace end time */
  endTime?: number;
  
  /** Total duration in ms */
  duration?: number;
  
  /** Trace status */
  status: TraceStatus;
  
  /** Events in this trace */
  events: TraceEvent[];
  
  /** Trace metadata */
  metadata: TraceMetadata;
}

export type TraceStatus = 
  | 'active'      // Currently executing
  | 'completed'   // Successfully completed
  | 'failed'      // Failed with error
  | 'paused'      // Paused at breakpoint
  | 'cancelled';  // Cancelled by user

export interface TraceMetadata {
  /** Original request */
  request?: {
    model: string;
    messageCount: number;
  };
  
  /** Provider info */
  provider?: {
    id: string;
    name: string;
    state: string;
  };
  
  /** Capabilities at trace time */
  capabilities?: string[];
  
  /** Available tools at trace time */
  availableTools?: string[];
  
  /** User permissions at trace time */
  permissions?: Record<string, string>;
}

// ============================================================================
// TRACE EVENT
// ============================================================================

export interface TraceEvent {
  /** Unique event ID */
  eventId: string;
  
  /** Associated trace ID */
  traceId: string;
  
  /** Event timestamp */
  timestamp: number;
  
  /** Event type */
  type: TraceEventType;
  
  /** Component that generated the event */
  component: TraceComponent;
  
  /** Event status */
  status: EventStatus;
  
  /** Duration in ms */
  duration?: number;
  
  /** Event data */
  data: TraceEventData;
  
  /** Error if failed */
  error?: TraceError;
  
  /** Related event IDs */
  relatedEvents?: string[];
  
  /** Parent event ID (for nested events) */
  parentEventId?: string;
}

export type TraceEventType = 
  | 'request.received'
  | 'capability.resolved'
  | 'tool.negotiated'
  | 'permission.checked'
  | 'provider.request'
  | 'provider.response'
  | 'browser.action'
  | 'browser.response'
  | 'tool.executed'
  | 'tool.result'
  | 'response.sent'
  | 'error'
  | 'breakpoint.hit'
  | 'replay.started'
  | 'replay.step'
  | 'replay.completed';

export type TraceComponent = 
  | 'api'
  | 'bridge'
  | 'capability_resolver'
  | 'tool_negotiator'
  | 'permission_engine'
  | 'provider'
  | 'browser'
  | 'tool'
  | 'runtime'
  | 'debugger';

export type EventStatus = 
  | 'started'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'paused';

// ============================================================================
// TRACE EVENT DATA
// ============================================================================

export interface TraceEventData {
  /** Input data */
  input?: unknown;
  
  /** Output data */
  output?: unknown;
  
  /** Capabilities snapshot */
  capabilities?: {
    provider?: string[];
    runtime?: string[];
    available?: string[];
  };
  
  /** Permissions snapshot */
  permissions?: {
    allowed?: string[];
    denied?: string[];
    confirm?: string[];
  };
  
  /** Provider state */
  providerState?: {
    state: string;
    latency?: number;
    healthy?: boolean;
  };
  
  /** Tool info */
  tool?: {
    name: string;
    requirements?: string[];
    resolved?: boolean;
    available?: boolean;
    reason?: string;
  };
  
  /** Browser action */
  browser?: {
    action: string;
    selector?: string;
    fallbackUsed?: boolean;
    selectorStrategy?: string;
  };
  
  /** Custom data */
  custom?: Record<string, unknown>;
}

// ============================================================================
// TRACE ERROR
// ============================================================================

export interface TraceError {
  /** Error code */
  code: string;
  
  /** Error message */
  message: string;
  
  /** Is recoverable */
  recoverable: boolean;
  
  /** Recovery suggestion */
  recovery?: string;
  
  /** Root cause chain */
  rootCause?: TraceErrorCause[];
}

export interface TraceErrorCause {
  /** Component where error originated */
  component: string;
  
  /** What happened */
  description: string;
  
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// BREAKPOINT
// ============================================================================

export interface Breakpoint {
  /** Breakpoint ID */
  id: string;
  
  /** Event type to break on */
  eventType: TraceEventType;
  
  /** Component to break on (optional) */
  component?: TraceComponent;
  
  /** Condition (optional) */
  condition?: string;
  
  /** Is enabled */
  enabled: boolean;
  
  /** Hit count */
  hitCount: number;
}

// ============================================================================
// TRACE COLLECTOR
// ============================================================================

/**
 * Trace Collector - collects and stores traces
 */
export class TraceCollector {
  private traces = new Map<string, Trace>();
  private events = new Map<string, TraceEvent[]>();
  private breakpoints = new Map<string, Breakpoint>();
  private maxTraces: number;

  constructor(options?: { maxTraces?: number; maxEventsPerTrace?: number }) {
    this.maxTraces = options?.maxTraces ?? 1000;
  }

  /**
   * Create a new trace
   */
  createTrace(sessionId: string, metadata?: TraceMetadata): Trace {
    const trace: Trace = {
      traceId: randomUUID(),
      sessionId,
      startTime: Date.now(),
      status: 'active',
      events: [],
      metadata: metadata ?? {},
    };

    this.traces.set(trace.traceId, trace);
    this.events.set(trace.traceId, []);

    // Cleanup old traces
    this.cleanup();

    return trace;
  }

  /**
   * Add event to trace
   */
  addEvent(
    traceId: string,
    type: TraceEventType,
    component: TraceComponent,
    data: TraceEventData,
    options?: {
      status?: EventStatus;
      duration?: number;
      error?: TraceError;
      parentEventId?: string;
    }
  ): TraceEvent {
    const trace = this.traces.get(traceId);
    if (!trace) {
      throw new Error(`Trace not found: ${traceId}`);
    }

    const event: TraceEvent = {
      eventId: randomUUID(),
      traceId,
      timestamp: Date.now(),
      type,
      component,
      status: options?.status ?? 'started',
      duration: options?.duration,
      data,
      error: options?.error,
      parentEventId: options?.parentEventId,
    };

    const events = this.events.get(traceId) ?? [];
    events.push(event);
    this.events.set(traceId, events);

    // Update trace status if error
    if (options?.status === 'failed') {
      trace.status = 'failed';
    }

    // Check breakpoints
    this.checkBreakpoints(event);

    return event;
  }

  /**
   * Complete an event
   */
  completeEvent(
    traceId: string,
    eventId: string,
    data?: TraceEventData,
    duration?: number
  ): void {
    const events = this.events.get(traceId);
    if (!events) return;

    const event = events.find(e => e.eventId === eventId);
    if (event) {
      event.status = 'completed';
      event.duration = duration;
      if (data) {
        event.data = { ...event.data, ...data };
      }
    }
  }

  /**
   * Complete a trace
   */
  completeTrace(traceId: string, status: TraceStatus = 'completed'): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.status = status;
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): Trace | undefined {
    return this.traces.get(traceId);
  }

  /**
   * Get events for a trace
   */
  getEvents(traceId: string): TraceEvent[] {
    return this.events.get(traceId) ?? [];
  }

  /**
   * Get all traces
   */
  getAllTraces(): Trace[] {
    return Array.from(this.traces.values());
  }

  /**
   * Get traces for a session
   */
  getTracesBySession(sessionId: string): Trace[] {
    return Array.from(this.traces.values())
      .filter(t => t.sessionId === sessionId);
  }

  /**
   * Add breakpoint
   */
  addBreakpoint(
    eventType: TraceEventType,
    options?: {
      component?: TraceComponent;
      condition?: string;
    }
  ): Breakpoint {
    const breakpoint: Breakpoint = {
      id: randomUUID(),
      eventType,
      component: options?.component,
      condition: options?.condition,
      enabled: true,
      hitCount: 0,
    };

    this.breakpoints.set(breakpoint.id, breakpoint);
    return breakpoint;
  }

  /**
   * Remove breakpoint
   */
  removeBreakpoint(breakpointId: string): void {
    this.breakpoints.delete(breakpointId);
  }

  /**
   * Get all breakpoints
   */
  getBreakpoints(): Breakpoint[] {
    return Array.from(this.breakpoints.values());
  }

  /**
   * Check if event hits a breakpoint
   */
  private checkBreakpoints(event: TraceEvent): boolean {
    for (const bp of this.breakpoints.values()) {
      if (!bp.enabled) continue;

      if (bp.eventType === event.type) {
        if (!bp.component || bp.component === event.component) {
          bp.hitCount++;
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Build timeline for a trace
   */
  buildTimeline(traceId: string): TraceTimelineEntry[] {
    const events = this.getEvents(traceId);
    const trace = this.getTrace(traceId);
    if (!trace) return [];

    const startTime = trace.startTime;
    return events.map(event => ({
      eventId: event.eventId,
      relativeTime: event.timestamp - startTime,
      timestamp: event.timestamp,
      type: event.type,
      component: event.component,
      status: event.status,
      duration: event.duration,
      summary: this.summarizeEvent(event),
      hasError: !!event.error,
    }));
  }

  /**
   * Summarize an event for display
   */
  private summarizeEvent(event: TraceEvent): string {
    switch (event.type) {
      case 'request.received':
        return `Model: ${event.data.input ?? 'unknown'}`;
      case 'capability.resolved':
        return `Tools: ${event.data.capabilities?.available?.length ?? 0}`;
      case 'tool.negotiated':
        return `Tool: ${event.data.tool?.name ?? 'unknown'}`;
      case 'permission.checked':
        return `${event.data.tool?.name}: ${event.data.tool?.available ? 'allowed' : 'denied'}`;
      case 'provider.request':
        return `Provider: ${event.data.providerState?.state ?? 'unknown'}`;
      case 'provider.response':
        return `Latency: ${event.data.providerState?.latency ?? 0}ms`;
      case 'browser.action':
        return `${event.data.browser?.action}: ${event.data.browser?.selector ?? ''}`;
      case 'tool.executed':
        return `Tool: ${event.data.tool?.name ?? 'unknown'}`;
      case 'error':
        return event.error?.message ?? 'Unknown error';
      default:
        return event.type;
    }
  }

  /**
   * Explain why a tool is unavailable
   */
  explainToolUnavailability(traceId: string, toolName: string): ToolExplanation | null {
    const events = this.getEvents(traceId);
    
    // Find tool negotiation event
    const toolEvent = events.find(
      e => e.type === 'tool.negotiated' && e.data.tool?.name === toolName
    );

    if (!toolEvent || !toolEvent.data.tool) {
      return null;
    }

    const tool = toolEvent.data.tool;
    return {
      toolName,
      available: tool.available ?? false,
      reason: tool.reason ?? 'Unknown',
      requirements: tool.requirements ?? [],
      resolvedCapabilities: toolEvent.data.capabilities?.available ?? [],
      providerCapabilities: toolEvent.data.capabilities?.provider ?? [],
      runtimeCapabilities: toolEvent.data.capabilities?.runtime ?? [],
    };
  }

  /**
   * Cleanup old traces
   */
  private cleanup(): void {
    if (this.traces.size <= this.maxTraces) return;

    // Remove oldest traces
    const sorted = Array.from(this.traces.entries())
      .sort((a, b) => a[1].startTime - b[1].startTime);

    const toRemove = sorted.slice(0, sorted.length - this.maxTraces);
    for (const [traceId] of toRemove) {
      this.traces.delete(traceId);
      this.events.delete(traceId);
    }
  }

  /**
   * Export trace as JSON
   */
  exportTrace(traceId: string): string | null {
    const trace = this.traces.get(traceId);
    if (!trace) return null;

    const events = this.events.get(traceId) ?? [];
    return JSON.stringify({ trace, events }, null, 2);
  }

  /**
   * Clear all traces
   */
  clear(): void {
    this.traces.clear();
    this.events.clear();
  }
}

// ============================================================================
// TIMELINE ENTRY
// ============================================================================

export interface TraceTimelineEntry {
  eventId: string;
  relativeTime: number;
  timestamp: number;
  type: TraceEventType;
  component: TraceComponent;
  status: EventStatus;
  duration?: number;
  summary: string;
  hasError: boolean;
}

// ============================================================================
// TOOL EXPLANATION
// ============================================================================

export interface ToolExplanation {
  toolName: string;
  available: boolean;
  reason: string;
  requirements: string[];
  resolvedCapabilities: string[];
  providerCapabilities: string[];
  runtimeCapabilities: string[];
}

/**
 * Global trace collector instance
 */
export const traceCollector = new TraceCollector();
