import type {
  Plugin,
  PluginManifest,
  PluginContext,
  PluginLoaderConfig,
  PluginRegistryEntry,
  PluginEventBus,
  PluginLogger,
} from './types.js';
import { EventBus } from '@bab/core';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Plugin Loader - discovers, loads, and manages plugins
 */
export class PluginLoader {
  private registry = new Map<string, PluginRegistryEntry>();
  private config: PluginLoaderConfig;
  private eventBus: EventBus;
  private pluginContexts = new Map<string, PluginContext>();

  constructor(eventBus: EventBus, config?: Partial<PluginLoaderConfig>) {
    this.eventBus = eventBus;
    this.config = {
      directories: config?.directories ?? ['./plugins', '~/.bab/plugins'],
      autoLoad: config?.autoLoad ?? true,
      watch: config?.watch ?? false,
      disabled: config?.disabled ?? [],
    };
  }

  /**
   * Discover plugins in configured directories
   */
  async discover(): Promise<PluginManifest[]> {
    const manifests: PluginManifest[] = [];

    for (const dir of this.config.directories) {
      const resolvedDir = path.resolve(dir);
      if (!fs.existsSync(resolvedDir)) continue;

      const entries = fs.readdirSync(resolvedDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const pluginDir = path.join(resolvedDir, entry.name);
        const manifestPath = path.join(pluginDir, 'package.json');

        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            if (manifest.bab) {
              manifests.push({
                ...manifest.bab,
                name: manifest.name,
                version: manifest.version,
                description: manifest.description,
              });

              this.registry.set(manifest.name, {
                manifest: { ...manifest.bab, name: manifest.name },
                path: pluginDir,
                enabled: !this.config.disabled.includes(manifest.name),
                loaded: false,
              });
            }
          } catch (error) {
            console.error(`Failed to load manifest from ${manifestPath}:`, error);
          }
        }
      }
    }

    return manifests;
  }

  /**
   * Load a specific plugin
   */
  async load(pluginName: string): Promise<void> {
    const entry = this.registry.get(pluginName);
    if (!entry) {
      throw new Error(`Plugin "${pluginName}" not found in registry`);
    }

    if (!entry.enabled) {
      throw new Error(`Plugin "${pluginName}" is disabled`);
    }

    if (entry.loaded) {
      return; // Already loaded
    }

    try {
      // Load plugin module
      const pluginPath = path.join(entry.path, 'dist', 'index.js');
      const module = await import(pluginPath);
      const plugin: Plugin = module.default ?? module;

      // Create context for this plugin
      const context = this.createContext(entry);
      this.pluginContexts.set(pluginName, context);

      // Initialize plugin
      await plugin.initialize(context);

      // Update registry
      entry.instance = plugin;
      entry.loaded = true;
      entry.error = undefined;

      this.eventBus.emit('plugin.loaded', { name: pluginName });
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error);
      this.eventBus.emit('plugin.error', { name: pluginName, error: entry.error });
      throw error;
    }
  }

  /**
   * Unload a specific plugin
   */
  async unload(pluginName: string): Promise<void> {
    const entry = this.registry.get(pluginName);
    if (!entry?.loaded || !entry.instance) {
      return;
    }

    try {
      await entry.instance.shutdown();
      entry.loaded = false;
      entry.instance = undefined;
      this.pluginContexts.delete(pluginName);

      this.eventBus.emit('plugin.unloaded', { name: pluginName });
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * Load all discovered plugins
   */
  async loadAll(): Promise<void> {
    for (const [name, entry] of this.registry) {
      if (entry.enabled && !entry.loaded) {
        try {
          await this.load(name);
        } catch (error) {
          console.error(`Failed to load plugin "${name}":`, error);
        }
      }
    }
  }

  /**
   * Unload all plugins
   */
  async unloadAll(): Promise<void> {
    for (const name of this.registry.keys()) {
      await this.unload(name);
    }
  }

  /**
   * Enable a plugin
   */
  enable(pluginName: string): void {
    const entry = this.registry.get(pluginName);
    if (entry) {
      entry.enabled = true;
    }
  }

  /**
   * Disable a plugin
   */
  disable(pluginName: string): void {
    const entry = this.registry.get(pluginName);
    if (entry) {
      entry.enabled = false;
    }
  }

  /**
   * Get all registered plugins
   */
  list(): PluginRegistryEntry[] {
    return Array.from(this.registry.values());
  }

  /**
   * Get a specific plugin entry
   */
  get(pluginName: string): PluginRegistryEntry | undefined {
    return this.registry.get(pluginName);
  }

  /**
   * Check health of all loaded plugins
   */
  async healthCheck(): Promise<Map<string, { healthy: boolean; message?: string }>> {
    const results = new Map<string, { healthy: boolean; message?: string }>();

    for (const [name, entry] of this.registry) {
      if (entry.loaded && entry.instance?.health) {
        try {
          const health = await entry.instance.health();
          results.set(name, health);
        } catch (error) {
          results.set(name, {
            healthy: false,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return results;
  }

  /**
   * Create context for a plugin
   */
  private createContext(entry: PluginRegistryEntry): PluginContext {
    const pluginEventBus: PluginEventBus = {
      on: (event, handler) => this.eventBus.on(event as any, handler),
      once: (event, handler) => this.eventBus.once(event as any, handler),
      emit: (event, data) => this.eventBus.emit(event as any, data),
    };

    return {
      eventBus: pluginEventBus,
      registerProvider: (provider) => {
        this.eventBus.emit('provider.register', { provider, plugin: entry.manifest.name });
      },
      registerTool: (tool) => {
        this.eventBus.emit('tool.register', { tool, plugin: entry.manifest.name });
      },
      getConfig: (key) => {
        // Load from plugin config file
        const configPath = path.join(entry.path, 'config.json');
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          return config[key];
        }
        return undefined;
      },
      setConfig: (key, value) => {
        const configPath = path.join(entry.path, 'config.json');
        let config: Record<string, unknown> = {};
        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
        config[key] = value;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      },
      getLogger: (name) => this.createLogger(entry.manifest.name, name),
      resolvePath: (...segments) => path.join(entry.path, ...segments),
    };
  }

  /**
   * Create a logger for a plugin
   */
  private createLogger(pluginName: string, loggerName: string): PluginLogger {
    const prefix = `[${pluginName}:${loggerName}]`;
    return {
      debug: (msg, data) => console.debug(prefix, msg, data),
      info: (msg, data) => console.info(prefix, msg, data),
      warn: (msg, data) => console.warn(prefix, msg, data),
      error: (msg, data) => console.error(prefix, msg, data),
    };
  }
}
