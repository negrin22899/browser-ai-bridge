import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionManager } from './session-manager.js';
import { EventBus } from './event-bus.js';

describe('SessionManager', () => {
  let manager: SessionManager;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    manager = new SessionManager(eventBus);
  });

  it('should create a session with unique id', () => {
    const session = manager.create('gemini');
    expect(session.id).toBeDefined();
    expect(session.providerId).toBe('gemini');
    expect(session.messageCount).toBe(0);
  });

  it('should emit session.created event', () => {
    const handler = vi.fn();
    eventBus.on('session.created', handler);

    const session = manager.create('gemini');

    expect(handler).toHaveBeenCalledWith({ sessionId: session.id });
  });

  it('should get session by id', () => {
    const session = manager.create('gemini');
    const retrieved = manager.get(session.id);

    expect(retrieved).toBe(session);
  });

  it('should return undefined for non-existent session', () => {
    expect(manager.get('non-existent')).toBeUndefined();
  });

  it('should list all sessions', () => {
    manager.create('gemini');
    manager.create('chatgpt');

    expect(manager.list()).toHaveLength(2);
  });

  it('should add message to session', () => {
    const session = manager.create('gemini');

    session.addMessage({
      role: 'user',
      content: 'Hello',
    });

    expect(session.getMessages()).toHaveLength(1);
    expect(session.getMessages()[0].content).toBe('Hello');
  });

  it('should close session and emit event', () => {
    const handler = vi.fn();
    eventBus.on('session.closed', handler);

    const session = manager.create('gemini');
    manager.close(session.id);

    expect(handler).toHaveBeenCalledWith({ sessionId: session.id });
    expect(manager.get(session.id)).toBeUndefined();
  });

  it('should get and set active session', () => {
    const session1 = manager.create('gemini');
    const session2 = manager.create('chatgpt');

    expect(manager.getActiveId()).toBe(session1.id);

    manager.setActive(session2.id);
    expect(manager.getActiveId()).toBe(session2.id);
    expect(manager.getActive()).toBe(session2);
  });

  it('should get sessions by provider', () => {
    manager.create('gemini');
    manager.create('gemini');
    manager.create('chatgpt');

    const geminiSessions = manager.getByProvider('gemini');
    expect(geminiSessions).toHaveLength(2);
  });

  it('should close all sessions', () => {
    manager.create('gemini');
    manager.create('chatgpt');

    manager.closeAll();

    expect(manager.count()).toBe(0);
    expect(manager.getActiveId()).toBeNull();
  });
});
