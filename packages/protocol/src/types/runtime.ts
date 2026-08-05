import type { Tool, ToolResult, ToolContext, ToolScope } from './tool.js';

export interface Runtime {
  readonly tools: RuntimeToolManager;
  readonly permissions: PermissionEngine;
  readonly audit: AuditLogger;

  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface RuntimeToolManager {
  register(tool: Tool): void;
  execute(name: string, params: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
  list(): Tool[];
}

export interface PermissionEngine {
  check(toolName: string, params: Record<string, unknown>, context: PermissionContext): Promise<PermissionResult>;
  grant(toolName: string, scope: ToolScope, sessionId: string): void;
  revoke(toolName: string, sessionId: string): void;
  clear(sessionId: string): void;
  getScope(toolName: string, sessionId: string): ToolScope | undefined;
}

export interface PermissionContext {
  sessionId: string;
  scope: ToolScope;
  auditLog: AuditEntry[];
}

export type PermissionResult =
  | { allowed: true }
  | { allowed: false; reason: string; suggestion?: string };

export interface AuditLogger {
  log(entry: AuditEntry): void;
  getEntries(sessionId: string): AuditEntry[];
  clear(sessionId: string): void;
}

export interface AuditEntry {
  timestamp: number;
  sessionId: string;
  toolName: string;
  params: Record<string, unknown>;
  result: 'allowed' | 'denied' | 'error';
  reason?: string;
}
