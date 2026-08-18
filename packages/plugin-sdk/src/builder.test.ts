import { describe, it, expect } from 'vitest';
import { createPlugin, createProviderPlugin, createToolPlugin, PluginBuilder } from './builder.js';

describe('PluginBuilder', () => {
  it('should create a plugin with manifest', () => {
    const plugin = createPlugin('test-plugin', '1.0.0', 'Test plugin')
      .build();

    expect(plugin.manifest.name).toBe('test-plugin');
    expect(plugin.manifest.version).toBe('1.0.0');
    expect(plugin.manifest.description).toBe('Test plugin');
  });

  it('should add provider to manifest', () => {
    const mockProvider = {
      id: 'test-provider',
      name: 'Test Provider',
      type: 'api' as const,
      status: 'disconnected' as const,
      connect: async () => {},
      disconnect: async () => {},
      send: async () => ({} as any),
      stream: async function* () {},
      health: async () => ({ healthy: true }),
      getCapabilities: () => ({
        streaming: false,
        images: false,
        files: false,
        thinking: false,
        toolCalling: false,
        webSearch: false,
        markdown: false,
        codeGeneration: false,
        multiModal: false,
      }),
      cancel: () => {},
    };

    const plugin = createPlugin('test-plugin', '1.0.0', 'Test plugin')
      .provider(mockProvider)
      .build();

    expect(plugin.manifest.provides.providers).toHaveLength(1);
    expect(plugin.manifest.provides.providers![0].id).toBe('test-provider');
  });

  it('should set author and license', () => {
    const plugin = createPlugin('test-plugin', '1.0.0', 'Test plugin')
      .author('Test Author')
      .license('MIT')
      .build();

    expect(plugin.manifest.author).toBe('Test Author');
    expect(plugin.manifest.license).toBe('MIT');
  });

  it('should initialize with context', async () => {
    let initialized = false;

    const plugin = createPlugin('test-plugin', '1.0.0', 'Test plugin')
      .onInit(async () => {
        initialized = true;
      })
      .build();

    await plugin.initialize({
      eventBus: { on: () => () => {}, once: () => {}, emit: () => {} },
      registerProvider: () => {},
      registerTool: () => {},
      getConfig: () => undefined,
      setConfig: () => {},
      getLogger: () => ({
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      }),
      resolvePath: (...segments: string[]) => segments.join('/'),
    });

    expect(initialized).toBe(true);
  });
});

describe('createProviderPlugin', () => {
  it('should create provider plugin', () => {
    const mockProvider = {
      id: 'my-provider',
      name: 'My Provider',
      type: 'api' as const,
      status: 'disconnected' as const,
      connect: async () => {},
      disconnect: async () => {},
      send: async () => ({} as any),
      stream: async function* () {},
      health: async () => ({ healthy: true }),
      getCapabilities: () => ({
        streaming: false,
        images: false,
        files: false,
        thinking: false,
        toolCalling: false,
        webSearch: false,
        markdown: false,
        codeGeneration: false,
        multiModal: false,
      }),
      cancel: () => {},
    };

    const plugin = createProviderPlugin(mockProvider);

    expect(plugin.manifest.name).toBe('provider-my-provider');
    expect(plugin.manifest.provides.providers).toHaveLength(1);
  });
});
