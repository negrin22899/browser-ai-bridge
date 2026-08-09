# Plugin SDK Guide

> Extend Browser AI Bridge with custom plugins.

## Overview

Plugins extend Browser AI Bridge with:
- **Providers** - Connect to AI services
- **Tools** - Interact with local environment
- **Extensions** - Add UI, middleware, hooks

## Plugin Structure

```
plugins/my-plugin/
├── package.json      # Plugin manifest
├── tsconfig.json
├── config.json       # Optional configuration
└── src/
    └── index.ts      # Plugin entry point
```

## Plugin Manifest

```json
{
  "name": "@bab/my-plugin",
  "version": "1.0.0",
  "description": "My awesome plugin",
  "bab": {
    "name": "my-plugin",
    "version": "1.0.0",
    "description": "My awesome plugin",
    "author": "Your Name",
    "provides": {
      "providers": [...],
      "tools": [...],
      "extensions": [...]
    },
    "dependencies": [],
    "engines": {
      "bab": ">=0.1.0"
    }
  }
}
```

## Plugin Interface

```typescript
interface Plugin {
  readonly manifest: PluginManifest;
  
  initialize(context: PluginContext): Promise<void>;
  shutdown(): Promise<void>;
  health?(): Promise<PluginHealth>;
}
```

## Plugin Context

The context provides access to Browser AI Bridge:

```typescript
interface PluginContext {
  // Event bus for communication
  eventBus: PluginEventBus;
  
  // Register providers
  registerProvider(provider: Provider): void;
  
  // Register tools
  registerTool(tool: Tool): void;
  
  // Configuration
  getConfig<T>(key: string): T | undefined;
  setConfig(key: string, value: unknown): void;
  
  // Logging
  getLogger(name: string): PluginLogger;
  
  // File paths
  resolvePath(...segments: string[]): string;
}
```

## Examples

### Provider Plugin

```typescript
import type { Plugin, PluginContext } from '@bab/plugin-sdk';
import { MyProvider } from './provider.js';

const plugin: Plugin = {
  manifest: {
    name: 'provider-myai',
    version: '1.0.0',
    description: 'My AI provider',
    provides: {
      providers: [{
        id: 'myai',
        name: 'My AI',
        type: 'api',
      }],
    },
  },

  async initialize(context: PluginContext): Promise<void> {
    const provider = new MyProvider();
    context.registerProvider(provider);
    context.getLogger('myai').info('Provider registered');
  },

  async shutdown(): Promise<void> {
    // Cleanup
  },
};

export default plugin;
```

### Tool Plugin

```typescript
import type { Plugin, PluginContext } from '@bab/plugin-sdk';
import { MyTool } from './tool.js';

const plugin: Plugin = {
  manifest: {
    name: 'tool-mytool',
    version: '1.0.0',
    description: 'My custom tool',
    provides: {
      tools: [{
        name: 'mytool.action',
        description: 'Does something useful',
        parameters: { type: 'object', properties: {} },
        permissionMode: 'auto',
      }],
    },
  },

  async initialize(context: PluginContext): Promise<void> {
    context.registerTool(new MyTool());
  },

  async shutdown(): Promise<void> {
    // Cleanup
  },
};

export default plugin;
```

### Multi-Provider Plugin

```typescript
const plugin: Plugin = {
  manifest: {
    name: 'providers-ai',
    version: '1.0.0',
    description: 'Multiple AI providers',
    provides: {
      providers: [
        { id: 'gemini', name: 'Gemini', type: 'browser' },
        { id: 'chatgpt', name: 'ChatGPT', type: 'browser' },
        { id: 'claude', name: 'Claude', type: 'browser' },
      ],
    },
  },

  async initialize(context: PluginContext): Promise<void> {
    context.registerProvider(new GeminiProvider());
    context.registerProvider(new ChatGPTProvider());
    context.registerProvider(new ClaudeProvider());
  },

  async shutdown(): Promise<void> {
    // Cleanup all providers
  },
};
```

## Events

Plugins can emit and listen to events:

```typescript
async initialize(context: PluginContext): Promise<void> {
  // Listen to events
  context.eventBus.on('provider.connected', (data) => {
    console.log('Provider connected:', data.providerId);
  });

  // Emit events
  context.eventBus.emit('myplugin.ready', { timestamp: Date.now() });
}
```

## Configuration

Plugins can store configuration:

```typescript
async initialize(context: PluginContext): Promise<void> {
  // Read config
  const apiKey = context.getConfig<string>('apiKey');
  
  // Write config
  context.setConfig('lastUsed', Date.now());
}
```

Config is stored in `plugins/my-plugin/config.json`.

## Logging

```typescript
async initialize(context: PluginContext): Promise<void> {
  const logger = context.getLogger('my-plugin');
  
  logger.debug('Debug message');
  logger.info('Info message');
  logger.warn('Warning message');
  logger.error('Error message', { error: 'details' });
}
```

## Health Check

```typescript
const plugin: Plugin = {
  manifest: { ... },

  async initialize(context: PluginContext): Promise<void> {
    // Setup
  },

  async shutdown(): Promise<void> {
    // Cleanup
  },

  async health() {
    // Check if plugin is healthy
    const connected = await checkConnection();
    return {
      healthy: connected,
      message: connected ? 'OK' : 'Disconnected',
    };
  },
};
```

## Plugin Builder (New!)

Use the fluent API to create plugins easily:

```typescript
import { createPlugin, createProviderPlugin, createToolPlugin } from '@bab/plugin-sdk';

// Using builder pattern
const myPlugin = createPlugin('my-plugin', '1.0.0', 'My awesome plugin')
  .provider(new MyProvider())
  .tool(new MyTool())
  .onInit(async (ctx) => {
    console.log('Plugin initialized!');
  })
  .onShutdown(async () => {
    console.log('Plugin shutting down');
  })
  .onHealth(async () => {
    return { healthy: true };
  })
  .build();

// Quick provider plugin
const providerPlugin = createProviderPlugin(new MyProvider(), {
  version: '1.0.0',
  author: 'Your Name',
});

// Quick tool plugin
const toolPlugin = createToolPlugin(new MyTool(), {
  version: '1.0.0',
  author: 'Your Name',
});
```

## Plugin Validation (New!)

Validate plugins before loading:

```typescript
import { validatePlugin, validateManifest, PluginValidator } from '@bab/plugin-sdk';

// Validate plugin instance
const result = validatePlugin(myPlugin);
console.log(result.valid); // true/false
console.log(result.errors); // ['...']
console.log(result.warnings); // ['...']

// Validate manifest
const manifestResult = validateManifest(myManifest);

// Print report
const validator = new PluginValidator();
validator.printReport(result, 'my-plugin');
```

## Hot-Reload (New!)

Plugins can be hot-reloaded without restarting:

```typescript
const loader = new PluginLoader(eventBus, {
  watch: true, // Enable file watching
});

// Start watching for changes
loader.startWatching();

// Manually reload a plugin
await loader.reload('my-plugin');

// Stop watching
loader.stopWatching();
```

## Best Practices

1. **Single responsibility**: One plugin = one feature
2. **Clean shutdown**: Always cleanup in `shutdown()`
3. **Error handling**: Don't throw, log errors
4. **Configuration**: Use `config.json` for settings
5. **Events**: Use event bus for loose coupling
6. **Health check**: Implement for monitoring
7. **Validation**: Use validator to check plugin structure
8. **Builder pattern**: Use `createPlugin()` for simpler code

## Publishing

1. Create plugin in `plugins/`
2. Implement Plugin interface
3. Add tests
4. Validate with `validatePlugin()`
5. Submit PR

## Examples

See:
- `plugins/provider-gemini/` - Browser provider example
- `plugins/provider-chatgpt/` - Browser provider example
- `plugins/provider-claude/` - Browser provider example
- `plugins/provider-deepseek/` - Browser provider example
- `examples/plugins/` - Simple tool example
