import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolDispatcher } from './tool-dispatcher.js';
import { EventBus } from '@bab/core';
import type { Tool, ToolContext } from '@bab/protocol';

function createMockTool(name: string): Tool {
  return {
    name,
    description: `Mock tool ${name}`,
    parameters: { type: 'object', properties: {} },
    execute: vi.fn().mockResolvedValue({ success: true, output: 'ok' }),
  };
}

describe('ToolDispatcher', () => {
  let dispatcher: ToolDispatcher;
  let eventBus: EventBus;
  const context: ToolContext = {
    sessionId: 'test-session',
    workingDirectory: '/tmp',
    scope: {
      allowedPaths: ['/tmp'],
      allowedCommands: [],
      deniedCommands: [],
      maxExecutionTime: 30000,
    },
    env: {},
  };

  beforeEach(() => {
    eventBus = new EventBus();
    dispatcher = new ToolDispatcher(eventBus);
  });

  it('should register a tool', () => {
    const tool = createMockTool('fs.read');
    dispatcher.register(tool);
    expect(dispatcher.get('fs.read')).toBe(tool);
  });

  it('should list registered tools', () => {
    dispatcher.register(createMockTool('fs.read'));
    dispatcher.register(createMockTool('fs.write'));
    expect(dispatcher.list()).toHaveLength(2);
  });

  it('should get tool descriptions', () => {
    dispatcher.register(createMockTool('fs.read'));
    const defs = dispatcher.getDescriptions();
    expect(defs).toHaveLength(1);
    expect(defs[0].name).toBe('fs.read');
  });

  it('should execute a tool', async () => {
    const tool = createMockTool('fs.read');
    dispatcher.register(tool);

    const result = await dispatcher.execute('fs.read', { path: '/tmp/test' }, context);

    expect(tool.execute).toHaveBeenCalledWith({ path: '/tmp/test' }, context);
    expect(result.success).toBe(true);
  });

  it('should throw for unregistered tool', async () => {
    await expect(dispatcher.execute('unknown', {}, context))
      .rejects.toThrow('Tool "unknown" not found');
  });

  it('should emit tool events on execute', async () => {
    const tool = createMockTool('fs.read');
    dispatcher.register(tool);

    const events: string[] = [];
    eventBus.on('tool.requested', () => events.push('requested'));
    eventBus.on('tool.executing', () => events.push('executing'));
    eventBus.on('tool.completed', () => events.push('completed'));

    await dispatcher.execute('fs.read', { path: '/tmp' }, context);

    expect(events).toEqual(['requested', 'executing', 'completed']);
  });

  it('should emit error event on tool failure', async () => {
    const tool = createMockTool('fs.read');
    vi.mocked(tool.execute).mockRejectedValue(new Error('Permission denied'));
    dispatcher.register(tool);

    const errorHandler = vi.fn();
    eventBus.on('tool.error', errorHandler);

    await expect(dispatcher.execute('fs.read', {}, context))
      .rejects.toThrow('Permission denied');

    expect(errorHandler).toHaveBeenCalled();
  });
});
