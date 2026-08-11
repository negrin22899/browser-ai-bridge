import type { 
  Tool, 
  ToolAvailability, 
  ToolUnavailabilityReason,
} from './types/tool.js';
import type { ProviderCapabilities } from './types/capabilities.js';

/**
 * Dynamic Tool Negotiation
 * 
 * Resolves which tools are available based on:
 * - Provider capabilities
 * - Runtime capabilities
 * - Tool requirements
 * - User permissions
 * 
 * KEY PRINCIPLE:
 * Tool visibility ≠ Tool authorization
 * 
 * Capability Resolver determines WHAT CAN BE OFFERED to AI.
 * Permission Engine determines WHAT CAN ACTUALLY BE EXECUTED.
 */

// ============================================================================
// CONTEXT
// ============================================================================

export interface ToolNegotiationContext {
  /** Provider capabilities */
  providerCapabilities: ProviderCapabilities;
  
  /** Runtime capabilities */
  runtimeCapabilities: RuntimeCapabilities;
  
  /** User permissions */
  permissions: UserPermissions;
  
  /** Session info */
  session: SessionInfo;
  
  /** Tool registry */
  tools: Tool[];
}

export interface RuntimeCapabilities {
  /** Available runtime features */
  features: string[];
  
  /** Available tools */
  tools: string[];
  
  /** Available integrations */
  integrations: string[];
  
  /** Is browser connected */
  browserConnected: boolean;
  
  /** Is filesystem available */
  filesystemAvailable: boolean;
  
  /** Is git available */
  gitAvailable: boolean;
  
  /** Is terminal available */
  terminalAvailable: boolean;
}

export interface UserPermissions {
  /** Allowed permissions */
  allowed: string[];
  
  /** Denied permissions */
  denied: string[];
  
  /** Permissions requiring confirmation */
  confirm: string[];
}

export interface SessionInfo {
  /** Session ID */
  id: string;
  
  /** Session state */
  state: string;
  
  /** Session capabilities */
  capabilities: string[];
}

// ============================================================================
// RESULT
// ============================================================================

export interface NegotiationResult {
  /** Available tools */
  available: ToolAvailability[];
  
  /** Unavailable tools */
  unavailable: ToolAvailability[];
  
  /** Denied tools */
  denied: ToolAvailability[];
  
  /** Tools requiring confirmation */
  requiresConfirmation: ToolAvailability[];
  
  /** Summary */
  summary: NegotiationSummary;
}

export interface NegotiationSummary {
  /** Total tools evaluated */
  total: number;
  
  /** Available count */
  availableCount: number;
  
  /** Unavailable count */
  unavailableCount: number;
  
  /** Denied count */
  deniedCount: number;
  
  /** Confirmation required count */
  confirmationCount: number;
  
  /** Reasons for unavailability */
  reasons: Map<string, string[]>;
}

// ============================================================================
// RESOLVER
// ============================================================================

/**
 * Tool Negotiator - resolves available tools
 */
export class ToolNegotiator {
  /**
   * Resolve available tools
   */
  resolve(context: ToolNegotiationContext): NegotiationResult {
    const available: ToolAvailability[] = [];
    const unavailable: ToolAvailability[] = [];
    const denied: ToolAvailability[] = [];
    const requiresConfirmation: ToolAvailability[] = [];
    const reasons = new Map<string, string[]>();

    for (const tool of context.tools) {
      const result = this.evaluateTool(tool, context);
      
      switch (result.status) {
        case 'available':
          available.push(result);
          break;
        case 'unavailable':
          unavailable.push(result);
          this.addReason(reasons, result.reasonCategory || 'unknown', tool.name);
          break;
        case 'denied':
          denied.push(result);
          this.addReason(reasons, 'permission_denied', tool.name);
          break;
        case 'confirmation_required':
          requiresConfirmation.push(result);
          this.addReason(reasons, 'permission_confirm', tool.name);
          break;
      }
    }

    return {
      available,
      unavailable,
      denied,
      requiresConfirmation,
      summary: {
        total: context.tools.length,
        availableCount: available.length,
        unavailableCount: unavailable.length,
        deniedCount: denied.length,
        confirmationCount: requiresConfirmation.length,
        reasons,
      },
    };
  }

  /**
   * Evaluate a single tool
   */
  private evaluateTool(tool: Tool, context: ToolNegotiationContext): ToolAvailability {
    const requirements = tool.requirements || {};

    // Check provider capabilities
    if (requirements.providerCapabilities) {
      for (const cap of requirements.providerCapabilities) {
        if (!this.checkProviderCapability(cap, context.providerCapabilities)) {
          return this.createUnavailable(
            tool.name,
            'provider_unsupported',
            `Provider does not support: ${cap}`,
            [cap]
          );
        }
      }
    }

    // Check if tool calling is required
    if (requirements.requiresToolCalling && !context.providerCapabilities.toolCalling) {
      return this.createUnavailable(
        tool.name,
        'provider_unsupported',
        'Provider does not support tool calling',
        ['toolCalling']
      );
    }

    // Check runtime capabilities
    if (requirements.runtimeCapabilities) {
      for (const cap of requirements.runtimeCapabilities) {
        if (!this.checkRuntimeCapability(cap, context.runtimeCapabilities)) {
          return this.createUnavailable(
            tool.name,
            'runtime_unsupported',
            `Runtime does not support: ${cap}`,
            [cap]
          );
        }
      }
    }

    // Check permissions
    if (requirements.permissions) {
      for (const perm of requirements.permissions) {
        const permResult = this.checkPermission(perm, context.permissions);
        if (permResult === 'denied') {
          return this.createDenied(tool.name, `Permission denied: ${perm}`);
        }
        if (permResult === 'confirm') {
          return this.createConfirmationRequired(tool.name, `Requires confirmation: ${perm}`);
        }
      }
    }

    // Check browser connection if needed
    if (this.toolNeedsBrowser(tool) && !context.runtimeCapabilities.browserConnected) {
      return this.createUnavailable(
        tool.name,
        'runtime_unsupported',
        'Browser is not connected',
        ['browser']
      );
    }

    return {
      name: tool.name,
      status: 'available',
      available: true,
    };
  }

  /**
   * Check provider capability
   */
  private checkProviderCapability(capability: string, capabilities: ProviderCapabilities): boolean {
    const key = capability as keyof ProviderCapabilities;
    return capabilities[key] === true;
  }

  /**
   * Check runtime capability
   */
  private checkRuntimeCapability(capability: string, capabilities: RuntimeCapabilities): boolean {
    return capabilities.features.includes(capability) || 
           capabilities.tools.includes(capability);
  }

  /**
   * Check permission
   */
  private checkPermission(permission: string, permissions: UserPermissions): 'allowed' | 'denied' | 'confirm' {
    if (permissions.denied.includes(permission)) {
      return 'denied';
    }
    if (permissions.allowed.includes(permission)) {
      return 'allowed';
    }
    if (permissions.confirm.includes(permission)) {
      return 'confirm';
    }
    return 'allowed'; // Default to allowed
  }

  /**
   * Check if tool needs browser
   */
  private toolNeedsBrowser(tool: Tool): boolean {
    const browserTools = ['browser.navigate', 'browser.click', 'browser.type', 'browser.read'];
    return browserTools.some(t => tool.name.startsWith(t));
  }

  /**
   * Create unavailable result
   */
  private createUnavailable(
    name: string,
    reason: ToolUnavailabilityReason,
    message: string,
    missingCapabilities: string[]
  ): ToolAvailability {
    return {
      name,
      status: 'unavailable',
      available: false,
      reason: message,
      reasonCategory: reason,
      missingCapabilities,
    };
  }

  /**
   * Create denied result
   */
  private createDenied(name: string, reason: string): ToolAvailability {
    return {
      name,
      status: 'denied',
      available: false,
      reason,
      reasonCategory: 'permission_denied',
    };
  }

  /**
   * Create confirmation required result
   */
  private createConfirmationRequired(name: string, reason: string): ToolAvailability {
    return {
      name,
      status: 'confirmation_required',
      available: false,
      reason,
      reasonCategory: 'permission_confirm',
    };
  }

  /**
   * Add reason to map
   */
  private addReason(reasons: Map<string, string[]>, category: string, toolName: string): void {
    const existing = reasons.get(category) || [];
    existing.push(toolName);
    reasons.set(category, existing);
  }

  /**
   * Get available tool names
   */
  getAvailableToolNames(result: NegotiationResult): string[] {
    return result.available.map(t => t.name);
  }

  /**
   * Get tool descriptions for available tools
   */
  getAvailableToolDescriptions(tools: Tool[], result: NegotiationResult): Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }> {
    const availableNames = new Set(this.getAvailableToolNames(result));
    return tools
      .filter(t => availableNames.has(t.name))
      .map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      }));
  }

  /**
   * Explain why a tool is unavailable
   */
  explainUnavailability(result: ToolAvailability): string {
    if (result.available) {
      return `${result.name} is available`;
    }

    const lines: string[] = [];
    lines.push(`${result.name} is ${result.status}`);
    lines.push('');

    if (result.reason) {
      lines.push(`Reason: ${result.reason}`);
    }

    if (result.missingCapabilities && result.missingCapabilities.length > 0) {
      lines.push(`Missing capabilities: ${result.missingCapabilities.join(', ')}`);
    }

    if (result.missingPermissions && result.missingPermissions.length > 0) {
      lines.push(`Missing permissions: ${result.missingPermissions.join(', ')}`);
    }

    return lines.join('\n');
  }
}

/**
 * Default tool negotiator instance
 */
export const defaultToolNegotiator = new ToolNegotiator();

/**
 * Quick helper to resolve available tools
 */
export function resolveAvailableTools(context: ToolNegotiationContext): NegotiationResult {
  return defaultToolNegotiator.resolve(context);
}
