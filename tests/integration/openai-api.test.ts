import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '@bab/api';
import { EventBus, Logger, SessionManager, ProviderManager } from '@bab/core';
import { Runtime } from '@bab/runtime';
import { PromptEngine } from '@bab/prompt-engine';
import { FsReadTool, FsWriteTool } from '@bab/tools-fs';
import { GitStatusTool, GitDiffTool } from '@bab/tools-git';
import type { Provider, ChatCompletionRequest, ChatCompletionResponse, HealthCheckResult } from '@bab/protocol';
import * as path from 'path';

// Use project root as working directory
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * Mock Provider - simulates an AI provider for testing
 */
class MockProvider implements Provider {
  readonly id = 'mock-ai';
  readonly name = 'Mock AI';
  readonly type = 'api' as const;
  private _status: 'disconnected' | 'connected' | 'busy' | 'error' = 'disconnected';

  get status() {
    return this._status;
  }

  async connect(): Promise<void> {
    this._status = 'connected';
  }

  async disconnect(): Promise<void> {
    this._status = 'disconnected';
  }

  async send(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this._status = 'busy';
    await new Promise(resolve => setTimeout(resolve, 50));

    const userMessage = request.messages[request.messages.length - 1]?.content ?? '';

    if (userMessage.includes('read file') || userMessage.includes('прочитай файл')) {
      this._status = 'connected';
      return {
        id: `mock-${Date.now()}`,
        object: 'chat.completion',
        created: Date.now(),
        model: request.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: `call-${Date.now()}`,
              type: 'function',
              function: {
                name: 'fs.read',
                arguments: JSON.stringify({ path: 'package.json' }),
              },
            }],
          },
          finish_reason: 'tool_calls',
        }],
      };
    }

    if (userMessage.includes('results')) {
      this._status = 'connected';
      return {
        id: `mock-${Date.now()}`,
        object: 'chat.completion',
        created: Date.now(),
        model: request.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'Tool execution complete',
          },
          finish_reason: 'stop',
        }],
      };
    }

    if (userMessage.includes('git status') || userMessage.includes('гит статус')) {
      this._status = 'connected';
      return {
        id: `mock-${Date.now()}`,
        object: 'chat.completion',
        created: Date.now(),
        model: request.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: `call-${Date.now()}`,
              type: 'function',
              function: {
                name: 'git.status',
                arguments: JSON.stringify({}),
              },
            }],
          },
          finish_reason: 'tool_calls',
        }],
      };
    }

    this._status = 'connected';
    return {
      id: `mock-${Date.now()}`,
      object: 'chat.completion',
      created: Date.now(),
      model: request.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: `I received your message: "${userMessage}". How can I help you?`,
        },
        finish_reason: 'stop',
      }],
    };
  }

  async *stream(request: ChatCompletionRequest) {
    const response = await this.send(request);
    yield {
      id: response.id,
      object: 'chat.completion.chunk' as const,
      created: response.created,
      model: response.model,
      choices: [{
        index: 0,
        delta: response.choices[0].message,
        finish_reason: null,
      }],
    };
    yield {
      id: response.id,
      object: 'chat.completion.chunk' as const,
      created: response.created,
      model: response.model,
      choices: [{
        index: 0,
        delta: {},
        finish_reason: 'stop' as const,
      }],
    };
  }

  async health(): Promise<HealthCheckResult> {
    return {
      healthy: this._status === 'connected',
      details: { status: this._status },
    };
  }

  getTools() {
    return [
      { name: 'fs.read', description: 'Read file contents', parameters: { type: 'object', properties: { path: { type: 'string' } } } },
      { name: 'git.status', description: 'Get git status', parameters: { type: 'object', properties: {} } },
    ];
  }

  cancel(): void {}
}

describe('Stage 6: OpenAI API Integration Tests', () => {
  let app: ReturnType<typeof createServer>;
  let eventBus: EventBus;
  let providerManager: ProviderManager;
  let sessionManager: SessionManager;
  let runtime: Runtime;
  let promptEngine: PromptEngine;
  let mockProvider: MockProvider;

  beforeAll(async () => {
    eventBus = new EventBus();
    const logger = new Logger({ level: 'error', format: 'text', context: 'Test' });
    providerManager = new ProviderManager(eventBus);
    sessionManager = new SessionManager(eventBus);
    promptEngine = new PromptEngine();

    // Initialize Runtime with correct paths
    runtime = new Runtime(eventBus, {
      workingDirectory: PROJECT_ROOT,
      permissions: {
        mode: 'scope',
        defaultScope: {
          allowedPaths: [PROJECT_ROOT, '/tmp'],
          allowedCommands: ['git status', 'git diff', 'git log', 'ls', 'dir'],
          deniedCommands: ['rm -rf', 'sudo', 'format'],
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

    // Create and register mock provider
    mockProvider = new MockProvider();
    await mockProvider.connect();
    providerManager.register(mockProvider);

    // Create API server
    app = createServer({
      providerManager,
      sessionManager,
      logger,
      promptEngine,
      runtime,
    });
  });

  afterAll(async () => {
    await runtime.stop();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBeDefined();
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('Models Endpoint', () => {
    it('should list models at /models', async () => {
      const res = await app.request('/models');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.object).toBe('list');
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe('mock-ai');
    });

    it('should list models at /v1/models', async () => {
      const res = await app.request('/v1/models');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toHaveLength(1);
    });
  });

  describe('Tools & Metrics Endpoints', () => {
    it('should list runtime tools with real permission modes', async () => {
      const res = await app.request('/v1/tools');
      expect(res.status).toBe(200);

      const tools = await res.json();
      expect(Array.isArray(tools)).toBe(true);

      const byName = new Map(tools.map((t: { name: string; permission?: string }) => [t.name, t.permission]));
      expect(byName.get('fs.read')).toBe('auto');
      expect(byName.get('fs.write')).toBe('confirm');
      expect(byName.get('git.status')).toBe('auto');
    });

    it('should expose JSON metrics', async () => {
      const res = await app.request('/v1/metrics');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(typeof body.requestsTotal).toBe('number');
      expect(body.requestsTotal).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Chat Completions', () => {
    it('should handle simple chat request', async () => {
      const res = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mock-ai',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.object).toBe('chat.completion');
      expect(body.choices).toHaveLength(1);
      expect(body.choices[0].message.role).toBe('assistant');
      expect(body.choices[0].message.content).toContain('Hello');
    });

    it('should return 400 for missing messages', async () => {
      const res = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'mock-ai' }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing model', async () => {
      const res = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid JSON', async () => {
      const res = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      expect(res.status).toBe(400);
    });
  });

  describe('Tool Calls via API', () => {
    it('should execute fs.read tool calls and return the final answer', async () => {
      const res = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mock-ai',
          messages: [{ role: 'user', content: 'read file package.json' }],
        }),
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.choices[0].finish_reason).toBe('stop');
      expect(body.choices[0].message.content).toBe('Tool execution complete');
    });

    it('should execute git status tool calls', async () => {
      const res = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mock-ai',
          messages: [{ role: 'user', content: 'git status' }],
        }),
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.choices[0].finish_reason).toBe('stop');
      expect(body.choices[0].message.content).toBe('Tool execution complete');
    });
  });

  describe('Streaming Tool Calls', () => {
    it('should run the tool loop and stream the final answer', async () => {
      const res = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mock-ai',
          messages: [{ role: 'user', content: 'read file package.json' }],
          stream: true,
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');

      const text = await res.text();
      expect(text).toContain('data: ');
      expect(text).toContain('Tool execution complete');
      expect(text.trim().endsWith('data: [DONE]')).toBe(true);
    });
  });

  describe('Permissions Endpoints', () => {
    it('should list pending permissions (empty when non-interactive)', async () => {
      const res = await app.request('/v1/permissions/pending');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.object).toBe('list');
      expect(body.data).toEqual([]);
    });

    it('should return 404 when approving an unknown request', async () => {
      const res = await app.request('/v1/permissions/missing/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(404);
    });

    it('should return 404 when denying an unknown request', async () => {
      const res = await app.request('/v1/permissions/missing/deny', {
        method: 'POST',
      });
      expect(res.status).toBe(404);
    });
  });

  describe('Responses Endpoint', () => {
    it('should handle responses request', async () => {
      const res = await app.request('/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mock-ai',
          input: [{ role: 'user', content: 'Hello' }],
        }),
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.object).toBe('response');
      expect(body.output).toHaveLength(1);
      expect(body.output[0].type).toBe('message');
    });

    it('should return 400 for missing input', async () => {
      const res = await app.request('/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'mock-ai' }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('Sessions', () => {
    it('should list sessions', async () => {
      const res = await app.request('/v1/sessions');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.object).toBe('list');
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should create a session', async () => {
      const res = await app.request('/v1/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: 'mock-ai',
          model: 'mock-model',
        }),
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.id).toBeDefined();
      expect(body.providerId).toBe('mock-ai');
    });
  });

  describe('Session History & Export', () => {
    it('should include messages in session detail', async () => {
      const created = await app.request('/v1/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: 'mock-ai', model: 'mock-model' }),
      });
      const session = await created.json();

      const res = await app.request(`/v1/sessions/${session.id}`);
      expect(res.status).toBe(200);
      const detail = await res.json();
      expect(Array.isArray(detail.messages)).toBe(true);
    });

    it('should return the session id for continuation', async () => {
      const res = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mock-ai',
          messages: [{ role: 'user', content: 'first message' }],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(typeof body.session_id).toBe('string');
      expect(res.headers.get('X-Session-Id')).toBe(body.session_id);
    });

    it('should continue an existing session via session_id', async () => {
      const created = await app.request('/v1/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: 'mock-ai', model: 'mock-model' }),
      });
      const sessionId = (await created.json()).id;

      const first = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mock-ai',
          session_id: sessionId,
          messages: [{ role: 'user', content: 'session A' }],
        }),
      });
      expect(first.status).toBe(200);
      expect((await first.json()).session_id).toBe(sessionId);

      const second = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mock-ai',
          session_id: sessionId,
          messages: [{ role: 'user', content: 'session B' }],
        }),
      });
      expect(second.status).toBe(200);
      expect((await second.json()).session_id).toBe(sessionId);

      const detail = await (await app.request(`/v1/sessions/${sessionId}`)).json();
      const contents = detail.messages
        .map((m: { content: string | null }) => m.content)
        .filter((c: string | null): c is string => typeof c === 'string');
      expect(contents.some((c) => c.includes('session A'))).toBe(true);
      expect(contents.some((c) => c.includes('session B'))).toBe(true);
    });

    it('should return 404 when continuing an unknown session', async () => {
      const res = await app.request('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mock-ai',
          session_id: 'does-not-exist',
          messages: [{ role: 'user', content: 'hi' }],
        }),
      });
      expect(res.status).toBe(404);
    });

    it('should export a session as markdown', async () => {
      const created = await app.request('/v1/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: 'mock-ai', model: 'mock-model' }),
      });
      const session = await created.json();

      const res = await app.request(`/v1/sessions/${session.id}/export?format=markdown`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/markdown');
      expect(res.headers.get('content-disposition')).toContain('attachment');

      const text = await res.text();
      expect(text).toContain('# Session');
      expect(text).toContain('mock-ai');
    });

    it('should export a session as JSON', async () => {
      const created = await app.request('/v1/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: 'mock-ai', model: 'mock-model' }),
      });
      const session = await created.json();

      const res = await app.request(`/v1/sessions/${session.id}/export?format=json`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');

      const parsed = JSON.parse(await res.text());
      expect(parsed.id).toBe(session.id);
      expect(Array.isArray(parsed.messages)).toBe(true);
    });

    it('should return 404 when exporting an unknown session', async () => {
      const res = await app.request('/v1/sessions/nope/export?format=markdown');
      expect(res.status).toBe(404);
    });
  });

  describe('Runtime - Auto-approve Tools', () => {
    it('should execute fs.read (auto-approve)', async () => {
      const result = await runtime.executeTool('fs.read', { path: 'package.json' }, 'test-auto');
      console.log('fs.read result:', JSON.stringify(result));
      expect(result.success).toBe(true);
      expect(result.output).toContain('browser-ai-bridge');
    });

    it('should execute git.status (auto-approve)', async () => {
      const result = await runtime.executeTool('git.status', {}, 'test-auto');
      expect(result.success).toBe(true);
    });

    it('should execute git.diff (auto-approve)', async () => {
      const result = await runtime.executeTool('git.diff', {}, 'test-auto');
      expect(result.success).toBe(true);
    });
  });

  describe('Runtime - Confirm Tools', () => {
    it('should deny fs.write without permission', async () => {
      const result = await runtime.executeTool('fs.write', { path: '/tmp/test', content: 'data' }, 'test-confirm');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });

    it('should allow fs.write with permission', async () => {
      runtime.grantPermission('fs.write', {
        allowedPaths: ['/tmp'],
        allowedCommands: [],
        deniedCommands: [],
        maxExecutionTime: 30000,
      }, 'test-confirm');

      const result = await runtime.executeTool('fs.write', { path: '/tmp/test-output.txt', content: 'test' }, 'test-confirm');
      expect(result.success).toBe(true);
    });
  });

  describe('Runtime - Deny Rules', () => {
    it('should deny sudo commands', async () => {
      runtime.grantPermission('shell.exec', {
        allowedPaths: [],
        allowedCommands: ['ls'],
        deniedCommands: ['sudo'],
        maxExecutionTime: 30000,
      }, 'test-deny');

      const result = await runtime.executeTool('shell.exec', { command: 'sudo ls' }, 'test-deny');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });

    it('should deny rm -rf commands', async () => {
      runtime.grantPermission('shell.exec', {
        allowedPaths: [],
        allowedCommands: ['ls'],
        deniedCommands: ['rm -rf'],
        maxExecutionTime: 30000,
      }, 'test-deny');

      const result = await runtime.executeTool('shell.exec', { command: 'rm -rf /' }, 'test-deny');
      expect(result.success).toBe(false);
    });
  });

  describe('Audit Log', () => {
    it('should log tool executions', () => {
      const entries = runtime.getAuditLog('test-auto');
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].toolName).toBeDefined();
      expect(entries[0].result).toBeDefined();
    });

    it('should log denied executions', () => {
      const entries = runtime.getAuditLog('test-confirm');
      const deniedEntries = entries.filter(e => e.result === 'denied');
      expect(deniedEntries.length).toBeGreaterThan(0);
    });
  });
});
