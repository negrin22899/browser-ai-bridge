import type { EventBus } from './event-bus.js';
import type { RecordingSession, RecordedAction } from './recorder.js';

/**
 * Replay result
 */
export interface ReplayResult {
  success: boolean;
  actionsReplayed: number;
  errors: Array<{ action: RecordedAction; error: string }>;
  duration: number;
}

/**
 * Replay - replays recorded sessions for debugging
 */
export class Replay {
  private eventBus: EventBus;
  private speed: number;

  constructor(eventBus: EventBus, options?: { speed?: number }) {
    this.eventBus = eventBus;
    this.speed = options?.speed ?? 1;
  }

  /**
   * Replay a recording session
   */
  async replay(
    recording: RecordingSession,
    options?: {
      onAction?: (action: RecordedAction, index: number) => void;
      stopOnError?: boolean;
    }
  ): Promise<ReplayResult> {
    const startTime = Date.now();
    const errors: Array<{ action: RecordedAction; error: string }> = [];
    let actionsReplayed = 0;

    this.eventBus.emit('replay.started', { sessionId: recording.id });

    for (let i = 0; i < recording.actions.length; i++) {
      const action = recording.actions[i];

      // Calculate delay between actions
      if (i > 0) {
        const prevAction = recording.actions[i - 1];
        const delay = (action.timestamp - prevAction.timestamp) / this.speed;
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      try {
        // Emit the action as if it's happening now
        const replayData = {
          sessionId: recording.id,
          data: {
            ...((action.data as Record<string, unknown>) || {}),
            replayIndex: i,
            originalTimestamp: action.timestamp,
          },
        };
        this.eventBus.emit(`replay.${action.type}` as any, replayData);

        // Call callback if provided
        options?.onAction?.(action, i);

        actionsReplayed++;
      } catch (error) {
        errors.push({
          action,
          error: error instanceof Error ? error.message : String(error),
        });

        if (options?.stopOnError) {
          break;
        }
      }
    }

    const result: ReplayResult = {
      success: errors.length === 0,
      actionsReplayed,
      errors,
      duration: Date.now() - startTime,
    };

    this.eventBus.emit('replay.completed', {
      sessionId: recording.id,
      result: result as unknown,
    });

    return result;
  }

  /**
   * Replay a single action
   */
  async replayAction(action: RecordedAction): Promise<void> {
    this.eventBus.emit(`replay.${action.type}` as any, {
      sessionId: 'single-replay',
      data: action.data,
    });
  }

  /**
   * Set replay speed (1 = normal, 2 = 2x faster, 0.5 = half speed)
   */
  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(10, speed));
  }

  /**
   * Get current speed
   */
  getSpeed(): number {
    return this.speed;
  }

  /**
   * Create a timeline from recording
   */
  createTimeline(recording: RecordingSession): Array<{
    time: number;
    relativeTime: number;
    action: RecordedAction;
  }> {
    const startTime = recording.startedAt;

    return recording.actions.map(action => ({
      time: action.timestamp,
      relativeTime: action.timestamp - startTime,
      action,
    }));
  }

  /**
   * Filter actions by type
   */
  filterActions(
    recording: RecordingSession,
    types: RecordedAction['type'][]
  ): RecordedAction[] {
    return recording.actions.filter(a => types.includes(a.type));
  }

  /**
   * Get statistics from recording
   */
  getStatistics(recording: RecordingSession): {
    totalActions: number;
    byType: Record<string, number>;
    totalDuration: number;
    averageActionDuration: number;
    errorCount: number;
  } {
    const byType: Record<string, number> = {};
    let totalDuration = 0;
    let errorCount = 0;

    for (const action of recording.actions) {
      byType[action.type] = (byType[action.type] || 0) + 1;
      if (action.duration) {
        totalDuration += action.duration;
      }
      if (action.type === 'error') {
        errorCount++;
      }
    }

    const sessionDuration = (recording.endedAt ?? Date.now()) - recording.startedAt;

    return {
      totalActions: recording.actions.length,
      byType,
      totalDuration: sessionDuration,
      averageActionDuration: recording.actions.length > 0 ? totalDuration / recording.actions.length : 0,
      errorCount,
    };
  }
}
