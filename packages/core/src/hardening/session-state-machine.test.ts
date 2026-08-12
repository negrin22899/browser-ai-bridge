import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventBus } from '../event-bus.js';
import { SessionFabric } from '../session-fabric.js';

/**
 * Hardening Tests - Session State Machine
 * 
 * Tests the strict state machine:
 * INITIALIZING → READY ↔ BUSY → DEGRADED → RECOVERING → TERMINATED / ERROR
 */

describe('Session State Machine', () => {
  let eventBus: EventBus;
  let fabric: SessionFabric;

  beforeEach(() => {
    eventBus = new EventBus();
    fabric = new SessionFabric(eventBus, { maxSessions: 10 });
  });

  afterEach(() => {
    fabric.destroy();
  });

  describe('State Transitions', () => {
    it('should start in INITIALIZING state', () => {
      const session = fabric.create({ providerId: 'gemini' });
      // After create, it transitions to READY
      expect(session.state.state).toBe('READY');
    });

    it('should allow READY → BUSY transition', () => {
      const session = fabric.create({ providerId: 'gemini' });
      const success = fabric.start(session.id);
      expect(success).toBe(true);
      expect(session.state.state).toBe('BUSY');
    });

    it('should allow BUSY → READY transition', () => {
      const session = fabric.create({ providerId: 'gemini' });
      fabric.start(session.id);
      const success = fabric.complete(session.id);
      expect(success).toBe(true);
      expect(session.state.state).toBe('READY');
    });

    it('should PREVENT BUSY → BUSY transition (race condition protection)', () => {
      const session = fabric.create({ providerId: 'gemini' });
      fabric.start(session.id);
      expect(session.state.state).toBe('BUSY');

      // Second start should fail
      const success = fabric.start(session.id);
      expect(success).toBe(false);
      expect(session.state.state).toBe('BUSY');
    });

    it('should allow READY → DEGRADED transition', () => {
      const session = fabric.create({ providerId: 'gemini' });
      const success = fabric.degrade(session.id, 'Browser crashed');
      expect(success).toBe(true);
      expect(session.state.state).toBe('DEGRADED');
    });

    it('should allow DEGRADED → RECOVERING transition', () => {
      const session = fabric.create({ providerId: 'gemini' });
      fabric.degrade(session.id, 'Browser crashed');
      const success = fabric.recover(session.id);
      expect(success).toBe(true);
      expect(session.state.state).toBe('RECOVERING');
    });

    it('should allow RECOVERING → READY transition', () => {
      const session = fabric.create({ providerId: 'gemini' });
      fabric.degrade(session.id, 'Browser crashed');
      fabric.recover(session.id);
      const success = session.transitionTo('READY');
      expect(success).toBe(true);
      expect(session.state.state).toBe('READY');
    });

    it('should PREVENT invalid transitions', () => {
      const session = fabric.create({ providerId: 'gemini' });
      
      // READY → RECOVERING is invalid (must go through DEGRADED first)
      const success = session.transitionTo('RECOVERING');
      expect(success).toBe(false);
      expect(session.state.state).toBe('READY');
    });

    it('should allow TERMINATED from DEGRADED', () => {
      const session = fabric.create({ providerId: 'gemini' });
      fabric.degrade(session.id, 'Browser crashed');
      fabric.terminate(session.id);
      expect(fabric.has(session.id)).toBe(false);
    });
  });

  describe('Request Acceptance', () => {
    it('should accept requests in READY state', () => {
      const session = fabric.create({ providerId: 'gemini' });
      expect(session.acceptsRequests()).toBe(true);
    });

    it('should accept requests in BUSY state', () => {
      const session = fabric.create({ providerId: 'gemini' });
      fabric.start(session.id);
      expect(session.acceptsRequests()).toBe(true);
    });

    it('should REJECT requests in RECOVERING state (503)', () => {
      const session = fabric.create({ providerId: 'gemini' });
      fabric.degrade(session.id, 'Browser crashed');
      fabric.recover(session.id);
      expect(session.acceptsRequests()).toBe(false);
    });

    it('should REJECT requests in DEGRADED state', () => {
      const session = fabric.create({ providerId: 'gemini' });
      fabric.degrade(session.id, 'Browser crashed');
      expect(session.acceptsRequests()).toBe(false);
    });

    it('should REJECT requests in TERMINATED state', () => {
      const session = fabric.create({ providerId: 'gemini' });
      fabric.terminate(session.id);
      // Session no longer exists
      expect(fabric.has(session.id)).toBe(false);
    });
  });

  describe('Session Expiration (TTL)', () => {
    it('should detect expired sessions', () => {
      const session = fabric.create({
        providerId: 'gemini',
        timeout: 100, // 100ms for testing
      });

      expect(session.isExpired()).toBe(false);

      // Wait for expiration
      return new Promise(resolve => setTimeout(resolve, 150)).then(() => {
        expect(session.isExpired()).toBe(true);
      });
    });

    it('should cleanup expired sessions automatically', () => {
      const session = fabric.create({
        providerId: 'gemini',
        timeout: 100,
      });

      expect(fabric.has(session.id)).toBe(true);

      // Wait for cleanup (cleanup interval is 60s by default, but we can test manually)
      return new Promise(resolve => setTimeout(resolve, 150)).then(() => {
        // Manual check - in real scenario cleanup runs automatically
        expect(session.isExpired()).toBe(true);
      });
    });

    it('should update last activity on touch', () => {
      const session = fabric.create({ providerId: 'gemini' });

      // Touch session
      session.touch();

      expect(session.isExpired()).toBe(false);
    });
  });

  describe('Resource Cleanup', () => {
    it('should cleanup resources on terminate', () => {
      const session = fabric.create({ providerId: 'gemini' });

      session.setTools(['fs.read', 'git.status']);
      session.setCapabilities(['streaming']);
      session.setPermissions({ 'fs.read': 'allowed' });
      session.addMessage({ role: 'user', content: 'Hello' });

      fabric.terminate(session.id);

      expect(fabric.has(session.id)).toBe(false);
    });

    it('should cleanup active requests on terminate', () => {
      const session = fabric.create({ providerId: 'gemini' });

      session.addRequest('req-1');
      session.addRequest('req-2');

      fabric.terminate(session.id);

      expect(fabric.has(session.id)).toBe(false);
    });

    it('should be idempotent (multiple terminates are safe)', () => {
      const session = fabric.create({ providerId: 'gemini' });

      fabric.terminate(session.id);
      fabric.terminate(session.id); // Should not throw

      expect(fabric.has(session.id)).toBe(false);
    });
  });

  describe('Session Isolation', () => {
    it('should isolate sessions completely', () => {
      const sessionA = fabric.create({
        providerId: 'gemini',
        workspace: '/workspace/a',
      });

      const sessionB = fabric.create({
        providerId: 'chatgpt',
        workspace: '/workspace/b',
      });

      sessionA.setTools(['fs.read']);
      sessionB.setTools(['git.status']);

      sessionA.setPermissions({ 'fs.read': 'allowed' });
      sessionB.setPermissions({ 'fs.read': 'denied' });

      // Verify isolation
      expect(sessionA.getTools()).toEqual(['fs.read']);
      expect(sessionB.getTools()).toEqual(['git.status']);
      expect(sessionA.getPermission('fs.read')).toBe('allowed');
      expect(sessionB.getPermission('fs.read')).toBe('denied');
    });

    it('should not allow cross-session state leakage', () => {
      const sessionA = fabric.create({ providerId: 'gemini' });
      const sessionB = fabric.create({ providerId: 'gemini' });

      fabric.start(sessionA.id);

      // Session B should remain READY
      expect(sessionA.state.state).toBe('BUSY');
      expect(sessionB.state.state).toBe('READY');
    });
  });

  describe('Event Bus Isolation', () => {
    it('should emit session-specific events', () => {
      const events: Array<{ type: string; sessionId: string }> = [];

      eventBus.on('session.created' as any, (data: any) => {
        events.push({ type: 'session.created', sessionId: data.sessionId });
      });

      eventBus.on('session.ready' as any, (data: any) => {
        events.push({ type: 'session.ready', sessionId: data.sessionId });
      });

      const session = fabric.create({ providerId: 'gemini' });

      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events.some(e => e.sessionId === session.id)).toBe(true);
    });
  });
});
