import { randomUUID } from 'node:crypto';
import { EventBus } from './event-bus.js';

/**
 * Session Fabric v3 — Strict State Machine & Isolation
 * 
 * "Session is a Sandbox"
 * If a session crashes, hangs, or is compromised,
 * it must NOT affect the Core or other sessions.
 */

// ============================================================================
// SESSION STATE MACHINE
// ============================================================================

/**
 * Strict session states:
 * INITIALIZING → READY ↔ BUSY → DEGRADED → RECOVERING → TERMINATED / ERROR
 * 
 * - BUSY → BUSY is IMPOSSIBLE (race condition protection)
 * - RECOVERING blocks all incoming API requests (503)
 * - TERMINATED sessions must be fully destroyed in memory
 */
export type SessionState =
  | 'INITIALIZING'
  | 'READY'
  | 'BUSY'
  | 'DEGRADED'
  | 'RECOVERING'
  | 'TERMINATED'
  | 'ERROR';

/**
 * Valid state transitions
 */
const VALID_TRANSITIONS: Record<SessionState, SessionState[]> = {
  'INITIALIZING': ['READY', 'ERROR'],
  'READY': ['BUSY', 'DEGRADED', 'TERMINATED'],
  'BUSY': ['READY', 'DEGRADED', 'ERROR'],
  'DEGRADED': ['RECOVERING', 'TERMINATED'],
  'RECOVERING': ['READY', 'DEGRADED', 'ERROR'],
  'TERMINATED': [],
  'ERROR': ['TERMINATED'],
};

// ============================================================================
// SESSION IDENTITY
// ============================================================================

export interface SessionIdentity {
  sessionId: string;
  providerId: string;
  browserSessionId?: string;
  runtimeProviderId: string;
  workspaceId?: string;
  createdAt: number;
}

// ============================================================================
// SESSION STATE INFO
// ============================================================================

export interface SessionStateInfo {
  state: SessionState;
  timestamp: number;
  duration: number;
  error?: string;
  recovery?: {
    attempt: number;
    maxAttempts: number;
    nextRetryMs: number;
  };
}

// ============================================================================
// SESSION CONFIG
// ============================================================================

export interface SessionConfig {
  id?: string;
  providerId: string;
  model?: string;
  runtimeProviderId?: string;
  workspace?: string;
  browserProfile?: string;
  maxConcurrentRequests?: number;
  timeout?: number;  // TTL for inactive sessions
  metadata?: Record<string, unknown>;
}

// ============================================================================
// SESSION CONTEXT
// ============================================================================

export interface SessionContext {
  identity: SessionIdentity;
  state: SessionStateInfo;
  tools: string[];
  capabilities: string[];
  permissions: Record<string, string>;
  activeRequests: string[];
  messages: Array<{ role: string; content: string }>;
  workspace?: string;
  metadata: Record<string, unknown>;
}

// ============================================================================
// SESSION
// ============================================================================

/**
 * Session - isolated execution context with strict state machine
 */
export class Session {
  readonly id: string;
  readonly providerId: string;
  readonly model?: string;
  readonly runtimeProviderId: string;
  readonly browserSessionId?: string;
  readonly workspace?: string;
  readonly createdAt: number;
  readonly timeout: number;

  private _state: SessionStateInfo;
  private _messages: Array<{ role: string; content: string }> = [];
  private _tools: string[] = [];
  private _capabilities: string[] = [];
  private _permissions: Record<string, string> = {};
  private _activeRequests: Set<string> = new Set();
  private _metadata: Record<string, unknown>;
  private _maxConcurrentRequests: number;
  private _lastActivity: number;

  constructor(config: SessionConfig) {
    this.id = config.id ?? randomUUID();
    this.providerId = config.providerId;
    this.model = config.model;
    this.runtimeProviderId = config.runtimeProviderId ?? 'local';
    this.workspace = config.workspace;
    this.createdAt = Date.now();
    this._lastActivity = Date.now();
    this._maxConcurrentRequests = config.maxConcurrentRequests ?? 10;
    this.timeout = config.timeout ?? 300000; // 5 minutes default
    this._metadata = config.metadata ?? {};

    this._state = {
      state: 'INITIALIZING',
      timestamp: Date.now(),
      duration: 0,
    };
  }

  // --- State Machine ---

  get state(): SessionStateInfo {
    return {
      ...this._state,
      duration: Date.now() - this._state.timestamp,
    };
  }

  /**
   * Transition to new state with validation
   * Returns false if transition is invalid
   */
  transitionTo(newState: SessionState, error?: string): boolean {
    const validTransitions = VALID_TRANSITIONS[this._state.state];

    // BUSY → BUSY is IMPOSSIBLE (race condition protection)
    if (this._state.state === 'BUSY' && newState === 'BUSY') {
      return false;
    }

    if (!validTransitions.includes(newState)) {
      return false;
    }

    this._state = {
      state: newState,
      timestamp: Date.now(),
      duration: 0,
      error,
    };

    this._lastActivity = Date.now();
    return true;
  }

  /**
   * Check if session accepts requests
   * RECOVERING sessions return 503
   */
  acceptsRequests(): boolean {
    return this._state.state === 'READY' || this._state.state === 'BUSY';
  }

  /**
   * Check if session is active (not terminated/error)
   */
  isActive(): boolean {
    return this._state.state !== 'TERMINATED' && this._state.state !== 'ERROR';
  }

  /**
   * Check if session is expired (TTL)
   */
  isExpired(): boolean {
    return Date.now() - this._lastActivity > this.timeout;
  }

  /**
   * Update last activity timestamp
   */
  touch(): void {
    this._lastActivity = Date.now();
  }

  // --- Messages ---

  addMessage(message: { role: string; content: string }): void {
    this._messages.push(message);
    this.touch();
  }

  getMessages(): Array<{ role: string; content: string }> {
    return [...this._messages];
  }

  // --- Tools ---

  setTools(tools: string[]): void {
    this._tools = [...tools];
  }

  getTools(): string[] {
    return [...this._tools];
  }

  hasTool(toolName: string): boolean {
    return this._tools.includes(toolName);
  }

  // --- Capabilities ---

  setCapabilities(capabilities: string[]): void {
    this._capabilities = [...capabilities];
  }

  getCapabilities(): string[] {
    return [...this._capabilities];
  }

  hasCapability(capability: string): boolean {
    return this._capabilities.includes(capability);
  }

  // --- Permissions ---

  setPermissions(permissions: Record<string, string>): void {
    this._permissions = { ...permissions };
  }

  getPermissions(): Record<string, string> {
    return { ...this._permissions };
  }

  getPermission(key: string): string | undefined {
    return this._permissions[key];
  }

  // --- Requests ---

  addRequest(requestId: string): boolean {
    if (this._activeRequests.size >= this._maxConcurrentRequests) {
      return false;
    }
    this._activeRequests.add(requestId);
    this.touch();
    return true;
  }

  removeRequest(requestId: string): void {
    this._activeRequests.delete(requestId);
  }

  getActiveRequests(): string[] {
    return Array.from(this._activeRequests);
  }

  // --- Metadata ---

  setMetadata(key: string, value: unknown): void {
    this._metadata[key] = value;
  }

  getMetadata(key: string): unknown {
    return this._metadata[key];
  }

  // --- Context Snapshot ---

  getContext(): SessionContext {
    return {
      identity: {
        sessionId: this.id,
        providerId: this.providerId,
        runtimeProviderId: this.runtimeProviderId,
        browserSessionId: this.browserSessionId,
        workspaceId: this.workspace,
        createdAt: this.createdAt,
      },
      state: this.state,
      tools: this.getTools(),
      capabilities: this.getCapabilities(),
      permissions: this.getPermissions(),
      activeRequests: this.getActiveRequests(),
      messages: this.getMessages(),
      workspace: this.workspace,
      metadata: { ...this._metadata },
    };
  }

  // --- Cleanup ---

  /**
   * Cleanup all resources
   * Must be idempotent
   */
  cleanup(): void {
    this._activeRequests.clear();
    this._messages = [];
    this._tools = [];
    this._capabilities = [];
    this._permissions = {};
    this._metadata = {};
  }

  // --- Serialization ---

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      providerId: this.providerId,
      model: this.model,
      runtimeProviderId: this.runtimeProviderId,
      browserSessionId: this.browserSessionId,
      workspace: this.workspace,
      createdAt: this.createdAt,
      state: this._state,
      messageCount: this._messages.length,
      toolCount: this._tools.length,
      activeRequests: this.getActiveRequests(),
    };
  }
}

// ============================================================================
// SESSION FABRIC
// ============================================================================

/**
 * Session Fabric - orchestrates multiple isolated sessions
 * 
 * Responsibilities:
 * - Session lifecycle management
 * - Session isolation enforcement
 * - Message routing
 * - Resource cleanup (garbage collection)
 * - TTL enforcement
 */
export class SessionFabric {
  private sessions: Map<string, Session> = new Map();
  private eventBus: EventBus;
  private maxSessions: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(eventBus: EventBus, options?: { maxSessions?: number; cleanupIntervalMs?: number }) {
    this.eventBus = eventBus;
    this.maxSessions = options?.maxSessions ?? 50;

    // Start cleanup interval for expired sessions
    const cleanupInterval = options?.cleanupIntervalMs ?? 60000; // 1 minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, cleanupInterval);
  }

  /**
   * Create a new session
   */
  create(config: SessionConfig): Session {
    if (this.sessions.size >= this.maxSessions) {
      throw new Error(`Maximum sessions limit (${this.maxSessions}) reached`);
    }

    const session = new Session(config);
    this.sessions.set(session.id, session);

    this.eventBus.emit('session.created', { sessionId: session.id });

    // Transition to READY
    session.transitionTo('READY');
    this.eventBus.emit('session.ready', { sessionId: session.id });

    return session;
  }

  /**
   * Get session by ID
   */
  get(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * List all sessions
   */
  list(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * List active sessions
   */
  listActive(): Session[] {
    return this.list().filter(s => s.isActive());
  }

  /**
   * Start processing on a session (READY → BUSY)
   */
  start(sessionId: string): boolean {
    const session = this.get(sessionId);
    if (!session) return false;

    return session.transitionTo('BUSY');
  }

  /**
   * Complete processing (BUSY → READY)
   */
  complete(sessionId: string): boolean {
    const session = this.get(sessionId);
    if (!session) return false;

    return session.transitionTo('READY');
  }

  /**
   * Degrade session
   */
  degrade(sessionId: string, error: string): boolean {
    const session = this.get(sessionId);
    if (!session) return false;

    const success = session.transitionTo('DEGRADED', error);
    if (success) {
      this.eventBus.emit('session.degraded', { sessionId, error });
    }
    return success;
  }

  /**
   * Start recovery
   */
  recover(sessionId: string): boolean {
    const session = this.get(sessionId);
    if (!session) return false;

    const success = session.transitionTo('RECOVERING');
    if (success) {
      this.eventBus.emit('session.recovering', { sessionId });
    }
    return success;
  }

  /**
   * Terminate session (cleanup all resources)
   * Must be idempotent
   */
  terminate(sessionId: string): void {
    const session = this.get(sessionId);
    if (!session) return;

    // Cleanup resources
    session.cleanup();

    // Transition to TERMINATED
    session.transitionTo('TERMINATED');
    this.eventBus.emit('session.terminated', { sessionId });

    // Remove from map
    this.sessions.delete(sessionId);
  }

  /**
   * Terminate all sessions
   */
  terminateAll(): void {
    const sessionIds = Array.from(this.sessions.keys());
    for (const id of sessionIds) {
      this.terminate(id);
    }
  }

  /**
   * Cleanup expired sessions (garbage collector)
   */
  private cleanupExpiredSessions(): void {
    for (const [id, session] of this.sessions) {
      if (session.isExpired() && session.isActive()) {
        console.log(`Session ${id} expired, terminating...`);
        this.terminate(id);
      }
    }
  }

  /**
   * Get session count
   */
  count(): number {
    return this.sessions.size;
  }

  /**
   * Check if session exists
   */
  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Get session snapshot for debugging
   */
  getSnapshot(sessionId: string): SessionContext | undefined {
    const session = this.get(sessionId);
    return session?.getContext();
  }

  /**
   * Get all session snapshots
   */
  getAllSnapshots(): SessionContext[] {
    return this.list().map(s => s.getContext());
  }

  /**
   * Destroy fabric (cleanup interval)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.terminateAll();
  }
}
