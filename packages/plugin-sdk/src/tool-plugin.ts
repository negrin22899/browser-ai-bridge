import type { Tool } from '@bab/protocol';
import type { Plugin, PluginContext } from './types.js';

/**
 * Tool Plugin - wraps a Tool as a Plugin
 *
 * This makes it easy to convert existing tools into plugins.
 */
export class ToolPlugin implements Plugin {
  readonly manifest;
  private tool: Tool;
  private logger?: any;

  constructor(tool: Tool, options?: {
    version?: string;
    description?: string;
    author?: string;
  }) {
    this.tool = tool;

    this.manifest = {
      name: `tool-${tool.name.replace('.', '-')}`,
      version: options?.version ?? '1.0.0',
      description: options?.description ?? tool.description,
      author: options?.author,
      provides: {
        tools: [{
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters as Record<string, unknown>,
          permissionMode: 'auto' as const,
        }],
      },
    };
  }

  async initialize(context: PluginContext): Promise<void> {
    this.logger = context.getLogger(this.manifest.name);
    context.registerTool(this.tool);
    this.logger.info(`Tool ${this.tool.name} registered`);
  }

  async shutdown(): Promise<void> {
    this.logger?.info(`Tool ${this.tool.name} shutting down`);
  }

  async health() {
    return { healthy: true };
  }
}

/**
 * Create a tool plugin from a tool
 */
export function createToolPluginFromTool(
  tool: Tool,
  options?: {
    version?: string;
    description?: string;
    author?: string;
  }
): ToolPlugin {
  return new ToolPlugin(tool, options);
}

/**
 * Tool Plugin Builder - fluent API for creating tool plugins
 */
export class ToolPluginBuilder {
  private name: string;
  private version: string;
  private description: string;
  private author?: string;
  private tools: Tool[] = [];
  private initFn?: (context: PluginContext) => Promise<void>;
  private shutdownFn?: () => Promise<void>;

  constructor(name: string, version: string, description: string) {
    this.name = name;
    this.version = version;
    this.description = description;
  }

  /**
   * Add a tool
   */
  tool(tool: Tool): this {
    this.tools.push(tool);
    return this;
  }

  /**
   * Set author
   */
  setAuthor(author: string): this {
    this.author = author;
    return this;
  }

  /**
   * Set initialization function
   */
  onInit(fn: (context: PluginContext) => Promise<void>): this {
    this.initFn = fn;
    return this;
  }

  /**
   * Set shutdown function
   */
  onShutdown(fn: () => Promise<void>): this {
    this.shutdownFn = fn;
    return this;
  }

  /**
   * Build the plugin
   */
  build(): Plugin {
    const tools = this.tools;
    const initFn = this.initFn;
    const shutdownFn = this.shutdownFn;

    return {
      manifest: {
        name: this.name,
        version: this.version,
        description: this.description,
        author: this.author,
        provides: {
          tools: tools.map(t => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters as Record<string, unknown>,
            permissionMode: 'auto' as const,
          })),
        },
      },

      async initialize(context: PluginContext): Promise<void> {
        for (const tool of tools) {
          context.registerTool(tool);
        }

        if (initFn) {
          await initFn(context);
        }
      },

      async shutdown(): Promise<void> {
        if (shutdownFn) {
          await shutdownFn();
        }
      },

      async health() {
        return { healthy: true };
      },
    };
  }
}

/**
 * Create a tool plugin builder
 */
export function createToolPluginBuilder(
  name: string,
  version: string,
  description: string
): ToolPluginBuilder {
  return new ToolPluginBuilder(name, version, description);
}
