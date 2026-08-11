/**
 * Tool Interface - with requirements declaration
 */

export interface Tool {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
  readonly requirements?: ToolRequirements;

  execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
}

/**
 * Tool Requirements - declares what capabilities a tool needs
 */
export interface ToolRequirements {
  /** Required provider capabilities */
  providerCapabilities?: string[];
  
  /** Required runtime capabilities */
  runtimeCapabilities?: string[];
  
  /** Required permissions */
  permissions?: string[];
  
  /** Whether tool calling is required */
  requiresToolCalling?: boolean;
  
  /** Whether streaming is required */
  requiresStreaming?: boolean;
  
  /** Custom requirements */
  custom?: Record<string, unknown>;
}

/**
 * Tool availability status
 */
export type ToolAvailabilityStatus = 
  | 'available'           // Tool is available and ready
  | 'unavailable'         // Tool is not available
  | 'denied'              // Tool is denied by permissions
  | 'confirmation_required'; // Tool requires user confirmation

/**
 * Tool availability result
 */
export interface ToolAvailability {
  /** Tool name */
  name: string;
  
  /** Availability status */
  status: ToolAvailabilityStatus;
  
  /** Is tool available? */
  available: boolean;
  
  /** Reason for unavailability */
  reason?: string;
  
  /** Category of reason */
  reasonCategory?: ToolUnavailabilityReason;
  
  /** Required capabilities that are missing */
  missingCapabilities?: string[];
  
  /** Required permissions that are missing */
  missingPermissions?: string[];
}

/**
 * Reasons for tool unavailability
 */
export type ToolUnavailabilityReason =
  | 'provider_unsupported'    // Provider doesn't support required capability
  | 'runtime_unsupported'     // Runtime doesn't have required capability
  | 'permission_denied'       // User permission denied
  | 'permission_confirm'      // Requires user confirmation
  | 'capability_degraded'     // Capability is degraded
  | 'session_expired'         // Session expired
  | 'unknown';                // Unknown reason

export interface ToolContext {
  sessionId: string;
  workingDirectory: string;
  scope: ToolScope;
  env: Record<string, string>;
}

export interface ToolScope {
  allowedPaths: string[];
  allowedCommands: string[];
  deniedCommands: string[];
  maxExecutionTime: number;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ToolDispatcher {
  register(tool: Tool): void;
  unregister(name: string): void;
  get(name: string): Tool | undefined;
  list(): Tool[];
  execute(name: string, params: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
  getDescriptions(): ToolDescription[];
}

export interface ToolDescription {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  requirements?: ToolRequirements;
}
