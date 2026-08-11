import type { Trace, TraceEvent, TraceEventType } from './debugger.js';

/**
 * Step-by-Step Replay - replays traces one step at a time
 */

export type ReplayMode = 'full' | 'step' | 'skip-to-event';

export interface ReplayState {
  /** Current mode */
  mode: ReplayMode;
  
  /** Is replaying */
  replaying: boolean;
  
  /** Current event index */
  currentEventIndex: number;
  
  /** Total events */
  totalEvents: number;
  
  /** Current event */
  currentEvent?: TraceEvent;
  
  /** Replay speed (1 = normal, 2 = 2x faster, 0.5 = half speed) */
  speed: number;
  
  /** Paused at step */
  paused: boolean;
}

export interface ReplayOptions {
  /** Replay mode */
  mode?: ReplayMode;
  
  /** Speed multiplier */
  speed?: number;
  
  /** Start from event index */
  startFromIndex?: number;
  
  /** Start from event type */
  startFromEventType?: TraceEventType;
  
  /** Callback for each step */
  onStep?: (event: TraceEvent, index: number) => void;
  
  /** Callback on completion */
  onComplete?: () => void;
  
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Step Replay Controller
 */
export class StepReplayController {
  private state: ReplayState = {
    mode: 'full',
    replaying: false,
    currentEventIndex: 0,
    totalEvents: 0,
    speed: 1,
    paused: false,
  };

  private events: TraceEvent[] = [];
  private options: ReplayOptions = {};
  private resolveStep?: () => void;

  /**
   * Load trace for replay
   */
  load(_trace: Trace, events: TraceEvent[]): void {
    this.events = [...events].sort((a, b) => a.timestamp - b.timestamp);
    this.state.totalEvents = this.events.length;
    this.state.currentEventIndex = 0;
    this.state.replaying = false;
    this.state.paused = false;
  }

  /**
   * Start replay
   */
  async start(options?: ReplayOptions): Promise<void> {
    this.options = options ?? {};
    this.state.mode = options?.mode ?? 'full';
    this.state.speed = options?.speed ?? 1;
    this.state.replaying = true;
    this.state.paused = false;

    // Find start index
    let startIndex = options?.startFromIndex ?? 0;
    if (options?.startFromEventType) {
      const idx = this.events.findIndex(e => e.type === options.startFromEventType);
      if (idx >= 0) {
        startIndex = idx;
      }
    }

    this.state.currentEventIndex = startIndex;

    // Replay events
    for (let i = startIndex; i < this.events.length; i++) {
      if (!this.state.replaying) break;

      this.state.currentEventIndex = i;
      this.state.currentEvent = this.events[i];

      // Call step callback
      this.options.onStep?.(this.events[i], i);

      // Handle different modes
      if (this.state.mode === 'step') {
        // Pause after each step
        this.state.paused = true;
        await this.waitForStep();
        this.state.paused = false;
      } else if (this.state.mode === 'skip-to-event') {
        // Skip to specific event type
        // (handled by startFromEventType)
      }

      // Apply speed delay
      if (this.state.speed < 1) {
        const delay = (1 / this.state.speed - 1) * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.state.replaying = false;
    this.options.onComplete?.();
  }

  /**
   * Step to next event
   */
  step(): void {
    if (this.state.paused) {
      this.resolveStep?.();
      this.resolveStep = undefined;
    }
  }

  /**
   * Pause replay
   */
  pause(): void {
    this.state.paused = true;
  }

  /**
   * Resume replay
   */
  resume(): void {
    this.state.paused = false;
    this.resolveStep?.();
    this.resolveStep = undefined;
  }

  /**
   * Stop replay
   */
  stop(): void {
    this.state.replaying = false;
    this.state.paused = false;
    this.resolveStep?.();
    this.resolveStep = undefined;
  }

  /**
   * Get current state
   */
  getState(): ReplayState {
    return { ...this.state };
  }

  /**
   * Get current event
   */
  getCurrentEvent(): TraceEvent | undefined {
    return this.state.currentEvent;
  }

  /**
   * Get progress (0-1)
   */
  getProgress(): number {
    if (this.state.totalEvents === 0) return 0;
    return this.state.currentEventIndex / this.state.totalEvents;
  }

  /**
   * Wait for step
   */
  private waitForStep(): Promise<void> {
    return new Promise((resolve) => {
      this.resolveStep = resolve;
    });
  }
}

/**
 * Replay a trace from a specific event
 */
export function replayFromEvent(
  events: TraceEvent[],
  startEventId: string,
  onStep: (event: TraceEvent, index: number) => void
): StepReplayController {
  const controller = new StepReplayController();
  const startIndex = events.findIndex(e => e.eventId === startEventId);

  if (startIndex < 0) {
    throw new Error(`Event not found: ${startEventId}`);
  }

  // Create a trace-like object for the controller
  const trace = {
    traceId: 'replay',
    sessionId: 'replay',
    startTime: events[0]?.timestamp ?? Date.now(),
    status: 'active' as const,
    events: [],
    metadata: {},
  };

  controller.load(trace, events);
  controller.start({
    mode: 'step',
    startFromIndex: startIndex,
    onStep,
  });

  return controller;
}

/**
 * Build replay summary
 */
export function buildReplaySummary(events: TraceEvent[]): string {
  const lines: string[] = [];

  lines.push('Replay Summary');
  lines.push('='.repeat(40));
  lines.push(`Total events: ${events.length}`);
  lines.push('');

  // Group by type
  const byType = new Map<string, number>();
  for (const event of events) {
    byType.set(event.type, (byType.get(event.type) ?? 0) + 1);
  }

  lines.push('Events by type:');
  for (const [type, count] of byType) {
    lines.push(`  ${type}: ${count}`);
  }

  // Errors
  const errors = events.filter(e => e.status === 'failed');
  if (errors.length > 0) {
    lines.push('');
    lines.push(`Errors: ${errors.length}`);
    for (const err of errors) {
      lines.push(`  - ${err.error?.message ?? 'Unknown'}`);
    }
  }

  return lines.join('\n');
}
