import type { ProviderCapabilities } from './capabilities.js';
import type { ToolDescription } from './tool.js';

/**
 * Bridge Protocol - Internal standard for Browser AI Bridge
 * 
 * All external APIs (OpenAI, Anthropic, Google) are adapters
 * that convert to/from this protocol.
 */
export interface BridgeRequest {
  /** Protocol version */
  version: '1.0';
  
  /** Session ID */
  session: string;
  
  /** Target provider ID */
  provider: string;
  
  /** Messages */
  messages: BridgeMessage[];
  
  /** Available tools */
  tools?: ToolDescription[];
  
  /** Permission context */
  permissions?: BridgePermissions;
  
  /** Enable streaming */
  stream: boolean;
  
  /** Request metadata */
  metadata: BridgeMetadata;
}

export interface BridgeMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  
  /** Tool calls made by assistant */
  toolCalls?: BridgeToolCall[];
  
  /** Tool result (for tool role) */
  toolCallId?: string;
  
  /** Message metadata */
  metadata?: Record<string, unknown>;
}

export interface BridgeToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface BridgePermissions {
  /** Allowed tools */
  allowedTools: string[];
  
  /** Denied tools */
  deniedTools: string[];
  
  /** Tools requiring confirmation */
  confirmTools: string[];
  
  /** Scope restrictions */
  scope: {
    allowedPaths: string[];
    allowedCommands: string[];
    deniedCommands: string[];
  };
}

export interface BridgeMetadata {
  /** Client identifier */
  client: string;
  
  /** Client version */
  clientVersion: string;
  
  /** Request timestamp */
  timestamp: number;
  
  /** User agent */
  userAgent?: string;
  
  /** Custom metadata */
  custom?: Record<string, unknown>;
}

/**
 * Bridge Response
 */
export interface BridgeResponse {
  /** Protocol version */
  version: '1.0';
  
  /** Session ID */
  session: string;
  
  /** Provider ID that handled request */
  provider: string;
  
  /** Response message */
  message: BridgeMessage;
  
  /** Usage statistics */
  usage?: BridgeUsage;
  
  /** Provider capabilities */
  capabilities?: ProviderCapabilities;
  
  /** Response metadata */
  metadata: BridgeResponseMetadata;
}

export interface BridgeUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface BridgeResponseMetadata {
  /** Request ID */
  requestId: string;
  
  /** Processing time in ms */
  duration: number;
  
  /** Provider-specific metadata */
  provider?: Record<string, unknown>;
}

/**
 * Bridge Stream Chunk
 */
export interface BridgeStreamChunk {
  /** Protocol version */
  version: '1.0';
  
  /** Session ID */
  session: string;
  
  /** Chunk delta */
  delta: {
    role?: 'assistant';
    content?: string;
    toolCalls?: BridgeToolCall[];
  };
  
  /** Finish reason (only in last chunk) */
  finishReason?: 'stop' | 'tool_calls' | 'length';
}

/**
 * Adapter interface - converts external API to Bridge Protocol
 */
export interface BridgeAdapter {
  /** Adapter name */
  readonly name: string;
  
  /** Supported external format */
  readonly format: 'openai' | 'anthropic' | 'google' | 'custom';
  
  /** Convert external request to Bridge Protocol */
  toBridgeRequest(external: unknown): BridgeRequest;
  
  /** Convert Bridge Response to external format */
  fromBridgeResponse(response: BridgeResponse): unknown;
  
  /** Convert Bridge Stream Chunk to external format */
  fromBridgeStreamChunk(chunk: BridgeStreamChunk): unknown;
}

/**
 * Create a Bridge Request
 */
export function createBridgeRequest(params: {
  session: string;
  provider: string;
  messages: BridgeMessage[];
  tools?: ToolDescription[];
  stream?: boolean;
  client?: string;
}): BridgeRequest {
  return {
    version: '1.0',
    session: params.session,
    provider: params.provider,
    messages: params.messages,
    tools: params.tools,
    stream: params.stream ?? false,
    metadata: {
      client: params.client ?? 'unknown',
      clientVersion: '0.1.0',
      timestamp: Date.now(),
    },
  };
}

/**
 * Create a Bridge Response
 */
export function createBridgeResponse(params: {
  session: string;
  provider: string;
  message: BridgeMessage;
  requestId: string;
  duration: number;
}): BridgeResponse {
  return {
    version: '1.0',
    session: params.session,
    provider: params.provider,
    message: params.message,
    metadata: {
      requestId: params.requestId,
      duration: params.duration,
    },
  };
}
