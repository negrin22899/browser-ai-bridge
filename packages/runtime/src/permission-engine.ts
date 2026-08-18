import type {
  PermissionEngine as IPermissionEngine,
  PermissionResult,
  PermissionContext,
  ToolScope,
} from '@bab/protocol';
import type { EventBus } from '@bab/core';
import type { PermissionConfig } from '@bab/protocol';
import { resolve, isAbsolute } from 'node:path';

export type PermissionMode = 'auto' | 'confirm' | 'deny';

export interface PermissionRule {
  toolPattern: string | RegExp;
  paramPattern?: RegExp;
  mode: PermissionMode;
  reason?: string;
}

/**
 * Permission Engine - scope-based access control
 */
export class PermissionEngine implements IPermissionEngine {
  private permissions = new Map<string, Map<string, ToolScope>>();
  private dangerousTools: Set<string>;
  private config: PermissionConfig;
  private rules: PermissionRule[] = [];

  constructor(
    private eventBus: EventBus,
    config: PermissionConfig
  ) {
    this.config = config;
    this.dangerousTools = new Set(config.dangerousTools);

    // Default rules
    this.rules = [
      // File operations
      { toolPattern: /^fs\.read/, mode: 'auto' },
      { toolPattern: /^fs\.list/, mode: 'auto' },
      { toolPattern: /^fs\.stat/, mode: 'auto' },
      { toolPattern: /^fs\.exists/, mode: 'auto' },
      { toolPattern: /^fs\.glob/, mode: 'auto' },
      { toolPattern: /^fs\.search/, mode: 'auto' },
      { toolPattern: /^fs\.write/, mode: 'confirm', reason: 'Write file requires confirmation' },
      { toolPattern: /^fs\.edit/, mode: 'confirm', reason: 'Edit file requires confirmation' },
      { toolPattern: /^fs\.delete/, mode: 'confirm', reason: 'Delete file requires confirmation' },
      { toolPattern: /^fs\.mkdir/, mode: 'confirm', reason: 'Create directory requires confirmation' },

      // Git operations
      { toolPattern: /^git\.status/, mode: 'auto' },
      { toolPattern: /^git\.diff/, mode: 'auto' },
      { toolPattern: /^git\.log/, mode: 'auto' },
      { toolPattern: /^git\.branch/, mode: 'auto' },
      { toolPattern: /^git\.commit/, mode: 'confirm', reason: 'Git commit requires confirmation' },
      { toolPattern: /^git\.push/, mode: 'confirm', reason: 'Git push requires confirmation' },
      { toolPattern: /^git\.pull/, mode: 'confirm', reason: 'Git pull requires confirmation' },

      // Shell operations
      { toolPattern: /^shell\.exec/, mode: 'confirm', reason: 'Terminal command requires confirmation' },

      // Dangerous commands
      { toolPattern: /^shell\.exec/, paramPattern: /sudo/, mode: 'deny', reason: 'Sudo is not allowed' },
      { toolPattern: /^shell\.exec/, paramPattern: /format/, mode: 'deny', reason: 'Format is not allowed' },
      { toolPattern: /^shell\.exec/, paramPattern: /rm\s+-rf/, mode: 'deny', reason: 'Recursive delete is not allowed' },
    ];
  }

  async check(toolName: string, params: Record<string, unknown>, context: PermissionContext): Promise<PermissionResult> {
    this.eventBus.emit('permission.requested', { toolName, sessionId: context.sessionId });

    // Check if tool is in dangerous list
    if (this.dangerousTools.has(toolName)) {
      this.eventBus.emit('permission.denied', { toolName, sessionId: context.sessionId });
      return {
        allowed: false,
        reason: 'dangerous',
        suggestion: 'This tool requires explicit user confirmation',
      };
    }

    // Check deny rules first
    const denyResult = this.checkDenyRules(toolName, params);
    if (denyResult) {
      this.eventBus.emit('permission.denied', { toolName, sessionId: context.sessionId });
      return denyResult;
    }

    // Check rules
    const rule = this.findRule(toolName);
    if (rule) {
      if (rule.mode === 'auto') {
        // Auto-approve - validate scope
        const scopeCheck = this.validateScope(toolName, params, context.scope);
        if (!scopeCheck.valid) {
          this.eventBus.emit('permission.denied', { toolName, sessionId: context.sessionId });
          return {
            allowed: false,
            reason: 'scope_violation',
            suggestion: scopeCheck.suggestion,
          };
        }

        this.eventBus.emit('permission.granted', { toolName, sessionId: context.sessionId });
        return { allowed: true };
      }

      // confirm mode - check if permission granted
      const sessionPerms = this.permissions.get(context.sessionId);
      const scope = sessionPerms?.get(toolName);

      if (!scope) {
        this.eventBus.emit('permission.denied', { toolName, sessionId: context.sessionId });
        return {
          allowed: false,
          reason: 'not_granted',
          suggestion: rule.reason ?? 'This operation requires confirmation',
        };
      }

      const scopeCheck = this.validateScope(toolName, params, scope);
      if (!scopeCheck.valid) {
        this.eventBus.emit('permission.denied', { toolName, sessionId: context.sessionId });
        return {
          allowed: false,
          reason: 'scope_violation',
          suggestion: scopeCheck.suggestion,
        };
      }

      this.eventBus.emit('permission.granted', { toolName, sessionId: context.sessionId });
      return { allowed: true };
    }

    // Default: require permission
    const sessionPerms = this.permissions.get(context.sessionId);
    const scope = sessionPerms?.get(toolName);

    if (!scope) {
      this.eventBus.emit('permission.denied', { toolName, sessionId: context.sessionId });
      return {
        allowed: false,
        reason: 'not_granted',
        suggestion: 'Permission not granted for this tool',
      };
    }

    this.eventBus.emit('permission.granted', { toolName, sessionId: context.sessionId });
    return { allowed: true };
  }

  grant(toolName: string, scope: ToolScope, sessionId: string): void {
    if (!this.permissions.has(sessionId)) {
      this.permissions.set(sessionId, new Map());
    }
    this.permissions.get(sessionId)!.set(toolName, scope);
    this.eventBus.emit('permission.granted', { toolName, sessionId });
  }

  revoke(toolName: string, sessionId: string): void {
    this.permissions.get(sessionId)?.delete(toolName);
  }

  clear(sessionId: string): void {
    this.permissions.delete(sessionId);
  }

  getScope(toolName: string, sessionId: string): ToolScope | undefined {
    return this.permissions.get(sessionId)?.get(toolName);
  }

  getDefaultScope(): ToolScope {
    return this.config.defaultScope;
  }

  getRules(): PermissionRule[] {
    return [...this.rules];
  }

  addRule(rule: PermissionRule): void {
    this.rules.unshift(rule);
  }

  removeRule(toolPattern: string | RegExp): void {
    this.rules = this.rules.filter(r => r.toolPattern.toString() !== toolPattern.toString());
  }

  private checkDenyRules(toolName: string, params: Record<string, unknown>): PermissionResult | null {
    for (const rule of this.rules) {
      if (rule.mode !== 'deny') continue;

      const toolMatches = typeof rule.toolPattern === 'string'
        ? toolName === rule.toolPattern || toolName.startsWith(rule.toolPattern)
        : rule.toolPattern.test(toolName);

      if (!toolMatches) continue;

      if (rule.paramPattern) {
        const command = params.command as string;
        if (command && rule.paramPattern.test(command)) {
          return {
            allowed: false,
            reason: 'denied_by_rule',
            suggestion: rule.reason ?? 'This operation is not allowed',
          };
        }
      }
    }

    return null;
  }

  private findRule(toolName: string): PermissionRule | undefined {
    for (const rule of this.rules) {
      if (rule.mode === 'deny') continue;

      if (typeof rule.toolPattern === 'string') {
        if (toolName === rule.toolPattern || toolName.startsWith(rule.toolPattern)) {
          return rule;
        }
      } else {
        if (rule.toolPattern.test(toolName)) {
          return rule;
        }
      }
    }
    return undefined;
  }

  private validateScope(toolName: string, params: Record<string, unknown>, scope: ToolScope): { valid: boolean; suggestion?: string } {
    // Validate path for fs tools
    if (toolName.startsWith('fs.') && params.path) {
      const rawPath = params.path as string;
      // Resolve relative paths against working directory
      const resolvedPath = isAbsolute(rawPath) ? rawPath : resolve(rawPath);

      const isAllowed = scope.allowedPaths.some((allowed) => {
        const resolvedAllowed = isAbsolute(allowed) ? allowed : resolve(allowed);
        return resolvedPath.startsWith(resolvedAllowed);
      });

      if (!isAllowed) {
        return {
          valid: false,
          suggestion: `Path "${rawPath}" is outside allowed scope: ${scope.allowedPaths.join(', ')}`,
        };
      }
    }

    // Validate command for shell tools
    if (toolName === 'shell.exec' && params.command) {
      const command = params.command as string;

      const isDenied = scope.deniedCommands.some((denied) => command.includes(denied));
      if (isDenied) {
        return {
          valid: false,
          suggestion: 'Command contains denied pattern',
        };
      }

      if (scope.allowedCommands.length > 0) {
        const isAllowed = scope.allowedCommands.some((allowed) => command.startsWith(allowed));
        if (!isAllowed) {
          return {
            valid: false,
            suggestion: `Command not in allowed list: ${scope.allowedCommands.join(', ')}`,
          };
        }
      }
    }

    return { valid: true };
  }
}
