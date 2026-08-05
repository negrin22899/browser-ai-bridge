import { Session, type SessionConfig } from './session.js';
import { EventBus } from './event-bus.js';
import { randomUUID } from 'node:crypto';

export interface SessionManagerConfig {
  maxSessions?: number;
  maxHistoryPerSession?: number;
}

/**
 * Session Manager - manages multiple sessions with different providers
 */
export class SessionManager {
  private sessions = new Map<string, Session>();
  private activeSessionId: string | null = null;
  private config: SessionManagerConfig;

  constructor(
    private eventBus: EventBus,
    config?: SessionManagerConfig
  ) {
    this.config = config ?? {};
  }

  create(providerId: string, model?: string): Session {
    // Check max sessions limit
    if (this.config.maxSessions && this.sessions.size >= this.config.maxSessions) {
      throw new Error(`Maximum sessions limit (${this.config.maxSessions}) reached`);
    }

    const sessionConfig: SessionConfig = {
      id: randomUUID(),
      providerId,
      model,
    };

    const session = new Session(sessionConfig);
    this.sessions.set(session.id, session);

    // Set as active if it's the first session
    if (!this.activeSessionId) {
      this.activeSessionId = session.id;
    }

    this.eventBus.emit('session.created', { sessionId: session.id });
    return session;
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  getActive(): Session {
    if (!this.activeSessionId) {
      throw new Error('No active session');
    }

    const session = this.sessions.get(this.activeSessionId);
    if (!session) {
      throw new Error(`Active session "${this.activeSessionId}" not found`);
    }

    return session;
  }

  setActive(id: string): void {
    if (!this.sessions.has(id)) {
      throw new Error(`Session "${id}" not found`);
    }

    this.activeSessionId = id;
  }

  getActiveId(): string | null {
    return this.activeSessionId;
  }

  list(): Session[] {
    return Array.from(this.sessions.values());
  }

  getByProvider(providerId: string): Session[] {
    return this.list().filter(s => s.providerId === providerId);
  }

  close(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;

    this.sessions.delete(id);
    this.eventBus.emit('session.closed', { sessionId: id });

    // If this was the active session, switch to another one
    if (this.activeSessionId === id) {
      const remaining = Array.from(this.sessions.keys());
      this.activeSessionId = remaining.length > 0 ? remaining[0] : null;
    }
  }

  closeAll(): void {
    const sessionIds = Array.from(this.sessions.keys());
    for (const id of sessionIds) {
      this.close(id);
    }
  }

  count(): number {
    return this.sessions.size;
  }

  has(id: string): boolean {
    return this.sessions.has(id);
  }

  // Convenience methods for active session
  addMessageToActive(message: import('@bab/protocol').Message): void {
    const session = this.getActive();
    session.addMessage(message);
  }

  getActiveMessages(): import('@bab/protocol').Message[] {
    const session = this.getActive();
    return session.getMessages();
  }
}
