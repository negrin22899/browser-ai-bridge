import type { Plugin, PluginContext } from '@bab/plugin-sdk';
import { GeminiProvider } from './gemini-provider.js';
import type { BrowserManagerOptions } from './browser-manager.js';

export interface GeminiPluginOptions extends BrowserManagerOptions {
  /** Plugin name */
  name?: string;
}

/**
 * Gemini Provider Plugin
 * 
 * Real implementation using Playwright to automate Gemini browser interface.
 * Connects to existing Chrome profile when possible.
 */
const geminiPlugin: Plugin = {
  manifest: {
    name: 'provider-gemini',
    version: '0.2.0',
    description: 'Google Gemini AI provider via browser automation',
    author: 'BAB Team',
    provides: {
      providers: [{
        id: 'gemini',
        name: 'Google Gemini',
        type: 'browser',
        capabilities: [
          'streaming',
          'images',
          'files',
          'thinking',
          'webSearch',
          'markdown',
          'codeGeneration',
          'multiModal',
        ],
      }],
    },
  },

  async initialize(context: PluginContext): Promise<void> {
    // Get config if available
    const options = context.getConfig<GeminiPluginOptions>('options') ?? {};

    const provider = new GeminiProvider(options);
    context.registerProvider(provider);

    context.getLogger('gemini').info('Gemini provider registered', {
      useExistingProfile: options.useExistingProfile ?? true,
    });
  },

  async shutdown(): Promise<void> {
    // Cleanup handled by provider
  },

  async health() {
    return { healthy: true };
  },
};

export default geminiPlugin;
export { GeminiProvider } from './gemini-provider.js';
export { BrowserManager } from './browser-manager.js';
export type { BrowserManagerOptions } from './browser-manager.js';
