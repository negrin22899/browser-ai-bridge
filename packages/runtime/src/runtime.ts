import type {
  Runtime as IRuntime,
  RuntimeToolManager,
  Tool,
  ToolResult,
  ToolContext,
  ToolDescription,
  PermissionEngine as IPermissionEngine,
  PermissionResult,
  PermissionContext,
  ToolScope,
  AuditLogger as IAuditLogger,
  AuditEntry,
} from '@bab/protocol';
import type { EventBus } from '@bab/core';
import { ToolDispatcher } from './tool-dispatcher.js';
import { PermissionEngine } from './permission-engine.js';
import { AuditLogger } from './audit-logger.js';

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

  constructor(eventBus: EventBus, config: RuntimeConfig) {
    this.eventBus = eventBus;
    this.config = config;

    this.toolDispatcher = new ToolDispatcher(eventBus);
    this.permissionEngine = new PermissionEngine(eventBus, config.permissions);
    this.auditLogger = new AuditLogger();

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

    const permissionResult = await this.permissionEngine.check(name, params, permissionContext);

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
    const context: ToolContext = {
      sessionId,
      workingDirectory: this.config.workingDirectory,
      scope: this.config.permissions.defaultScope,
      env: {},
    };

    return this.tools.execute(name, params, context);
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

  isStarted(): boolean {
    return this.started;
  }

  getConfig(): RuntimeConfig {
    return { ...this.config };
  }
}
