import type {
  Runtime as IRuntime,
  RuntimeToolManager,
  Tool,
  ToolResult,
  ToolContext,
  ToolDescription,
  PermissionEngine as IPermissionEngine,
  PermissionContext,
  ToolScope,
  AuditLogger as IAuditLogger,
  AuditEntry,
} from '@bab/protocol';
import type { EventBus } from '@bab/core';
import { ToolDispatcher } from './tool-dispatcher.js';
import { PermissionEngine } from './permission-engine.js';
import { AuditLogger } from './audit-logger.js';
import { PermissionBroker, type PendingPermissionRequest } from './permission-broker.js';

export interface RuntimeConfig {
  workingDirectory: string;
  permissions: {
    mode: 'scope' | 'ask-always' | 'policy';
    defaultScope: ToolScope;
    dangerousTools: string[];
  };
  audit: {
    enabled: boolean;
    maxEntries: number;
  };
  /**
   * Tools that are auto-granted a permissive scope for every session.
   * Useful for headless servers where interactive confirmation is unavailable.
   */
  autoGrant?: string[];
  /**
   * When true, tools that need confirmation create a pending permission
   * request and wait for an explicit approve/deny instead of being denied
   * immediately. Resolve via getPendingPermissions()/approvePermission().
   */
  interactive?: boolean;
  /** How long to wait for an interactive decision before auto-denying (ms). */
  permissionTimeoutMs?: number;
}

export class Runtime implements IRuntime {
  readonly tools: RuntimeToolManager;
  readonly permissions: IPermissionEngine;
  readonly audit: IAuditLogger;

  private toolDispatcher: ToolDispatcher;
  private permissionEngine: PermissionEngine;
  private auditLogger: AuditLogger;
  private config: RuntimeConfig;
  private eventBus: EventBus;
  private started = false;
  private autoGrantTools: Set<string>;
  private interactive: boolean;
  private permissionBroker: PermissionBroker;

  constructor(eventBus: EventBus, config: RuntimeConfig) {
    this.eventBus = eventBus;
    this.config = config;
    this.autoGrantTools = new Set(config.autoGrant ?? []);
    this.interactive = config.interactive ?? false;

    this.toolDispatcher = new ToolDispatcher(eventBus);
    this.permissionEngine = new PermissionEngine(eventBus, config.permissions);
    this.auditLogger = new AuditLogger();
    this.permissionBroker = new PermissionBroker(eventBus, {
      timeoutMs: config.permissionTimeoutMs,
    });

    this.tools = {
      register: (tool: Tool) => this.toolDispatcher.register(tool),
      execute: (name: string, params: Record<string, unknown>, context: ToolContext) =>
        this.executeWithPermission(name, params, context),
      list: () => this.toolDispatcher.list(),
    };

    this.permissions = this.permissionEngine;
    this.audit = this.auditLogger;
  }

  async start(): Promise<void> {
    if (this.started) {
      throw new Error('Runtime already started');
    }

    this.eventBus.emit('session.created', { sessionId: 'runtime' });
    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    this.auditLogger.clear('runtime');
    this.started = false;
  }

  getToolDescriptions(): ToolDescription[] {
    return this.toolDispatcher.getDescriptions();
  }

  getTool(name: string): Tool | undefined {
    return this.toolDispatcher.get(name);
  }

  getToolPermissionMode(name: string): 'auto' | 'confirm' | 'deny' {
    return this.permissionEngine.getMode(name);
  }

  private async executeWithPermission(
    name: string,
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    if (!this.started) {
      throw new Error('Runtime not started');
    }

    // Check permission
    const permissionContext: PermissionContext = {
      sessionId: context.sessionId,
      scope: context.scope,
      auditLog: this.auditLogger.getEntries(context.sessionId),
    };

    let permissionResult = await this.permissionEngine.check(name, params, permissionContext);

    // Interactive confirmation: instead of denying a not-yet-granted tool,
    // hold the call until the user approves or denies it.
    if (
      !permissionResult.allowed &&
      'reason' in permissionResult &&
      permissionResult.reason === 'not_granted' &&
      this.interactive
    ) {
      const decision = await this.permissionBroker.request(
        name,
        params,
        context.sessionId,
        this.config.permissions.defaultScope
      );

      if (decision.allowed) {
        if (decision.persist) {
          this.permissionEngine.grant(
            name,
            decision.scope ?? this.getAutoGrantScope(),
            context.sessionId
          );
        }
        permissionResult = { allowed: true };
      } else {
        permissionResult = {
          allowed: false,
          reason: decision.reason ?? 'denied_by_user',
          suggestion: 'The permission request was declined',
        };
      }
    }

    // Log audit entry
    const auditEntry: AuditEntry = {
      timestamp: Date.now(),
      sessionId: context.sessionId,
      toolName: name,
      params,
      result: permissionResult.allowed ? 'allowed' : 'denied',
      reason: 'reason' in permissionResult ? permissionResult.reason : undefined,
    };

    if (this.config.audit.enabled) {
      this.auditLogger.log(auditEntry);
    }

    // If not allowed, return error
    if (!permissionResult.allowed) {
      return {
        success: false,
        output: '',
        error: `Permission denied: ${'reason' in permissionResult ? permissionResult.reason : 'unknown'}`,
        metadata: {
          permissionResult,
          suggestion: 'suggestion' in permissionResult ? permissionResult.suggestion : undefined,
        },
      };
    }

    // Execute tool
    return this.toolDispatcher.execute(name, params, context);
  }

  // Convenience methods for common operations
  async executeTool(name: string, params: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
    if (this.autoGrantTools.has(name)) {
      this.grantPermission(name, this.getAutoGrantScope(), sessionId);
    }

    const context: ToolContext = {
      sessionId,
      workingDirectory: this.config.workingDirectory,
      scope: this.config.permissions.defaultScope,
      env: {},
    };

    return this.tools.execute(name, params, context);
  }

  private getAutoGrantScope(): ToolScope {
    return {
      allowedPaths: [
        this.config.workingDirectory,
        ...this.config.permissions.defaultScope.allowedPaths,
      ],
      allowedCommands: [],
      deniedCommands: this.config.permissions.defaultScope.deniedCommands,
      maxExecutionTime: this.config.permissions.defaultScope.maxExecutionTime,
    };
  }

  grantPermission(toolName: string, scope: ToolScope, sessionId: string): void {
    this.permissionEngine.grant(toolName, scope, sessionId);
  }

  revokePermission(toolName: string, sessionId: string): void {
    this.permissionEngine.revoke(toolName, sessionId);
  }

  getAuditLog(sessionId: string): AuditEntry[] {
    return this.auditLogger.getEntries(sessionId);
  }

  getAllAuditEntries(): Map<string, AuditEntry[]> {
    return this.auditLogger.getAll();
  }

  restoreAudit(entries: Map<string, AuditEntry[]>): void {
    this.auditLogger.restore(entries);
  }

  getPendingPermissions(): PendingPermissionRequest[] {
    return this.permissionBroker.list();
  }

  approvePermission(id: string, options?: { persist?: boolean; scope?: ToolScope }): boolean {
    return this.permissionBroker.approve(id, options);
  }

  denyPermission(id: string, reason?: string): boolean {
    return this.permissionBroker.deny(id, reason);
  }

  isStarted(): boolean {
    return this.started;
  }

  getConfig(): RuntimeConfig {
    return { ...this.config };
  }
}
