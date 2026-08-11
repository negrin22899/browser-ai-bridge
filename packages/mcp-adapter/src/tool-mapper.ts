import type { Tool, ToolResult, ToolContext, ToolRequirements } from '@bab/protocol';
import type { MCPToolDefinition, MCPToolAnnotations } from './types.js';

/**
 * MCP Tool Mapper
 * 
 * Maps MCP tools to BAB Tool model.
 * 
 * MCP Tool → BAB Tool
 * 
 * Preserves:
 * - name (namespaced)
 * - description
 * - input schema
 * - metadata
 * - required capabilities
 * - source
 * - MCP server identity
 */

export interface MCPToolMappingOptions {
  /** Server ID for namespacing */
  serverId: string;
  
  /** Server name for display */
  serverName: string;
  
  /** Custom namespace prefix */
  namespacePrefix?: string;
  
  /** Default requirements */
  defaultRequirements?: ToolRequirements;
}

/**
 * Map an MCP tool to a BAB tool
 */
export function mapMCPTool(
  mcpTool: MCPToolDefinition,
  options: MCPToolMappingOptions,
  executor: (name: string, args: Record<string, unknown>) => Promise<{ content: string; isError: boolean }>
): Tool {
  const namespacedName = buildNamespacedName(mcpTool.name, options);
  const requirements = buildRequirements(mcpTool, options);

  return {
    name: namespacedName,
    description: buildDescription(mcpTool, options),
    parameters: mcpTool.inputSchema ?? { type: 'object', properties: {} },
    requirements,

    execute: async (params: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> => {
      try {
        const result = await executor(mcpTool.name, params);

        return {
          success: !result.isError,
          output: result.content,
          metadata: {
            source: 'mcp',
            serverId: options.serverId,
            serverName: options.serverName,
            originalToolName: mcpTool.name,
            namespacedName,
          },
        };
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : String(error),
          metadata: {
            source: 'mcp',
            serverId: options.serverId,
            serverName: options.serverName,
            originalToolName: mcpTool.name,
            namespacedName,
          },
        };
      }
    },
  };
}

/**
 * Build namespaced tool name
 * 
 * Format: mcp.<serverId>.<toolName>
 * Example: mcp.github.create_issue
 */
function buildNamespacedName(toolName: string, options: MCPToolMappingOptions): string {
  const prefix = options.namespacePrefix ?? 'mcp';
  return `${prefix}.${options.serverId}.${toolName}`;
}

/**
 * Build tool description
 */
function buildDescription(mcpTool: MCPToolDefinition, options: MCPToolMappingOptions): string {
  const parts: string[] = [];

  if (mcpTool.description) {
    parts.push(mcpTool.description);
  }

  parts.push(`[MCP: ${options.serverName}]`);

  // Add annotation hints
  if (mcpTool.annotations) {
    const hints: string[] = [];
    if (mcpTool.annotations.readOnlyHint) {
      hints.push('read-only');
    }
    if (mcpTool.annotations.destructiveHint) {
      hints.push('destructive');
    }
    if (mcpTool.annotations.requiresConfirmation) {
      hints.push('requires confirmation');
    }
    if (hints.length > 0) {
      parts.push(`[${hints.join(', ')}]`);
    }
  }

  return parts.join(' ');
}

/**
 * Build tool requirements
 */
function buildRequirements(
  mcpTool: MCPToolDefinition,
  options: MCPToolMappingOptions
): ToolRequirements {
  const requirements: ToolRequirements = {
    ...options.defaultRequirements,
    runtimeCapabilities: ['mcp', ...(options.defaultRequirements?.runtimeCapabilities ?? [])],
  };

  // Infer requirements from annotations
  if (mcpTool.annotations) {
    if (mcpTool.annotations.destructiveHint) {
      requirements.permissions = ['mcp.write'];
    }
    if (mcpTool.annotations.requiresConfirmation) {
      requirements.permissions = ['mcp.confirm'];
    }
  }

  return requirements;
}

/**
 * Batch map multiple MCP tools
 */
export function mapMCPTools(
  mcpTools: MCPToolDefinition[],
  options: MCPToolMappingOptions,
  executor: (name: string, args: Record<string, unknown>) => Promise<{ content: string; isError: boolean }>
): Tool[] {
  return mcpTools.map(tool => mapMCPTool(tool, options, executor));
}

/**
 * Extract original tool name from namespaced name
 */
export function extractOriginalName(namespacedName: string): string {
  const parts = namespacedName.split('.');
  // mcp.serverId.toolName -> toolName
  return parts.length >= 3 ? parts.slice(2).join('.') : namespacedName;
}

/**
 * Extract server ID from namespaced name
 */
export function extractServerId(namespacedName: string): string | undefined {
  const parts = namespacedName.split('.');
  // mcp.serverId.toolName -> serverId
  return parts.length >= 2 ? parts[1] : undefined;
}

/**
 * Check if a tool name is an MCP tool
 */
export function isMCPTool(name: string): boolean {
  return name.startsWith('mcp.');
}
