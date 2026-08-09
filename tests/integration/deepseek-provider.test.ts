import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '@bab/api';
import { EventBus, Logger, SessionManager, ProviderManager } from '@bab/core';
import { Runtime } from '@bab/runtime';
import { PromptEngine } from '@bab/prompt-engine';
import { FsReadTool, FsWriteTool } from '@bab/tools-fs';
import { GitStatusTool, GitDiffTool } from '@bab/tools-git';
import * as path from 'path';

// Import DeepSeek provider
import { DeepSeekProvider } from '../../plugins/provider-deepseek/src/deepseek-provider.js';

const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * Integration test: OpenCode → Bridge → DeepSeek Provider → Browser → Response
 *
 * This test verifies the full path without mocks.
 *
 * NOTE: This test requires:
 * 1. Chrome browser installed
 * 2. DeepSeek Chat account logged in
 * 3. Manual confirmation for tool calls
 */
describe('Integration: OpenCode → Bridge → DeepSeek → Response', () => {
  let app: ReturnType<typeof createServer>;
  let eventBus: EventBus;
  let providerManager: ProviderManager;
  let sessionManager: SessionManager;
  let runtime: Runtime;
  let promptEngine: PromptEngine;
  let deepseekProvider: DeepSeekProvider;

  beforeAll(async () => {
    // Skip if no Chrome available
    try {
      eventBus = new EventBus();
      const logger = new Logger({ level: 'info', format: 'text', context: 'Integration' });
      providerManager = new ProviderManager(eventBus);
      sessionManager = new SessionManager(eventBus);
      promptEngine = new PromptEngine();

      // Initialize Runtime
      runtime = new Runtime(eventBus, {
        workingDirectory: PROJECT_ROOT,
        permissions: {
          mode: 'scope',
          defaultScope: {
            allowedPaths: [PROJECT_ROOT, '/tmp'],
            allowedCommands: ['git status', 'git diff', 'git log'],
            deniedCommands: ['rm -rf', 'sudo'],
            maxExecutionTime: 30000,
          },
          dangerousTools: ['shell.exec'],
        },
        audit: {
          enabled: true,
          maxEntries: 1000,
        },
      });

      // Register tools
      runtime.tools.register(new FsReadTool());
      runtime.tools.register(new FsWriteTool());
      runtime.tools.register(new GitStatusTool());
      runtime.tools.register(new GitDiffTool());

      await runtime.start();

      // Create DeepSeek provider
      deepseekProvider = new DeepSeekProvider({
        useExistingProfile: true,
        headless: false,
      });

      deepseekProvider.setTools(runtime.getToolDescriptions());
      providerManager.register(deepseekProvider);

      // Create API server
      app = createServer({
        providerManager,
        sessionManager,
        logger,
        promptEngine,
      });
    } catch (error) {
      console.warn('Skipping DeepSeek integration test:', error);
    }
  });

  afterAll(async () => {
    await runtime.stop();
    if (deepseekProvider) {
      try {
        await deepseekProvider.disconnect();
      } catch {
        // Ignore
      }
    }
  });

  describe('Provider Connection', () => {
    it('should connect to DeepSeek', async () => {
      if (!deepseekProvider) return;

      await deepseekProvider.connect();
      expect(deepseekProvider.status).toBe('connected');
    }, 60000);

    it('should report healthy status', async () => {
      if (!deepseekProvider) return;

      const health = await deepseekProvider.health();
      expect(health.healthy).toBe(true);
    });

    it('should have correct capabilities', () => {
      if (!deepseekProvider) return;

      const capabilities = deepseekProvider.getCapabilities();
      expect(capabilities.streaming).toBe(true);
      expect(capabilities.markdown).toBe(true);
    });
  });

  describe('Full Request Path', () => {
    it('should send message through API and get response', async () => {
      if (!deepseekProvider) return;

      // Connect provider
      await deepseekProvider.connect();

      // Send request through API
      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek',
          messages: [{ role: 'user', content: 'Say "Hello World" and nothing else.' }],
        }),
      });

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.choices).toHaveLength(1);
      expect(body.choices[0].message.role).toBe('assistant');
      expect(body.choices[0].message.content).toBeTruthy();
    }, 120000);
  });

  describe('Error Handling', () => {
    it('should handle unauthorized user', async () => {
      if (!deepseekProvider) return;

      try {
        const provider = new DeepSeekProvider({
          useExistingProfile: false,
          headless: true,
        });

        await provider.connect();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
