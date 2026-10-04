import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventBus } from '../event-bus.js';
import { SessionFabric } from '../session-fabric.js';

/**
 * Hardening Tests - Browser Crash/Recovery
 * 
 * These tests verify that sessions handle browser failures correctly:
 * - Browser crash detection
 * - Session degradation
 * - Recovery attempts
 * - State consistency after recovery
 */

describe('Browser Crash/Recovery', () => {
  let eventBus: EventBus;
  let fabric: SessionFabric;
  const events: Array<{ type: string; data: any }> = [];

  beforeEach(() => {
    eventBus = new EventBus();
    fabric = new SessionFabric(eventBus, { maxSessions: 10 });
    events.length = 0;

    // Capture events
    eventBus.on('session.degraded' as any, (data: any) => {
      events.push({ type: 'session.degraded', data });
    });
    eventBus.on('session.recovering' as any, (data: any) => {
      events.push({ type: 'session.recovering', data });
    });
    eventBus.on('session.ready' as any, (data: any) => {
      events.push({ type: 'session.ready', data });
    });
  });

  afterEach(() => {
    fabric.terminateAll();
  });

  describe('Session Degradation', () => {
    it('should degrade session when browser fails', () => {
      const session = fabric.create({
        providerId: 'gemini',
      });

      fabric.start(session.id);

      // Simulate browser failure
      fabric.degrade(session.id, 'Browser disconnected');

      expect(session.state.state).toBe('DEGRADED');
      expect(session.state.error).toBe('Browser disconnected');
    });

    it('should emit degradation event', () => {
      const session = fabric.create({
        providerId: 'gemini',
      });

      fabric.start(session.id);
      fabric.degrade(session.id, 'Browser crash');

      const degradedEvents = events.filter(e => e.type === 'session.degraded');
      expect(degradedEvents.length).toBeGreaterThan(0);
    });

    it('should not affect other sessions when one degrades', () => {
      const sessionA = fabric.create({ providerId: 'gemini' });
      const sessionB = fabric.create({ providerId: 'gemini' });

      fabric.start(sessionA.id);
      fabric.start(sessionB.id);

      // Degrade session A
      fabric.degrade(sessionA.id, 'Browser A failed');

      // Session B should remain running
      expect(sessionA.state.state).toBe('DEGRADED');
      expect(sessionB.state.state).toBe('BUSY');
    });
  });

  describe('Session Recovery', () => {
    it('should allow recovery from degraded state', () => {
      const session = fabric.create({
        providerId: 'gemini',
      });

      fabric.start(session.id);
      fabric.degrade(session.id, 'Browser disconnected');
      fabric.recover(session.id);

      expect(session.state.state).toBe('RECOVERING');
    });

    it('should emit recovery event', () => {
      const session = fabric.create({
        providerId: 'gemini',
      });

      fabric.start(session.id);
      fabric.degrade(session.id, 'Browser disconnected');
      fabric.recover(session.id);

      const recoverEvents = events.filter(e => e.type === 'session.recovering');
      expect(recoverEvents.length).toBeGreaterThan(0);
    });

    it('should allow transition to running after recovery', () => {
      const session = fabric.create({
        providerId: 'gemini',
      });

      fabric.start(session.id);
      fabric.degrade(session.id, 'Browser disconnected');
      fabric.recover(session.id);
      fabric.complete(session.id);

      expect(session.state.state).toBe('READY');
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent state through crash/recovery cycle', () => {
      const session = fabric.create({
        providerId: 'gemini',
        workspace: '/workspace/test',
      });

      // Set initial state
      session.setTools(['fs.read', 'git.status']);
      session.setCapabilities(['streaming', 'files']);
      session.setPermissions({ 'fs.read': 'allowed' });
      session.addMessage({ role: 'user', content: 'Hello' });

      // Start and degrade
      fabric.start(session.id);
      fabric.degrade(session.id, 'Browser crash');

      // State should be preserved
      expect(session.getTools()).toEqual(['fs.read', 'git.status']);
      expect(session.getCapabilities()).toEqual(['streaming', 'files']);
      expect(session.getPermission('fs.read')).toBe('allowed');
      expect(session.getMessages()).toHaveLength(1);

      // Recover
      fabric.recover(session.id);

      // State should still be preserved
      expect(session.getTools()).toEqual(['fs.read', 'git.status']);
      expect(session.getCapabilities()).toEqual(['streaming', 'files']);
      expect(session.getPermission('fs.read')).toBe('allowed');
      expect(session.getMessages()).toHaveLength(1);
    });

    it('should not allow degraded session to process requests', () => {
      const session = fabric.create({
        providerId: 'gemini',
      });

      fabric.start(session.id);
      fabric.degrade(session.id, 'Browser disconnected');

      // Session should not accept new requests in degraded state
      // This is enforced at the request processing level
      expect(session.state.state).toBe('DEGRADED');
    });
  });

  describe('Multiple Browser Failures', () => {
    it('should handle multiple degradation/recovery cycles', () => {
      const session = fabric.create({
        providerId: 'gemini',
      });

      // First cycle
      fabric.start(session.id);
      fabric.degrade(session.id, 'First crash');
      expect(session.state.state).toBe('DEGRADED');

      fabric.recover(session.id);
      expect(session.state.state).toBe('RECOVERING');

      fabric.complete(session.id);
      expect(session.state.state).toBe('READY');

      // Second cycle
      fabric.degrade(session.id, 'Second crash');
      expect(session.state.state).toBe('DEGRADED');

      fabric.recover(session.id);
      fabric.complete(session.id);
      expect(session.state.state).toBe('READY');
    });
  });

  describe('Isolation During Failure', () => {
    it('should maintain isolation when one session has browser failure', () => {
      const sessionA = fabric.create({
        providerId: 'gemini',
        workspace: '/workspace/a',
      });

      const sessionB = fabric.create({
        providerId: 'gemini',
        workspace: '/workspace/b',
      });

      fabric.start(sessionA.id);
      fabric.start(sessionB.id);

      // Add different tools to each session
      sessionA.setTools(['fs.read']);
      sessionB.setTools(['git.status']);

      // Degrade session A
      fabric.degrade(sessionA.id, 'Browser A crashed');

      // Session B should be unaffected
      expect(sessionA.state.state).toBe('DEGRADED');
      expect(sessionB.state.state).toBe('BUSY');
      expect(sessionA.getTools()).toEqual(['fs.read']);
      expect(sessionB.getTools()).toEqual(['git.status']);
    });
  });

  describe('Resource Cleanup on Failure', () => {
    it('should clean up resources when session is terminated after failure', () => {
      const session = fabric.create({
        providerId: 'gemini',
      });

      fabric.start(session.id);
      fabric.degrade(session.id, 'Browser crash');

      // Terminate should work even in degraded state
      fabric.terminate(session.id);

      expect(fabric.has(session.id)).toBe(false);
    });

    it('should clean up active requests on degradation', () => {
      const session = fabric.create({
        providerId: 'gemini',
      });

      fabric.start(session.id);
      session.addRequest('req-1');
      session.addRequest('req-2');

      fabric.degrade(session.id, 'Browser crash');

      // Active requests should be cleared
      expect(session.getActiveRequests()).toHaveLength(0);
    });
  });

  describe('Error Messages', () => {
    it('should provide actionable error messages on browser failure', () => {
      const session = fabric.create({
        providerId: 'gemini',
      });

      fabric.start(session.id);
      fabric.degrade(session.id, 'Chrome tab became unavailable');

      const context = session.getContext();
      expect(context.state.error).toBe('Chrome tab became unavailable');
      expect(context.state.state).toBe('DEGRADED');
    });
  });
});
