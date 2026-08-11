import type { ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk } from './message.js';
import type { ToolDescription } from './tool.js';

/**
 * Provider Abstraction 2.0 — Unified Contract
 * 
 * Core Runtime does NOT know internal details of specific Providers.
 * All providers implement this single contract.
 */

// ============================================================================
// PROVIDER METADATA
// ============================================================================

export interface ProviderMetadata {
  /** Unique provider identifier */
  readonly id: string;
  
  /** Human-readable name */
  readonly name: string;
  
  /** Provider version */
  readonly version: string;
  
  /** Provider type */
  readonly type: ProviderType;
  
  /** Transport mechanism */
  readonly transport: ProviderTransport;
  
  /** Supported models */
  readonly supportedModels: string[];
  
  /** Provider description */
  readonly description?: string;
  
  /** Provider author */
  readonly author?: string;
  
  /** Provider homepage */
  readonly homepage?: string;
}

export type ProviderType = 'browser' | 'api' | 'local';

export type ProviderTransport = 'playwright' | 'cdp' | 'http' | 'websocket' | 'stdio';

// ============================================================================
// PROVIDER STATE
// ============================================================================

/**
 * Provider State - answers "Is the provider working?"
 */
export type ProviderState = 
  | 'discovered'      // Found but not connected
  | 'connecting'      // Connection in progress
  | 'connected'       // Ready to use
  | 'degraded'        // Working with reduced capabilities
  | 'disconnected'    // Was connected, now disconnected
  | 'recovering'      // Attempting to recover
  | 'error'           // Failed state
  | 'shutdown';       // Permanently shut down

export interface ProviderStateInfo {
  /** Current state */
  state: ProviderState;
  
  /** State timestamp */
  timestamp: number;
  
  /** State duration in ms */
  duration: number;
  
  /** Error if in error state */
  error?: ProviderError;
  
  /** Recovery info if recovering */
  recovery?: RecoveryInfo;
}

export interface RecoveryInfo {
  /** Recovery attempt number */
  attempt: number;
  
  /** Max attempts */
  maxAttempts: number;
  
  /** Next retry in ms */
  nextRetryMs: number;
  
  /** Recovery strategy */
  strategy: string;
}

// ============================================================================
// PROVIDER HEALTH
// ============================================================================

/**
 * Provider Health - detailed health information
 */
export interface ProviderHealth {
  /** Overall healthy status */
  healthy: boolean;
  
  /** Connection status */
  connection: ConnectionHealth;
  
  /** Browser/session status (for browser providers) */
  browser?: BrowserHealth;
  
  /** Latency information */
  latency: LatencyHealth;
  
  /** Last successful request */
  lastSuccess?: RequestInfo;
  
  /** Last error */
  lastError?: RequestError;
  
  /** Capabilities status */
  capabilities: CapabilitiesHealth;
}

export interface ConnectionHealth {
  /** Is connected */
  connected: boolean;
  
  /** Connection quality */
  quality: 'excellent' | 'good' | 'poor' | 'unknown';
  
  /** Connection uptime in ms */
  uptime: number;
}

export interface BrowserHealth {
  /** Browser is running */
  running: boolean;
  
  /** Page is loaded */
  pageLoaded: boolean;
  
  /** Page URL */
  url: string;
  
  /** Is authenticated */
  authenticated: boolean;
  
  /** Session valid */
  sessionValid: boolean;
}

export interface LatencyHealth {
  /** Current latency in ms */
  current: number;
  
  /** Average latency in ms */
  average: number;
  
  /** P95 latency in ms */
  p95: number;
  
  /** Last measured latency in ms */
  last: number;
}

export interface RequestInfo {
  /** Request timestamp */
  timestamp: number;
  
  /** Request duration in ms */
  duration: number;
  
  /** Model used */
  model: string;
}

export interface RequestError {
  /** Error timestamp */
  timestamp: number;
  
  /** Normalized error code */
  code: ProviderErrorCode;
  
  /** Human-readable message */
  message: string;
  
  /** Original error (for diagnostics) */
  original?: unknown;
}

export interface CapabilitiesHealth {
  /** Available capabilities */
  available: string[];
  
  /** Degraded capabilities */
  degraded: string[];
  
  /** Unavailable capabilities */
  unavailable: string[];
}

// ============================================================================
// PROVIDER CAPABILITIES
// ============================================================================

/**
 * Provider Capabilities - answers "What can it do?"
 */
export interface ProviderCapabilities {
  /** Can stream responses */
  streaming: boolean;
  
  /** Can handle images */
  images: boolean;
  
  /** Can handle files */
  files: boolean;
  
  /** Supports thinking/reasoning */
  thinking: boolean;
  
  /** Supports tool/function calling */
  toolCalling: boolean;
  
  /** Can search the web */
  webSearch: boolean;
  
  /** Supports markdown formatting */
  markdown: boolean;
  
  /** Can generate code */
  codeGeneration: boolean;
  
  /** Supports multi-modal input */
  multiModal: boolean;
  
  /** Maximum context window size */
  maxContextTokens?: number;
  
  /** Maximum output tokens */
  maxOutputTokens?: number;
  
  /** Supported languages */
  languages?: string[];
  
  /** Custom capabilities */
  custom?: Record<string, boolean | string | number>;
}

/**
 * Capability status for degraded state
 */
export interface CapabilityStatus {
  /** Capability name */
  name: string;
  
  /** Is available */
  available: boolean;
  
  /** Is degraded */
  degraded: boolean;
  
  /** Status message */
  message?: string;
}

// ============================================================================
// PROVIDER ERROR MODEL
// ============================================================================

/**
 * Normalized Provider Error Codes
 * 
 * External Runtime works with these, not with specific Playwright/Gemini/ChatGPT errors.
 */
export type ProviderErrorCode = 
  | 'AUTH_REQUIRED'              // Not signed in or session expired
  | 'BROWSER_UNAVAILABLE'       // Chrome not found or crashed
  | 'PAGE_NOT_FOUND'            // AI page not loaded
  | 'UI_CHANGED'                // AI interface changed selectors
  | 'NETWORK_ERROR'             // Network connectivity issue
  | 'TIMEOUT'                   // Operation timed out
  | 'RATE_LIMITED'              // Too many requests
  | 'PROVIDER_ERROR'            // Generic provider error
  | 'CAPABILITY_UNAVAILABLE'    // Requested capability not supported
  | 'SESSION_EXPIRED'           // Browser session expired
  | 'REQUEST_CANCELLED'         // Request was cancelled
  | 'UNKNOWN';                  // Unknown error

export interface ProviderError {
  /** Normalized error code */
  code: ProviderErrorCode;
  
  /** Human-readable message */
  message: string;
  
  /** Provider-specific details */
  details?: Record<string, unknown>;
  
  /** Original error for diagnostics */
  original?: unknown;
  
  /** Is this error recoverable? */
  recoverable: boolean;
  
  /** Suggested recovery action */
  recovery?: string;
  
  /** Timestamp */
  timestamp: number;
}

/**
 * Create a normalized provider error
 */
export function createProviderError(
  code: ProviderErrorCode,
  message: string,
  options?: {
    details?: Record<string, unknown>;
    original?: unknown;
    recoverable?: boolean;
    recovery?: string;
  }
): ProviderError {
  return {
    code,
    message,
    details: options?.details,
    original: options?.original,
    recoverable: options?.recoverable ?? false,
    recovery: options?.recovery,
    timestamp: Date.now(),
  };
}

// ============================================================================
// PROVIDER INTERFACE (UNIFIED CONTRACT)
// ============================================================================

/**
 * Provider Interface - the unified contract all providers implement
 * 
 * Core Runtime only knows this interface, not provider internals.
 */
export interface Provider {
  // --- Metadata (readonly) ---
  readonly metadata: ProviderMetadata;
  
  // --- State ---
  readonly state: ProviderStateInfo;
  
  // --- Lifecycle ---
  
  /** Discover provider capabilities */
  discover?(): Promise<void>;
  
  /** Connect to the AI service */
  connect(): Promise<void>;
  
  /** Disconnect from the AI service */
  disconnect(): Promise<void>;
  
  // --- Health ---
  
  /** Check provider health */
  health(): Promise<ProviderHealth>;
  
  // --- Capabilities ---
  
  /** Get provider capabilities */
  getCapabilities(): ProviderCapabilities;
  
  /** Check if capability is available */
  hasCapability(name: string): boolean;
  
  // --- Communication ---
  
  /** Send a message and get response */
  send(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  
  /** Stream response chunks */
  stream(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk>;
  
  /** Cancel current request */
  cancel(): void;
  
  // --- Tools ---
  
  /** Get available tools */
  getTools?(): ToolDescription[];
  
  /** Set tools */
  setTools?(tools: ToolDescription[]): void;
}

// ============================================================================
// PROVIDER MANAGER
// ============================================================================

export interface ProviderManager {
  /** Register a provider */
  register(provider: Provider): void;
  
  /** Unregister a provider */
  unregister(id: string): void;
  
  /** Get provider by ID */
  get(id: string): Provider | undefined;
  
  /** List all providers */
  list(): Provider[];
  
  /** Get active provider */
  getActive(): Provider;
  
  /** Set active provider */
  setActive(id: string): void;
  
  /** Get providers by type */
  getByType(type: ProviderType): Provider[];
  
  /** Health check all providers */
  healthCheckAll(): Promise<Map<string, ProviderHealth>>;
  
  /** Shutdown all providers */
  shutdownAll(): Promise<void>;
}

// ============================================================================
// PROVIDER CONFIG
// ============================================================================

// Note: ProviderConfig, ProviderManager are defined in provider.ts
// This file only contains new v2 types
