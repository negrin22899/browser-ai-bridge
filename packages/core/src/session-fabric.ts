import { randomUUID } from 'node:crypto';
import { EventBus } from './event-bus.js';

/**
 * Session Fabric — Multi-Provider / Multi-Runtime Session Orchestration
 * 
 * Session is the isolation boundary.
 * Each session has its own provider, runtime, tools, permissions, capabilities.
 */

// ============================================================================
// SESSION IDENTITY
// ============================================================================

export interface SessionIdentity {
  /** Unique session ID */
  sessionId: string;
  
  /** Provider ID */
  providerId: string;
  
  /** Browser session ID */
  browserSessionId?: string;
  
  /** Runtime ID */
  runtimeId: string;
  
  /** Workspace ID */
  workspaceId?: string;
  
  /** Creation time */
  createdAt: number;
}

// ============================================================================
// SESSION STATE
// ============================================================================

export type SessionState = 
  | 'created'
  | 'initializing'
  | 'ready'
  | 'running'
  | 'paused'
  | 'degraded'
  | 'recovering'
  | 'stopped'
  | 'destroyed';

export interface SessionStateInfo {
  /** Current state */
  state: SessionState;
  
  /** State timestamp */
  timestamp: number;
  
  /** State duration */
  duration: number;
  
  /** Error if degraded/recovering */
  error?: string;
  
  /** Recovery info */
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
  /** Session ID (auto-generated if not provided) */
  id?: string;
  
  /** Provider ID */
  providerId: string;
  
  /** Model name */
  model?: string;
  
  /** Runtime ID */
  runtimeId?: string;
  
  /** Workspace ID */
  workspaceId?: string;
  
  /** Max concurrent requests */
  maxConcurrentRequests?: number;
  
  /** Session timeout in ms */
  timeout?: number;
  
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// SESSION CONTEXT
// ============================================================================

export interface SessionContext {
  /** Session identity */
  identity: SessionIdentity;
  
  /** Session state */
  state: SessionStateInfo;
  
  /** Available tools for this session */
  tools: string[];
  
  /** Available capabilities */
  capabilities: string[];
  
  /** Permissions for this session */
  permissions: Record<string, string>;
  
  /** Active requests */
  activeRequests: string[];
  
  /** Messages history */
  messages: Array<{ role: string; content: string }>;
  
  /** Session metadata */
  metadata: Record<string, unknown>;
}

// ============================================================================
// SESSION
// ============================================================================

/**
 * Session - isolated execution context
 */
export class Session {
  readonly id: string;
  readonly providerId: string;
  readonly model?: string;
  readonly runtimeId: string;
  readonly workspaceId?: string;
  readonly createdAt: number;
  
  private _state: SessionStateInfo;
  private _messages: Array<{ role: string; content: string }> = [];
  private _tools: string[] = [];
  private _capabilities: string[] = [];
  private _permissions: Record<string, string> = {};
  private _activeRequests: Set<string> = new Set();
  private _metadata: Record<string, unknown>;
  private _maxConcurrentRequests: number;

  constructor(config: SessionConfig) {
    this.id = config.id ?? randomUUID();
    this.providerId = config.providerId;
    this.model = config.model;
    this.runtimeId = config.runtimeId ?? 'local';
    this.workspaceId = config.workspaceId;
    this.createdAt = Date.now();
    this._maxConcurrentRequests = config.maxConcurrentRequests ?? 10;
    this._metadata = config.metadata ?? {};
    
    this._state = {
      state: 'created',
      timestamp: Date.now(),
      duration: 0,
    };
  }

  // --- State ---

  get state(): SessionStateInfo {
    return {
      ...this._state,
      duration: Date.now() - this._state.timestamp,
    };
  }

  /** Transition to new state */
  transitionTo(newState: SessionState, error?: string): void {
    this._state = {
      state: newState,
      timestamp: Date.now(),
      duration: 0,
      error,
    };
  }

  // --- Messages ---

  addMessage(message: { role: string; content: string }): void {
    this._messages.push(message);
  }

  getMessages(): Array<{ role: string; content: string }> {
    return [...this._messages];
  }

  getLastMessage(): { role: string; content: string } | undefined {
    return this._messages[this._messages.length - 1];
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

  // --- Snapshot ---

  getContext(): SessionContext {
    return {
      identity: {
        sessionId: this.id,
        providerId: this.providerId,
        runtimeId: this.runtimeId,
        workspaceId: this.workspaceId,
        createdAt: this.createdAt,
      },
      state: this.state,
      tools: this.getTools(),
      capabilities: this.getCapabilities(),
      permissions: this.getPermissions(),
      activeRequests: this.getActiveRequests(),
      messages: this.getMessages(),
      metadata: { ...this._metadata },
    };
  }

  // --- Serialization ---

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      providerId: this.providerId,
      model: this.model,
      runtimeId: this.runtimeId,
      workspaceId: this.workspaceId,
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
 * Session Fabric - orchestrates multiple sessions
 */
export class SessionFabric {
  private sessions: Map<string, Session> = new Map();
  private eventBus: EventBus;
  private maxSessions: number;

  constructor(eventBus: EventBus, options?: { maxSessions?: number }) {
    this.eventBus = eventBus;
    this.maxSessions = options?.maxSessions ?? 50;
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

    // Emit lifecycle event
    this.eventBus.emit('session.created', { sessionId: session.id });

    // Transition to initializing
    session.transitionTo('initializing');
    this.eventBus.emit('session.initializing', { sessionId: session.id });

    // Transition to ready
    session.transitionTo('ready');
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
   * List sessions by state
   */
  listByState(state: SessionState): Session[] {
    return this.list().filter(s => s.state.state === state);
  }

  /**
   * List sessions by provider
   */
  listByProvider(providerId: string): Session[] {
    return this.list().filter(s => s.providerId === providerId);
  }

  /**
   * Start a session (transition to running)
   */
  start(sessionId: string): void {
    const session = this.get(sessionId);
    if (!session) {
      throw new Error(`Session "${sessionId}" not found`);
    }

    session.transitionTo('running');
    this.eventBus.emit('session.started', { sessionId });
  }

  /**
   * Pause a session
   */
  pause(sessionId: string): void {
    const session = this.get(sessionId);
    if (!session) {
      throw new Error(`Session "${sessionId}" not found`);
    }

    session.transitionTo('paused');
    this.eventBus.emit('session.paused', { sessionId });
  }

  /**
   * Resume a session
   */
  resume(sessionId: string): void {
    const session = this.get(sessionId);
    if (!session) {
      throw new Error(`Session "${sessionId}" not found`);
    }

    session.transitionTo('running');
    this.eventBus.emit('session.resumed', { sessionId });
  }

  /**
   * Stop a session
   */
  stop(sessionId: string): void {
    const session = this.get(sessionId);
    if (!session) return;

    session.transitionTo('stopped');
    this.eventBus.emit('session.stopped', { sessionId });
  }

  /**
   * Destroy a session
   */
  destroy(sessionId: string): void {
    const session = this.get(sessionId);
    if (!session) return;

    // Stop if running
    if (session.state.state === 'running' || session.state.state === 'paused') {
      this.stop(sessionId);
    }

    session.transitionTo('destroyed');
    this.sessions.delete(sessionId);
    this.eventBus.emit('session.destroyed', { sessionId });
  }

  /**
   * Destroy all sessions
   */
  destroyAll(): void {
    const sessionIds = Array.from(this.sessions.keys());
    for (const id of sessionIds) {
      this.destroy(id);
    }
  }

  /**
   * Mark session as degraded
   */
  degrade(sessionId: string, error: string): void {
    const session = this.get(sessionId);
    if (!session) return;

    session.transitionTo('degraded', error);
    this.eventBus.emit('session.degraded', { sessionId, error });
  }

  /**
   * Mark session as recovering
   */
  recover(sessionId: string): void {
    const session = this.get(sessionId);
    if (!session) return;

    session.transitionTo('recovering');
    this.eventBus.emit('session.recovering', { sessionId });
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
}
