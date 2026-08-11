/**
 * MCP Types - Model Context Protocol types for Browser AI Bridge
 * 
 * MCP is used as an ADAPTER, not as a foundation.
 * BAB preserves its own Tool Protocol, Capability System, Permission Engine.
 */

// ============================================================================
// MCP SERVER IDENTITY
// ============================================================================

export interface MCPServerIdentity {
  /** Unique server ID */
  serverId: string;
  
  /** Server name */
  name: string;
  
  /** Server version */
  version?: string;
  
  /** Transport type */
  transport: MCPTransport;
  
  /** Source identifier */
  source: string;
  
  /** Connection status */
  status: MCPServerStatus;
}

export type MCPTransport = 'stdio' | 'sse' | 'websocket' | 'http';

export type MCPServerStatus = 
  | 'discovered'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'recovering';

// ============================================================================
// MCP TOOL DEFINITION
// ============================================================================

export interface MCPToolDefinition {
  /** Tool name (original from MCP server) */
  name: string;
  
  /** Tool description */
  description?: string;
  
  /** Input schema (JSON Schema) */
  inputSchema?: Record<string, unknown>;
  
  /** Tool annotations/metadata */
  annotations?: MCPToolAnnotations;
}

export interface MCPToolAnnotations {
  /** Is tool read-only */
  readOnlyHint?: boolean;
  
  /** Is tool destructive */
  destructiveHint?: boolean;
  
  /** Does tool require confirmation */
  requiresConfirmation?: boolean;
  
  /** Custom annotations */
  [key: string]: unknown;
}

// ============================================================================
// MCP TOOL CALL / RESULT
// ============================================================================

export interface MCPToolCall {
  /** Tool name */
  name: string;
  
  /** Tool arguments */
  arguments?: Record<string, unknown>;
}

export interface MCPToolResult {
  /** Result content */
  content: MCPContent[];
  
  /** Is error */
  isError?: boolean;
}

export type MCPContent = 
  | MCPTextContent
  | MCPImageContent
  | MCPResourceContent;

export interface MCPTextContent {
  type: 'text';
  text: string;
}

export interface MCPImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

export interface MCPResourceContent {
  type: 'resource';
  resource: {
    uri: string;
    text?: string;
    mimeType?: string;
  };
}

// ============================================================================
// MCP SERVER CONFIG
// ============================================================================

export interface MCPServerConfig {
  /** Server ID */
  serverId: string;
  
  /** Server name */
  name: string;
  
  /** Transport type */
  transport: MCPTransport;
  
  /** Connection configuration */
  connection: MCPConnectionConfig;
  
  /** Is enabled */
  enabled: boolean;
  
  /** Permissions for this server */
  permissions?: MCPPermissions;
  
  /** Requested capabilities */
  capabilities?: string[];
}

export interface MCPConnectionConfig {
  /** Command for stdio transport */
  command?: string;
  
  /** Arguments for stdio transport */
  args?: string[];
  
  /** URL for SSE/HTTP/WebSocket transport */
  url?: string;
  
  /** Environment variables */
  env?: Record<string, string>;
  
  /** Connection timeout in ms */
  timeout?: number;
}

export interface MCPPermissions {
  /** Allowed tools */
  allowedTools?: string[];
  
  /** Denied tools */
  deniedTools?: string[];
  
  /** Tools requiring confirmation */
  confirmTools?: string[];
}

// ============================================================================
// MCP ADAPTER EVENTS
// ============================================================================

export interface MCPAdapterEvents {
  'mcp.server.connected': { serverId: string };
  'mcp.server.disconnected': { serverId: string; reason?: string };
  'mcp.server.error': { serverId: string; error: string };
  'mcp.tool.discovered': { serverId: string; toolName: string };
  'mcp.tool.executed': { serverId: string; toolName: string; duration: number };
  'mcp.tool.error': { serverId: string; toolName: string; error: string };
}
