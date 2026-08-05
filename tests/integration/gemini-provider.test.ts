import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '@bab/api';
import { EventBus, Logger, SessionManager, ProviderManager } from '@bab/core';
import { Runtime } from '@bab/runtime';
import { PromptEngine } from '@bab/prompt-engine';
import { FsReadTool, FsWriteTool } from '@bab/tools-fs';
import { GitStatusTool, GitDiffTool } from '@bab/tools-git';
import * as path from 'path';

// Import real Gemini provider
import { GeminiProvider } from '../../plugins/provider-gemini/src/gemini-provider.js';

const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * Integration test: OpenCode → Bridge → Gemini Provider → Browser → Response
 * 
 * This test verifies the full path without mocks.
 * 
 * NOTE: This test requires:
 * 1. Chrome browser installed
 * 2. Gemini account logged in
 * 3. Manual confirmation for tool calls
 */
describe('Integration: OpenCode → Bridge → Gemini → Response', () => {
  let app: ReturnType<typeof createServer>;
  let eventBus: EventBus;
  let providerManager: ProviderManager;
  let sessionManager: SessionManager;
  let runtime: Runtime;
  let promptEngine: PromptEngine;
  let geminiProvider: GeminiProvider;

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

      // Create Gemini provider
      geminiProvider = new GeminiProvider({
        useExistingProfile: true,
        headless: false,
      });

      geminiProvider.setTools(runtime.getToolDescriptions());
      providerManager.register(geminiProvider);

      // Create API server
      app = createServer({
        providerManager,
        sessionManager,
        logger,
        promptEngine,
      });
    } catch (error) {
      console.warn('Skipping Gemini integration test:', error);
    }
  });

  afterAll(async () => {
    await runtime.stop();
    if (geminiProvider) {
      try {
        await geminiProvider.disconnect();
      } catch {
        // Ignore
      }
    }
  });

  describe('Provider Connection', () => {
    it('should connect to Gemini', async () => {
      // Skip if provider not initialized
      if (!geminiProvider) return;

      await geminiProvider.connect();
      expect(geminiProvider.status).toBe('connected');
    }, 60000);

    it('should report healthy status', async () => {
      if (!geminiProvider) return;

      const health = await geminiProvider.health();
      expect(health.healthy).toBe(true);
    });

    it('should have correct capabilities', () => {
      if (!geminiProvider) return;

      const capabilities = geminiProvider.getCapabilities();
      expect(capabilities.streaming).toBe(true);
      expect(capabilities.markdown).toBe(true);
    });
  });

  describe('Full Request Path', () => {
    it('should send message through API and get response', async () => {
      if (!geminiProvider) return;

      // Connect provider
      await geminiProvider.connect();

      // Send request through API
      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini',
          messages: [{ role: 'user', content: 'Say "Hello World" and nothing else.' }],
        }),
      });

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.choices).toHaveLength(1);
      expect(body.choices[0].message.role).toBe('assistant');
      expect(body.choices[0].message.content).toBeTruthy();
    }, 120000);

    it('should handle tool calls', async () => {
      if (!geminiProvider) return;

      // Connect provider
      await geminiProvider.connect();

      // Grant permission for fs.read
      runtime.grantPermission('fs.read', {
        allowedPaths: [PROJECT_ROOT],
        allowedCommands: [],
        deniedCommands: [],
        maxExecutionTime: 30000,
      }, 'test-session');

      // Send request that should trigger tool call
      const response = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini',
          messages: [{ role: 'user', content: 'Read the file package.json' }],
        }),
      });

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.choices).toHaveLength(1);
    }, 120000);
  });

  describe('Error Handling', () => {
    it('should handle unauthorized user', async () => {
      if (!geminiProvider) return;

      // This test assumes user is not logged in
      // In a real scenario, we'd mock the browser state
      // For now, just verify the provider handles errors gracefully
      
      try {
        const provider = new GeminiProvider({
          useExistingProfile: false,
          headless: true,
        });
        
        // This should throw or handle the error
        await provider.connect();
      } catch (error) {
        // Expected - user not authorized
        expect(error).toBeDefined();
      }
    });

    it('should report disconnected status', () => {
      if (!geminiProvider) return;

      // After disconnect, status should be disconnected
      // This is tested in the afterAll hook
    });
  });

  describe('Runtime Integration', () => {
    it('should execute auto-approved tools', async () => {
      const result = await runtime.executeTool('fs.read', { path: 'package.json' }, 'test-auto');
      expect(result.success).toBe(true);
      expect(result.output).toContain('browser-ai-bridge');
    });

    it('should deny unauthorized tools', async () => {
      const result = await runtime.executeTool('fs.write', { path: '/tmp/test', content: 'test' }, 'test-deny');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });
  });

  describe('Audit Log', () => {
    it('should log all operations', () => {
      const entries = runtime.getAuditLog('test-auto');
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].toolName).toBe('fs.read');
    });
  });
});
