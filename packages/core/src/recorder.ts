import type { EventBus } from './event-bus.js';

/**
 * Recorded action
 */
export interface RecordedAction {
  id: string;
  timestamp: number;
  type: 'request' | 'response' | 'tool_call' | 'tool_result' | 'permission' | 'error';
  session: string;
  provider?: string;
  data: unknown;
  duration?: number;
}

/**
 * Recording session
 */
export interface RecordingSession {
  id: string;
  startedAt: number;
  endedAt?: number;
  actions: RecordedAction[];
  metadata: Record<string, unknown>;
}

/**
 * Recorder - records all actions for debugging and replay
 */
export class Recorder {
  private recordings = new Map<string, RecordingSession>();
  private currentSession: string | null = null;
  private eventBus: EventBus;
  private _maxRecordings: number;
  private autoRecord: boolean;

  constructor(eventBus: EventBus, options?: { maxRecordings?: number; autoRecord?: boolean }) {
    this.eventBus = eventBus;
    this._maxRecordings = options?.maxRecordings ?? 100;
    this.autoRecord = options?.autoRecord ?? false;

    if (this.autoRecord) {
      this.setupAutoRecord();
    }
  }

  get maxRecordings(): number {
    return this._maxRecordings;
  }

  /**
   * Start recording a session
   */
  start(sessionId?: string): string {
    const id = sessionId ?? `rec-${Date.now()}`;
    
    this.recordings.set(id, {
      id,
      startedAt: Date.now(),
      actions: [],
      metadata: {},
    });

    this.currentSession = id;
    this.eventBus.emit('recording.started', { sessionId: id });
    
    return id;
  }

  /**
   * Stop recording
   */
  stop(sessionId?: string): RecordingSession | undefined {
    const id = sessionId ?? this.currentSession;
    if (!id) return undefined;

    const recording = this.recordings.get(id);
    if (recording) {
      recording.endedAt = Date.now();
      this.eventBus.emit('recording.stopped', { sessionId: id });
    }

    if (this.currentSession === id) {
      this.currentSession = null;
    }

    return recording;
  }

  /**
   * Record an action
   */
  record(action: Omit<RecordedAction, 'id' | 'timestamp'>): void {
    const sessionId = action.session ?? this.currentSession;
    if (!sessionId) return;

    const recording = this.recordings.get(sessionId);
    if (!recording) return;

    recording.actions.push({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      ...action,
    });
  }

  /**
   * Get a recording
   */
  getRecording(sessionId: string): RecordingSession | undefined {
    return this.recordings.get(sessionId);
  }

  /**
   * List all recordings
   */
  listRecordings(): RecordingSession[] {
    return Array.from(this.recordings.values());
  }

  /**
   * Delete a recording
   */
  deleteRecording(sessionId: string): void {
    this.recordings.delete(sessionId);
  }

  /**
   * Clear all recordings
   */
  clearAll(): void {
    this.recordings.clear();
  }

  /**
   * Export recording as JSON
   */
  export(sessionId: string): string | undefined {
    const recording = this.recordings.get(sessionId);
    if (!recording) return undefined;
    return JSON.stringify(recording, null, 2);
  }

  /**
   * Import recording from JSON
   */
  import(json: string): void {
    const recording: RecordingSession = JSON.parse(json);
    this.recordings.set(recording.id, recording);
  }

  /**
   * Setup auto-recording for all events
   */
  private setupAutoRecord(): void {
    const events = [
      'request.received',
      'request.completed',
      'request.error',
      'tool.requested',
      'tool.executing',
      'tool.completed',
      'tool.error',
      'permission.requested',
      'permission.granted',
      'permission.denied',
    ];

    for (const event of events) {
      this.eventBus.on(event as any, (data: any) => {
        if (!this.currentSession) return;

        const type = event.startsWith('request') ? 'request' :
                     event.startsWith('tool') ? 'tool_call' :
                     event.startsWith('permission') ? 'permission' : 'error';

        this.record({
          type: type as RecordedAction['type'],
          session: this.currentSession,
          data,
        });
      });
    }
  }
}
