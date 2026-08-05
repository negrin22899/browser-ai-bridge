import { describe, it, expect, vi } from 'vitest';
import { EventBus } from './event-bus.js';

describe('EventBus', () => {
  it('should call handler when event is emitted', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('session.created', handler);
    bus.emit('session.created', { sessionId: 'test-123' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ sessionId: 'test-123' });
  });

  it('should support multiple handlers for same event', () => {
    const bus = new EventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.on('session.created', handler1);
    bus.on('session.created', handler2);
    bus.emit('session.created', { sessionId: 'test-123' });

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
  });

  it('should unsubscribe handler when off() is called', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('session.created', handler);
    bus.off('session.created', handler);
    bus.emit('session.created', { sessionId: 'test-123' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should unsubscribe handler returned by on()', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    const unsubscribe = bus.on('session.created', handler);
    unsubscribe();
    bus.emit('session.created', { sessionId: 'test-123' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should call once handler only one time', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.once('session.created', handler);
    bus.emit('session.created', { sessionId: 'test-1' });
    bus.emit('session.created', { sessionId: 'test-2' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ sessionId: 'test-1' });
  });

  it('should handle async handlers', async () => {
    const bus = new EventBus();
    const results: string[] = [];

    bus.on('session.created', async (data) => {
      await new Promise((r) => setTimeout(r, 10));
      results.push(data.sessionId);
    });

    await bus.emitAsync('session.created', { sessionId: 'test-123' });

    expect(results).toEqual(['test-123']);
  });

  it('should not throw if no handlers registered', () => {
    const bus = new EventBus();

    expect(() => {
      bus.emit('session.created', { sessionId: 'test-123' });
    }).not.toThrow();
  });

  it('should remove all handlers when removeAllListeners is called', () => {
    const bus = new EventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.on('session.created', handler1);
    bus.on('tool.completed', handler2);
    bus.removeAllListeners();

    bus.emit('session.created', { sessionId: 'test-123' });
    bus.emit('tool.completed', { toolName: 'fs', result: {}, sessionId: 'test-123' });

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });
});
