import type { ProviderCapabilities } from './types/capabilities.js';

/**
 * Capability Resolver
 * 
 * Resolves what tools/actions are available based on:
 * - User permissions
 * - Provider capabilities
 * - Runtime capabilities
 * - Tool requirements
 * 
 * Formula:
 * User permissions + Provider capabilities + Runtime capabilities → Available toolset
 */

export interface CapabilityRequirements {
  /** Required capabilities */
  required: string[];
  
  /** Optional capabilities (nice to have) */
  optional?: string[];
}

export interface CapabilityContext {
  /** User permissions */
  userPermissions: UserPermissions;
  
  /** Provider capabilities */
  providerCapabilities: ProviderCapabilities;
  
  /** Runtime capabilities */
  runtimeCapabilities: RuntimeCapabilities;
  
  /** Tool requirements */
  toolRequirements: Map<string, CapabilityRequirements>;
}

export interface UserPermissions {
  /** Allowed actions */
  allowed: string[];
  
  /** Denied actions */
  denied: string[];
  
  /** Actions requiring confirmation */
  confirm: string[];
}

export interface RuntimeCapabilities {
  /** Available runtime features */
  features: string[];
  
  /** Available tools */
  tools: string[];
  
  /** Available integrations */
  integrations: string[];
}

export interface ResolvedCapabilities {
  /** Available tools */
  availableTools: string[];
  
  /** Denied tools */
  deniedTools: string[];
  
  /** Degraded tools */
  degradedTools: string[];
  
  /** Available actions */
  availableActions: string[];
  
  /** Denied actions */
  deniedActions: string[];
  
  /** Capability summary */
  summary: CapabilitySummary;
}

export interface CapabilitySummary {
  /** Total tools available */
  totalTools: number;
  
  /** Total tools denied */
  deniedTools: number;
  
  /** Provider capabilities */
  providerCapabilities: string[];
  
  /** Runtime capabilities */
  runtimeCapabilities: string[];
  
  /** User permissions */
  userPermissions: string[];
}

/**
 * Capability Resolver - resolves available capabilities
 */
export class CapabilityResolver {
  /**
   * Resolve capabilities based on context
   */
  resolve(context: CapabilityContext): ResolvedCapabilities {
    const availableTools: string[] = [];
    const deniedTools: string[] = [];
    const degradedTools: string[] = [];
    const availableActions: string[] = [];
    const deniedActions: string[] = [];

    // Check each tool
    for (const [toolName, requirements] of context.toolRequirements) {
      const result = this.checkTool(toolName, requirements, context);
      
      if (result.available) {
        availableTools.push(toolName);
        if (result.degraded) {
          degradedTools.push(toolName);
        }
      } else {
        deniedTools.push(toolName);
      }
    }

    // Check general actions
    const actions = ['read', 'write', 'execute', 'network'];
    for (const action of actions) {
      if (this.checkAction(action, context)) {
        availableActions.push(action);
      } else {
        deniedActions.push(action);
      }
    }

    return {
      availableTools,
      deniedTools,
      degradedTools,
      availableActions,
      deniedActions,
      summary: this.createSummary(context, availableTools, deniedTools),
    };
  }

  /**
   * Check if a tool is available
   */
  private checkTool(
    toolName: string,
    requirements: CapabilityRequirements,
    context: CapabilityContext
  ): { available: boolean; degraded: boolean } {
    // Check user permissions
    if (context.userPermissions.denied.includes(toolName)) {
      return { available: false, degraded: false };
    }

    // Check required capabilities
    for (const capability of requirements.required) {
      if (!this.checkCapability(capability, context)) {
        return { available: false, degraded: false };
      }
    }

    // Check optional capabilities (degraded if missing)
    let degraded = false;
    if (requirements.optional) {
      for (const capability of requirements.optional) {
        if (!this.checkCapability(capability, context)) {
          degraded = true;
        }
      }
    }

    return { available: true, degraded };
  }

  /**
   * Check if a capability is available
   */
  private checkCapability(capability: string, context: CapabilityContext): boolean {
    // Check provider capabilities
    if (this.isProviderCapability(capability)) {
      return this.checkProviderCapability(capability, context.providerCapabilities);
    }

    // Check runtime capabilities
    if (context.runtimeCapabilities.features.includes(capability)) {
      return true;
    }

    if (context.runtimeCapabilities.tools.includes(capability)) {
      return true;
    }

    return false;
  }

  /**
   * Check if capability is a provider capability
   */
  private isProviderCapability(capability: string): boolean {
    const providerCapabilities = [
      'streaming', 'images', 'files', 'thinking', 'toolCalling',
      'webSearch', 'markdown', 'codeGeneration', 'multiModal',
    ];
    return providerCapabilities.includes(capability);
  }

  /**
   * Check provider capability
   */
  private checkProviderCapability(
    capability: string,
    providerCapabilities: ProviderCapabilities
  ): boolean {
    const key = capability as keyof ProviderCapabilities;
    const value = providerCapabilities[key];
    return value === true;
  }

  /**
   * Check if an action is available
   */
  private checkAction(action: string, context: CapabilityContext): boolean {
    // Check user permissions
    if (context.userPermissions.denied.includes(action)) {
      return false;
    }

    // Check if allowed
    if (context.userPermissions.allowed.includes(action)) {
      return true;
    }

    // Check if requires confirmation
    if (context.userPermissions.confirm.includes(action)) {
      return true; // Available but needs confirmation
    }

    return false;
  }

  /**
   * Create capability summary
   */
  private createSummary(
    context: CapabilityContext,
    availableTools: string[],
    deniedTools: string[]
  ): CapabilitySummary {
    const providerCapabilities = Object.entries(context.providerCapabilities)
      .filter(([_, value]) => value === true)
      .map(([key]) => key);

    return {
      totalTools: availableTools.length,
      deniedTools: deniedTools.length,
      providerCapabilities,
      runtimeCapabilities: context.runtimeCapabilities.features,
      userPermissions: context.userPermissions.allowed,
    };
  }

  /**
   * Check if provider supports required capabilities
   */
  checkProviderSupport(
    requirements: string[],
    providerCapabilities: ProviderCapabilities
  ): { supported: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const requirement of requirements) {
      if (!this.checkProviderCapability(requirement, providerCapabilities)) {
        missing.push(requirement);
      }
    }

    return {
      supported: missing.length === 0,
      missing,
    };
  }

  /**
   * Get capability mismatch info
   */
  getCapabilityMismatch(
    requested: string[],
    available: ProviderCapabilities
  ): CapabilityMismatch | null {
    const missing: string[] = [];

    for (const capability of requested) {
      if (!this.checkProviderCapability(capability, available)) {
        missing.push(capability);
      }
    }

    if (missing.length === 0) {
      return null;
    }

    return {
      requested,
      missing,
      available: Object.entries(available)
        .filter(([_, value]) => value === true)
        .map(([key]) => key),
    };
  }
}

export interface CapabilityMismatch {
  requested: string[];
  missing: string[];
  available: string[];
}

/**
 * Default capability resolver instance
 */
export const defaultCapabilityResolver = new CapabilityResolver();
