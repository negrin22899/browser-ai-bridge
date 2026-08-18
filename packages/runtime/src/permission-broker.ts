import { randomUUID } from 'node:crypto';
import type { ToolScope } from '@bab/protocol';
import type { EventBus } from '@bab/core';

export interface PendingPermissionRequest {
  id: string;
  toolName: string;
  params: Record<string, unknown>;
  sessionId: string;
  scope: ToolScope;
  createdAt: number;
}

export interface PermissionDecision {
  allowed: boolean;
  reason?: string;
  scope?: ToolScope;
  /** When true, grant the decision's scope to the session (persist for the session). */
  persist?: boolean;
}

export interface PermissionBrokerOptions {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Holds in-flight permission requests and resolves them when the user
 * approves or denies (or when they time out).
 */
export class PermissionBroker {
  private pending = new Map<string, PendingPermissionRequest>();
  private resolvers = new Map<string, (decision: PermissionDecision) => void>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private timeoutMs: number;

  constructor(private eventBus: EventBus, options?: PermissionBrokerOptions) {
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  request(
    toolName: string,
    params: Record<string, unknown>,
    sessionId: string,
    scope: ToolScope
  ): Promise<PermissionDecision> {
    const id = randomUUID();
    const request: PendingPermissionRequest = {
      id,
      toolName,
      params,
      sessionId,
      scope,
      createdAt: Date.now(),
    };

    const promise = new Promise<PermissionDecision>((resolve) => {
      this.pending.set(id, request);
      this.resolvers.set(id, resolve);
      this.eventBus.emit('permission.requested', { toolName, sessionId });

      const timer = setTimeout(() => {
        this.finish(id, { allowed: false, reason: 'timeout' });
      }, this.timeoutMs);
      this.timers.set(id, timer);
    });

    return promise;
  }

  list(): PendingPermissionRequest[] {
    return [...this.pending.values()];
  }

  approve(id: string, options?: { persist?: boolean; scope?: ToolScope }): boolean {
    if (!this.pending.has(id)) return false;
    this.finish(id, {
      allowed: true,
      persist: options?.persist,
      scope: options?.scope,
    });
    return true;
  }

  deny(id: string, reason = 'denied_by_user'): boolean {
    if (!this.pending.has(id)) return false;
    this.finish(id, { allowed: false, reason });
    return true;
  }

  private finish(id: string, decision: PermissionDecision): void {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);

    this.timers.delete(id);
    this.pending.delete(id);

    const resolve = this.resolvers.get(id);
    this.resolvers.delete(id);
    resolve?.(decision);
  }
}
