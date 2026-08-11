/**
 * @bab/mcp-adapter - MCP Adapter for Browser AI Bridge
 * 
 * MCP is used as an ADAPTER, not as a foundation.
 * BAB preserves its own Tool Protocol, Capability System, Permission Engine.
 */

// Client adapter
export { MCPClientAdapter } from './client-adapter.js';

// Tool mapper
export { mapMCPTool, mapMCPTools, extractOriginalName, extractServerId, isMCPTool } from './tool-mapper.js';

// Types
export type {
  MCPServerIdentity,
  MCPServerConfig,
  MCPServerStatus,
  MCPTransport,
  MCPToolDefinition,
  MCPToolAnnotations,
  MCPToolCall,
  MCPToolResult,
  MCPContent,
  MCPTextContent,
  MCPImageContent,
  MCPResourceContent,
  MCPConnectionConfig,
  MCPPermissions,
  MCPAdapterEvents,
} from './types.js';
