import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Runtime } from './runtime.js';
import { EventBus } from '@bab/core';
import type { Tool, ToolContext, ToolScope, RuntimeConfig } from '@bab/protocol';

function createMockTool(name: string): Tool {
  return {
    name,
    description: `Mock tool ${name}`,
    parameters: { type: 'object', properties: {} },
    execute: vi.fn().mockResolvedValue({ success: true, output: 'ok' }),
  };
}

describe('Runtime', () => {
  let runtime: Runtime;
  let eventBus: EventBus;
  const defaultScope: ToolScope = {
    allowedPaths: ['/tmp', '/home'],
    allowedCommands: ['git status', 'git diff'],
    deniedCommands: ['rm -rf', 'sudo'],
    maxExecutionTime: 30000,
  };

  const defaultConfig: RuntimeConfig = {
    workingDirectory: '/tmp',
    permissions: {
      mode: 'scope',
      defaultScope,
      dangerousTools: ['dangerous.tool'],
    },
    audit: {
      enabled: true,
      maxEntries: 1000,
    },
  };

  beforeEach(() => {
    eventBus = new EventBus();
    runtime = new Runtime(eventBus, defaultConfig);
  });

  afterEach(async () => {
    if (runtime.isStarted()) {
      await runtime.stop();
    }
  });

  describe('Lifecycle', () => {
    it('should start runtime', async () => {
      expect(runtime.isStarted()).toBe(false);
      await runtime.start();
      expect(runtime.isStarted()).toBe(true);
    });

    it('should throw when starting twice', async () => {
      await runtime.start();
      await expect(runtime.start()).rejects.toThrow('already started');
    });

    it('should stop runtime', async () => {
      await runtime.start();
      await runtime.stop();
      expect(runtime.isStarted()).toBe(false);
    });

    it('should not throw when stopping non-started runtime', async () => {
      await expect(runtime.stop()).resolves.not.toThrow();
    });
  });

  describe('Tool Registration', () => {
    it('should register a tool', () => {
      const tool = createMockTool('fs.read');
      runtime.tools.register(tool);
      expect(runtime.tools.list()).toHaveLength(1);
    });

    it('should register multiple tools', () => {
      runtime.tools.register(createMockTool('fs.read'));
      runtime.tools.register(createMockTool('fs.write'));
      runtime.tools.register(createMockTool('git.status'));
      expect(runtime.tools.list()).toHaveLength(3);
    });

    it('should get tool descriptions', () => {
      runtime.tools.register(createMockTool('fs.read'));
      const descriptions = runtime.getToolDescriptions();
      expect(descriptions).toHaveLength(1);
      expect(descriptions[0].name).toBe('fs.read');
    });

    it('should get tool by name', () => {
      const tool = createMockTool('fs.read');
      runtime.tools.register(tool);
      expect(runtime.getTool('fs.read')).toBe(tool);
    });

    it('should return undefined for non-existent tool', () => {
      expect(runtime.getTool('nonexistent')).toBeUndefined();
    });
  });

  describe('Tool Execution', () => {
    it('should execute auto-approved tool', async () => {
      const tool = createMockTool('fs.read');
      runtime.tools.register(tool);

      await runtime.start();
      const result = await runtime.executeTool('fs.read', { path: '/tmp/test' }, 'session-1');

      expect(result.success).toBe(true);
      expect(tool.execute).toHaveBeenCalled();
    });

    it('should throw when executing before start', async () => {
      runtime.tools.register(createMockTool('fs.read'));

      await expect(
        runtime.executeTool('fs.read', { path: '/tmp/test' }, 'session-1')
      ).rejects.toThrow('not started');
    });

    it('should deny execution for dangerous tools', async () => {
      runtime.tools.register(createMockTool('dangerous.tool'));

      await runtime.start();
      const result = await runtime.executeTool('dangerous.tool', {}, 'session-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });

    it('should deny execution for confirm tools without permission', async () => {
      runtime.tools.register(createMockTool('fs.write'));

      await runtime.start();
      const result = await runtime.executeTool('fs.write', { path: '/tmp/test', content: 'data' }, 'session-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });

    it('should allow execution for confirm tools with permission', async () => {
      const tool = createMockTool('fs.write');
      runtime.tools.register(tool);
      runtime.grantPermission('fs.write', defaultScope, 'session-1');

      await runtime.start();
      const result = await runtime.executeTool('fs.write', { path: '/tmp/test', content: 'data' }, 'session-1');

      expect(result.success).toBe(true);
    });

    it('should deny execution for scope violation', async () => {
      runtime.tools.register(createMockTool('fs.read'));

      await runtime.start();
      const result = await runtime.executeTool('fs.read', { path: '/etc/passwd' }, 'session-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('scope_violation');
    });
  });

  describe('Permission Management', () => {
    it('should grant permission', () => {
      runtime.grantPermission('fs.write', defaultScope, 'session-1');
      const scope = runtime.permissions.getScope('fs.write', 'session-1');
      expect(scope).toEqual(defaultScope);
    });

    it('should revoke permission', () => {
      runtime.grantPermission('fs.write', defaultScope, 'session-1');
      runtime.revokePermission('fs.write', 'session-1');
      const scope = runtime.permissions.getScope('fs.write', 'session-1');
      expect(scope).toBeUndefined();
    });
  });

  describe('Audit Log', () => {
    it('should log audit entries on execution', async () => {
      runtime.tools.register(createMockTool('fs.read'));

      await runtime.start();
      await runtime.executeTool('fs.read', { path: '/tmp/test' }, 'session-1');

      const entries = runtime.getAuditLog('session-1');
      expect(entries).toHaveLength(1);
      expect(entries[0].toolName).toBe('fs.read');
      expect(entries[0].result).toBe('allowed');
    });

    it('should log denied executions', async () => {
      runtime.tools.register(createMockTool('fs.write'));

      await runtime.start();
      await runtime.executeTool('fs.write', { path: '/tmp/test', content: 'data' }, 'session-1');

      const entries = runtime.getAuditLog('session-1');
      expect(entries).toHaveLength(1);
      expect(entries[0].result).toBe('denied');
    });
  });

  describe('Events', () => {
    it('should emit tool events on execution', async () => {
      runtime.tools.register(createMockTool('fs.read'));

      const events: string[] = [];
      eventBus.on('tool.requested', () => events.push('requested'));
      eventBus.on('tool.executing', () => events.push('executing'));
      eventBus.on('tool.completed', () => events.push('completed'));

      await runtime.start();
      await runtime.executeTool('fs.read', { path: '/tmp/test' }, 'session-1');

      expect(events).toEqual(['requested', 'executing', 'completed']);
    });

    it('should emit permission events', async () => {
      runtime.tools.register(createMockTool('fs.read'));

      const events: string[] = [];
      eventBus.on('permission.requested', () => events.push('requested'));
      eventBus.on('permission.granted', () => events.push('granted'));

      await runtime.start();
      await runtime.executeTool('fs.read', { path: '/tmp/test' }, 'session-1');

      expect(events).toEqual(['requested', 'granted']);
    });
  });

  describe('Configuration', () => {
    it('should return config', () => {
      const config = runtime.getConfig();
      expect(config.workingDirectory).toBe('/tmp');
      expect(config.permissions.mode).toBe('scope');
    });

    it('should return default scope', () => {
      const scope = runtime.permissions.getDefaultScope();
      expect(scope).toEqual(defaultScope);
    });
  });
});
