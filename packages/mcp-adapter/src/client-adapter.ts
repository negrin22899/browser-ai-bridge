import type { Tool, ToolResult, ToolContext, ToolRequirements } from '@bab/protocol';
import type {
  MCPServerIdentity,
  MCPServerConfig,
  MCPToolDefinition,
  MCPToolCall,
  MCPToolResult,
  MCPTransport,
  MCPServerStatus,
} from './types.js';

/**
 * MCP Client Adapter
 * 
 * Connects to external MCP servers and discovers their tools.
 * Each MCP tool is mapped to BAB Tool model.
 * 
 * Architecture:
 * MCP Server → MCP Adapter → BAB Tool Registry → Capability Resolver → Permission Engine → AI
 */

export class MCPClientAdapter {
  private servers: Map<string, MCPServerConnection> = new Map();
  private tools: Map<string, MCPToolWrapper> = new Map();

  /**
   * Connect to an MCP server
   */
  async connect(config: MCPServerConfig): Promise<MCPServerIdentity> {
    const connection = new MCPServerConnection(config);
    await connection.connect();
    
    this.servers.set(config.serverId, connection);

    // Discover tools
    const mcpTools = await connection.listTools();
    
    for (const mcpTool of mcpTools) {
      const wrappedTool = this.wrapTool(config.serverId, mcpTool, config);
      this.tools.set(wrappedTool.name, wrappedTool);
    }

    return connection.getIdentity();
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(serverId: string): Promise<void> {
    const connection = this.servers.get(serverId);
    if (!connection) {
      return;
    }

    // Remove tools from this server
    for (const [name, tool] of this.tools) {
      if (tool.serverId === serverId) {
        this.tools.delete(name);
      }
    }

    await connection.disconnect();
    this.servers.delete(serverId);
  }

  /**
   * Get all MCP tools as BAB tools
   */
  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools from a specific server
   */
  getToolsByServer(serverId: string): Tool[] {
    return Array.from(this.tools.values())
      .filter(t => t.serverId === serverId);
  }

  /**
   * Get server identity
   */
  getServer(serverId: string): MCPServerIdentity | undefined {
    return this.servers.get(serverId)?.getIdentity();
  }

  /**
   * Get all connected servers
   */
  getServers(): MCPServerIdentity[] {
    return Array.from(this.servers.values())
      .map(c => c.getIdentity());
  }

  /**
   * Check if a server is connected
   */
  isConnected(serverId: string): boolean {
    return this.servers.has(serverId);
  }

  /**
   * Execute a tool call on an MCP server
   */
  async executeTool(toolName: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`MCP tool not found: ${toolName}`);
    }

    const connection = this.servers.get(tool.serverId);
    if (!connection) {
      throw new Error(`MCP server not connected: ${tool.serverId}`);
    }

    return await connection.callTool({
      name: tool.originalName,
      arguments: args,
    });
  }

  /**
   * Wrap an MCP tool as a BAB tool
   */
  private wrapTool(serverId: string, mcpTool: MCPToolDefinition, config: MCPServerConfig): MCPToolWrapper {
    const namespacedName = `mcp.${serverId}.${mcpTool.name}`;
    
    return {
      name: namespacedName,
      description: mcpTool.description ?? `MCP tool: ${mcpTool.name}`,
      parameters: mcpTool.inputSchema ?? { type: 'object', properties: {} },
      serverId,
      originalName: mcpTool.name,
      requirements: this.buildRequirements(config),
      annotations: mcpTool.annotations,

      execute: async (params: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> => {
        try {
          const result = await this.executeTool(namespacedName, params);
          
          // Extract text content
          const textContent = result.content
            .filter(c => c.type === 'text')
            .map(c => (c as { type: 'text'; text: string }).text)
            .join('\n');

          return {
            success: !result.isError,
            output: textContent,
            metadata: {
              source: 'mcp',
              serverId,
              originalToolName: mcpTool.name,
            },
          };
        } catch (error) {
          return {
            success: false,
            output: '',
            error: error instanceof Error ? error.message : String(error),
            metadata: {
              source: 'mcp',
              serverId,
              originalToolName: mcpTool.name,
            },
          };
        }
      },
    };
  }

  /**
   * Build tool requirements from server config
   */
  private buildRequirements(config: MCPServerConfig): ToolRequirements {
    const requirements: ToolRequirements = {
      runtimeCapabilities: ['mcp'],
    };

    // Add custom requirements from config
    if (config.capabilities) {
      requirements.runtimeCapabilities = [
        ...(requirements.runtimeCapabilities ?? []),
        ...config.capabilities,
      ];
    }

    return requirements;
  }
}

/**
 * MCP Server Connection - manages connection to a single MCP server
 */
class MCPServerConnection {
  private config: MCPServerConfig;
  private identity: MCPServerIdentity;
  private status: MCPServerStatus = 'disconnected';

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.identity = {
      serverId: config.serverId,
      name: config.name,
      transport: config.transport,
      source: `mcp:${config.serverId}`,
      status: 'disconnected',
    };
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    this.status = 'connecting';
    this.identity.status = 'connecting';

    try {
      // Connection implementation depends on transport
      switch (this.config.transport) {
        case 'stdio':
          await this.connectStdio();
          break;
        case 'sse':
        case 'http':
          await this.connectHttp();
          break;
        case 'websocket':
          await this.connectWebSocket();
          break;
        default:
          throw new Error(`Unsupported transport: ${this.config.transport}`);
      }

      this.status = 'connected';
      this.identity.status = 'connected';
    } catch (error) {
      this.status = 'error';
      this.identity.status = 'error';
      throw error;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    this.status = 'disconnected';
    this.identity.status = 'disconnected';
  }

  /**
   * List tools from the MCP server
   */
  async listTools(): Promise<MCPToolDefinition[]> {
    if (this.status !== 'connected') {
      throw new Error('MCP server not connected');
    }

    // In a real implementation, this would send a tools/list request
    // For now, return empty array
    return [];
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(call: MCPToolCall): Promise<MCPToolResult> {
    if (this.status !== 'connected') {
      throw new Error('MCP server not connected');
    }

    // In a real implementation, this would send a tools/call request
    // For now, return a placeholder
    return {
      content: [{ type: 'text', text: `MCP tool ${call.name} executed (placeholder)` }],
      isError: false,
    };
  }

  /**
   * Get server identity
   */
  getIdentity(): MCPServerIdentity {
    return { ...this.identity };
  }

  /**
   * Connect via stdio
   */
  private async connectStdio(): Promise<void> {
    const { command, args } = this.config.connection;
    if (!command) {
      throw new Error('stdio transport requires command');
    }
    // Implementation: spawn process, setup stdin/stdout communication
    console.log(`MCP stdio: ${command} ${(args ?? []).join(' ')}`);
  }

  /**
   * Connect via HTTP/SSE
   */
  private async connectHttp(): Promise<void> {
    const { url } = this.config.connection;
    if (!url) {
      throw new Error('HTTP transport requires url');
    }
    // Implementation: fetch server info, setup SSE connection
    console.log(`MCP HTTP: ${url}`);
  }

  /**
   * Connect via WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    const { url } = this.config.connection;
    if (!url) {
      throw new Error('WebSocket transport requires url');
    }
    // Implementation: connect WebSocket
    console.log(`MCP WebSocket: ${url}`);
  }
}

/**
 * MCP Tool Wrapper - wraps an MCP tool as a BAB Tool
 */
interface MCPToolWrapper extends Tool {
  serverId: string;
  originalName: string;
  annotations?: Record<string, unknown>;
}
