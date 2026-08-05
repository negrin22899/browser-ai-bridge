import type { ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk } from './message.js';
import type { ToolDescription } from './tool.js';
import type { ProviderCapabilities } from './capabilities.js';

/**
 * Provider interface - abstract connection to any AI service
 * Each AI (Gemini, ChatGPT, Claude) implements this interface
 */
export interface Provider {
  readonly id: string;
  readonly name: string;
  readonly type: ProviderType;
  readonly status: ProviderStatus;

  /** Connect to the AI service */
  connect(): Promise<void>;

  /** Disconnect from the AI service */
  disconnect(): Promise<void>;

  /** Send a message and get response */
  send(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;

  /** Stream response chunks */
  stream(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk>;

  /** Check if provider is healthy and ready */
  health(): Promise<HealthCheckResult>;

  /** Get provider capabilities */
  getCapabilities(): ProviderCapabilities;

  /** Get available tools */
  getTools?(): ToolDescription[];

  /** Cancel current request */
  cancel(): void;
}

export type ProviderType = 'browser' | 'api' | 'local';

export type ProviderStatus = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'busy' 
  | 'error' 
  | 'shutdown';

export interface HealthCheckResult {
  healthy: boolean;
  latency?: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface ProviderConfig {
  id: string;
  type: ProviderType;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface ProviderManager {
  register(provider: Provider): void;
  unregister(id: string): void;
  get(id: string): Provider | undefined;
  list(): Provider[];
  getActive(): Provider;
  setActive(id: string): void;
  getByType(type: ProviderType): Provider[];
  healthCheckAll(): Promise<Map<string, HealthCheckResult>>;
}
