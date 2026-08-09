import type { Provider, Tool } from '@bab/protocol';
import type { Plugin, PluginContext, PluginManifest } from './types.js';

/**
 * Plugin Builder - fluent API for creating plugins
 *
 * Usage:
 * ```typescript
 * const myPlugin = createPlugin('my-plugin', '1.0.0', 'My awesome plugin')
 *   .provider(new MyProvider())
 *   .tool(new MyTool())
 *   .onInit(async (ctx) => { ... })
 *   .onShutdown(async () => { ... })
 *   .build();
 * ```
 */
export class PluginBuilder {
  private manifest: Partial<PluginManifest>;
  private providers: Provider[] = [];
  private tools: Tool[] = [];
  private initFn?: (context: PluginContext) => Promise<void>;
  private shutdownFn?: () => Promise<void>;
  private healthFn?: () => Promise<{ healthy: boolean; message?: string }>;

  constructor(name: string, version: string, description: string) {
    this.manifest = {
      name,
      version,
      description,
      provides: {},
    };
  }

  /**
   * Add a provider to the plugin
   */
  provider(provider: Provider): this {
    this.providers.push(provider);
    if (!this.manifest.provides!.providers) {
      this.manifest.provides!.providers = [];
    }
    this.manifest.provides!.providers.push({
      id: provider.id,
      name: provider.name,
      type: provider.type,
    });
    return this;
  }

  /**
   * Add a tool to the plugin
   */
  tool(tool: Tool): this {
    this.tools.push(tool);
    if (!this.manifest.provides!.tools) {
      this.manifest.provides!.tools = [];
    }
    this.manifest.provides!.tools.push({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as Record<string, unknown>,
      permissionMode: 'auto',
    });
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
   * Set health check function
   */
  onHealth(fn: () => Promise<{ healthy: boolean; message?: string }>): this {
    this.healthFn = fn;
    return this;
  }

  /**
   * Set plugin author
   */
  author(author: string): this {
    this.manifest.author = author;
    return this;
  }

  /**
   * Set plugin homepage
   */
  homepage(url: string): this {
    this.manifest.homepage = url;
    return this;
  }

  /**
   * Set plugin license
   */
  license(license: string): this {
    this.manifest.license = license;
    return this;
  }

  /**
   * Build the plugin
   */
  build(): Plugin {
    const providers = this.providers;
    const tools = this.tools;
    const initFn = this.initFn;
    const shutdownFn = this.shutdownFn;
    const healthFn = this.healthFn;

    return {
      manifest: this.manifest as PluginManifest,

      async initialize(context: PluginContext): Promise<void> {
        // Register providers
        for (const provider of providers) {
          context.registerProvider(provider);
        }

        // Register tools
        for (const tool of tools) {
          context.registerTool(tool);
        }

        // Call custom init function
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
        if (healthFn) {
          return await healthFn();
        }
        return { healthy: true };
      },
    };
  }
}

/**
 * Create a new plugin builder
 */
export function createPlugin(
  name: string,
  version: string,
  description: string
): PluginBuilder {
  return new PluginBuilder(name, version, description);
}

/**
 * Quick provider plugin creation
 */
export function createProviderPlugin(
  provider: Provider,
  options?: {
    version?: string;
    description?: string;
    author?: string;
  }
): Plugin {
  return createPlugin(
    `provider-${provider.id}`,
    options?.version ?? '1.0.0',
    options?.description ?? `${provider.name} provider`
  )
    .provider(provider)
    .author(options?.author ?? '')
    .build();
}

/**
 * Quick tool plugin creation
 */
export function createToolPlugin(
  tool: Tool,
  options?: {
    version?: string;
    description?: string;
    author?: string;
  }
): Plugin {
  return createPlugin(
    `tool-${tool.name.replace('.', '-')}`,
    options?.version ?? '1.0.0',
    options?.description ?? tool.description
  )
    .tool(tool)
    .author(options?.author ?? '')
    .build();
}
