import type { Provider, Tool, ToolDescription } from '@bab/protocol';

/**
 * Plugin manifest - describes a plugin
 */
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  homepage?: string;
  license?: string;
  
  // What this plugin provides
  provides: {
    providers?: ProviderDescriptor[];
    tools?: ToolDescriptor[];
    extensions?: ExtensionDescriptor[];
  };
  
  // Dependencies on other plugins
  dependencies?: string[];
  
  // Minimum BAB version required
  engines?: {
    bab?: string;
    node?: string;
  };
}

export interface ProviderDescriptor {
  id: string;
  name: string;
  type: 'browser' | 'api' | 'local';
  capabilities?: string[];
  config?: Record<string, unknown>;
}

export interface ToolDescriptor {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  permissionMode: 'auto' | 'confirm' | 'deny';
}

export interface ExtensionDescriptor {
  id: string;
  name: string;
  type: 'ui' | 'middleware' | 'hook';
}

/**
 * Plugin instance - created from manifest
 */
export interface Plugin {
  readonly manifest: PluginManifest;
  
  /** Called when plugin is loaded */
  initialize(context: PluginContext): Promise<void>;
  
  /** Called when plugin is unloaded */
  shutdown(): Promise<void>;
  
  /** Called to get health status */
  health?(): Promise<PluginHealth>;
}

export interface PluginHealth {
  healthy: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Context provided to plugins
 */
export interface PluginContext {
  /** Event bus for communication */
  eventBus: PluginEventBus;
  
  /** Register a provider */
  registerProvider(provider: Provider): void;
  
  /** Register a tool */
  registerTool(tool: Tool): void;
  
  /** Get configuration */
  getConfig<T>(key: string): T | undefined;
  
  /** Set configuration */
  setConfig(key: string, value: unknown): void;
  
  /** Get logger */
  getLogger(name: string): PluginLogger;
  
  /** Resolve a path relative to plugin */
  resolvePath(...segments: string[]): string;
}

export interface PluginEventBus {
  on(event: string, handler: (...args: any[]) => void): () => void;
  once(event: string, handler: (...args: any[]) => void): void;
  emit(event: string, data: unknown): void;
}

export interface PluginLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

/**
 * Plugin loader configuration
 */
export interface PluginLoaderConfig {
  /** Directories to search for plugins */
  directories: string[];
  
  /** Auto-load plugins on startup */
  autoLoad: boolean;
  
  /** Watch for plugin changes */
  watch: boolean;
  
  /** Disabled plugin names */
  disabled: string[];
}

/**
 * Plugin registry entry
 */
export interface PluginRegistryEntry {
  manifest: PluginManifest;
  path: string;
  enabled: boolean;
  loaded: boolean;
  instance?: Plugin;
  error?: string;
}
