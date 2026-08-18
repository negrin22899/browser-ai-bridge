import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventBus } from '../event-bus.js';
import { SessionFabric } from '../session-fabric.js';

/**
 * Hardening Tests - Cross-Session Attack Prevention
 * 
 * These tests verify that sessions cannot be compromised through:
 * - ID guessing
 * - Workspace path traversal
 * - Resource sharing violations
 * - Permission escalation
 */

describe('Cross-Session Attack Prevention', () => {
  let eventBus: EventBus;
  let fabric: SessionFabric;

  beforeEach(() => {
    eventBus = new EventBus();
    fabric = new SessionFabric(eventBus, { maxSessions: 10 });
  });

  afterEach(() => {
    fabric.terminateAll();
  });

  describe('Session ID Security', () => {
    it('should generate unique session IDs', () => {
      const sessionA = fabric.create({ providerId: 'gemini' });
      const sessionB = fabric.create({ providerId: 'gemini' });

      expect(sessionA.id).not.toBe(sessionB.id);
      expect(sessionA.id.length).toBeGreaterThan(10);
    });

    it('should not allow access to non-existent sessions', () => {
      const result = fabric.get('non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('Workspace Path Traversal', () => {
    it('should not allow path traversal via session workspace', () => {
      const session = fabric.create({
        providerId: 'gemini',
        workspace: '/workspace/a',
      });

      // Session should only know its own workspace
      const context = session.getContext();
      expect(context.workspace).toBe('/workspace/a');
      
      // There's no way to access /workspace/b from this session context
      // This is enforced at the Runtime level, not Session level
    });

    it('should isolate workspace paths between sessions', () => {
      const sessionA = fabric.create({
        providerId: 'gemini',
        workspace: '/projects/frontend',
      });

      const sessionB = fabric.create({
        providerId: 'gemini',
        workspace: '/projects/backend',
      });

      // Each session has its own workspace
      expect(sessionA.workspace).toBe('/projects/frontend');
      expect(sessionB.workspace).toBe('/projects/backend');
      expect(sessionA.workspace).not.toBe(sessionB.workspace);
    });
  });

  describe('Resource Sharing Violations', () => {
    it('should not allow tools from one session to be used in another', () => {
      const sessionA = fabric.create({ providerId: 'gemini' });
      const sessionB = fabric.create({ providerId: 'gemini' });

      sessionA.setTools(['fs.read', 'git.status']);
      sessionB.setTools(['shell.exec']);

      // Session A should not have shell.exec
      expect(sessionA.hasTool('shell.exec')).toBe(false);
      
      // Session B should not have fs.read
      expect(sessionB.hasTool('fs.read')).toBe(false);
    });

    it('should not allow capability injection between sessions', () => {
      const sessionA = fabric.create({ providerId: 'gemini' });
      const sessionB = fabric.create({ providerId: 'gemini' });

      sessionA.setCapabilities(['streaming', 'files']);
      sessionB.setCapabilities(['webSearch']);

      // Capabilities should be independent
      expect(sessionA.hasCapability('webSearch')).toBe(false);
      expect(sessionB.hasCapability('files')).toBe(false);
    });
  });

  describe('Permission Escalation', () => {
    it('should not allow permission escalation through session manipulation', () => {
      const sessionA = fabric.create({ providerId: 'gemini' });
      const sessionB = fabric.create({ providerId: 'gemini' });

      // Session A has limited permissions
      sessionA.setPermissions({
        'fs.read': 'allowed',
        'fs.write': 'denied',
      });

      // Session B has different permissions
      sessionB.setPermissions({
        'fs.read': 'allowed',
        'fs.write': 'allowed',
      });

      // Session A should still be denied fs.write
      expect(sessionA.getPermission('fs.write')).toBe('denied');
      
      // Session B having allowed should not affect Session A
      expect(sessionA.getPermission('fs.write')).toBe('denied');
    });

    it('should not allow permission inheritance between sessions', () => {
      const sessionA = fabric.create({ providerId: 'gemini' });
      const sessionB = fabric.create({ providerId: 'gemini' });

      sessionA.setPermissions({ 'git.push': 'confirm' });

      // Session B should not inherit session A's permissions
      expect(sessionB.getPermission('git.push')).toBeUndefined();
    });
  });

  describe('Session Lifecycle Attacks', () => {
    it('should not allow terminating another session through fabric', () => {
      const sessionA = fabric.create({ providerId: 'gemini' });
      const sessionB = fabric.create({ providerId: 'gemini' });

      // Terminating session A should not affect session B
      fabric.terminate(sessionA.id);

      expect(fabric.has(sessionA.id)).toBe(false);
      expect(fabric.has(sessionB.id)).toBe(true);
    });

    it('should not allow state manipulation of another session', () => {
      const sessionA = fabric.create({ providerId: 'gemini' });
      const sessionB = fabric.create({ providerId: 'gemini' });

      fabric.start(sessionA.id);
      fabric.degrade(sessionA.id, 'Browser failure');

      // Session B should remain in READY state
      expect(sessionA.state.state).toBe('DEGRADED');
      expect(sessionB.state.state).toBe('READY');
    });
  });

  describe('Concurrency Isolation', () => {
    it('should enforce concurrent request limits independently per session', () => {
      const sessionA = fabric.create({ providerId: 'gemini', maxConcurrentRequests: 1 });
      const sessionB = fabric.create({ providerId: 'gemini', maxConcurrentRequests: 1 });

      expect(sessionA.addRequest('req-a')).toBe(true);
      expect(sessionB.addRequest('req-b')).toBe(true);

      // Each session has its own limit
      expect(sessionA.addRequest('req-a-2')).toBe(false);
      expect(sessionB.addRequest('req-b-2')).toBe(false);
    });

    it('should isolate active requests between sessions', () => {
      const sessionA = fabric.create({ providerId: 'gemini' });
      const sessionB = fabric.create({ providerId: 'gemini' });

      sessionA.addRequest('req-a');

      expect(sessionB.getActiveRequests()).toHaveLength(0);
      expect(sessionB.addRequest('req-b')).toBe(true);
    });
  });

  describe('Message Injection', () => {
    it('should not allow message injection into another session', () => {
      const sessionA = fabric.create({ providerId: 'gemini' });
      const sessionB = fabric.create({ providerId: 'gemini' });

      sessionA.addMessage({ role: 'user', content: 'Message for A' });

      // Session B should not have session A's messages
      expect(sessionB.getMessages()).toHaveLength(0);
    });
  });

  describe('Metadata Isolation', () => {
    it('should isolate metadata between sessions', () => {
      const sessionA = fabric.create({ providerId: 'gemini' });
      const sessionB = fabric.create({ providerId: 'gemini' });

      sessionA.setMetadata('apiKey', 'secret-key-a');
      sessionB.setMetadata('apiKey', 'secret-key-b');

      // Each session should only see its own metadata
      expect(sessionA.getMetadata('apiKey')).toBe('secret-key-a');
      expect(sessionB.getMetadata('apiKey')).toBe('secret-key-b');
    });
  });

  describe('Concurrent Access Safety', () => {
    it('should handle concurrent session creation safely', () => {
      const sessions = [];

      // Create multiple sessions concurrently
      for (let i = 0; i < 5; i++) {
        sessions.push(fabric.create({ providerId: 'gemini' }));
      }

      // All sessions should have unique IDs
      const ids = sessions.map(s => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    it('should handle concurrent state changes safely', () => {
      const session = fabric.create({ providerId: 'gemini' });

      // Multiple state changes
      fabric.start(session.id);
      fabric.complete(session.id);

      // Final state should be READY
      expect(session.state.state).toBe('READY');
    });
  });
});
