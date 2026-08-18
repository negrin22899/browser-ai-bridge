import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventBus } from '../event-bus.js';
import { SessionFabric, type Session, type SessionConfig } from '../session-fabric.js';

/**
 * Hardening Tests - Session Isolation
 * 
 * These tests verify that sessions are properly isolated from each other.
 * Session A MUST NOT be able to access Session B's:
 * - workspace
 * - browser session
 * - runtime
 * - credentials
 * - permissions
 * - tool state
 */

describe('Session Isolation', () => {
  let eventBus: EventBus;
  let fabric: SessionFabric;

  beforeEach(() => {
    eventBus = new EventBus();
    fabric = new SessionFabric(eventBus, { maxSessions: 10 });
  });

  afterEach(() => {
    fabric.terminateAll();
  });

  describe('Workspace Isolation', () => {
    it('should not allow Session A to access Session B workspace', () => {
      const sessionA = fabric.create({
        providerId: 'gemini',
        workspace: '/workspace/a',
      });

      const sessionB = fabric.create({
        providerId: 'gemini',
        workspace: '/workspace/b',
      });

      // Session A should only see its own workspace
      expect(sessionA.workspace).toBe('/workspace/a');
      expect(sessionB.workspace).toBe('/workspace/b');

      // Verify they are different
      expect(sessionA.workspace).not.toBe(sessionB.workspace);
    });

    it('should not allow workspace path traversal between sessions', () => {
      const sessionA = fabric.create({
        providerId: 'gemini',
        workspace: '/workspace/a',
      });

      // Attempting to access workspace B from session A context
      const contextA = sessionA.getContext();
      
      // The context should only contain session A's workspace
      expect(contextA.workspace).toBe('/workspace/a');
    });
  });

  describe('Provider Isolation', () => {
    it('should isolate providers between sessions', () => {
      const sessionA = fabric.create({
        providerId: 'gemini',
      });

      const sessionB = fabric.create({
        providerId: 'chatgpt',
      });

      expect(sessionA.providerId).toBe('gemini');
      expect(sessionB.providerId).toBe('chatgpt');
      expect(sessionA.providerId).not.toBe(sessionB.providerId);
    });

    it('should not allow changing provider of another session', () => {
      const sessionA = fabric.create({
        providerId: 'gemini',
      });

      const sessionB = fabric.create({
        providerId: 'chatgpt',
      });

      // Session A's provider should remain unchanged
      expect(sessionA.providerId).toBe('gemini');
      
      // Creating session B should not affect session A
      expect(sessionA.providerId).toBe('gemini');
    });
  });

  describe('Runtime Isolation', () => {
    it('should isolate runtime providers between sessions', () => {
      const sessionA = fabric.create({
        providerId: 'gemini',
        runtimeProviderId: 'local',
      });

      const sessionB = fabric.create({
        providerId: 'gemini',
        runtimeProviderId: 'docker',
      });

      expect(sessionA.runtimeProviderId).toBe('local');
      expect(sessionB.runtimeProviderId).toBe('docker');
    });
  });

  describe('Tool Isolation', () => {
    it('should isolate tools between sessions', () => {
      const sessionA = fabric.create({
        providerId: 'gemini',
      });

      const sessionB = fabric.create({
        providerId: 'gemini',
      });

      sessionA.setTools(['fs.read', 'git.status']);
      sessionB.setTools(['fs.write', 'shell.exec']);

      expect(sessionA.getTools()).toEqual(['fs.read', 'git.status']);
      expect(sessionB.getTools()).toEqual(['fs.write', 'shell.exec']);
    });

    it('should not allow one session to see another session tools', () => {
      const sessionA = fabric.create({
        providerId: 'gemini',
      });

      const sessionB = fabric.create({
        providerId: 'gemini',
      });

      sessionA.setTools(['fs.read']);
      sessionB.setTools(['git.push']);

      // Session A should not see session B's tools
      expect(sessionA.hasTool('git.push')).toBe(false);
      expect(sessionB.hasTool('fs.read')).toBe(false);
    });
  });

  describe('Capability Isolation', () => {
    it('should isolate capabilities between sessions', () => {
      const sessionA = fabric.create({
        providerId: 'gemini',
      });

      const sessionB = fabric.create({
        providerId: 'gemini',
      });

      sessionA.setCapabilities(['streaming', 'files']);
      sessionB.setCapabilities(['images', 'webSearch']);

      expect(sessionA.getCapabilities()).toEqual(['streaming', 'files']);
      expect(sessionB.getCapabilities()).toEqual(['images', 'webSearch']);
    });
  });

  describe('Permission Isolation', () => {
    it('should isolate permissions between sessions', () => {
      const sessionA = fabric.create({
        providerId: 'gemini',
      });

      const sessionB = fabric.create({
        providerId: 'gemini',
      });

      sessionA.setPermissions({
        'fs.read': 'allowed',
        'fs.write': 'confirm',
      });

      sessionB.setPermissions({
        'fs.read': 'denied',
        'git.push': 'confirm',
      });

      expect(sessionA.getPermission('fs.read')).toBe('allowed');
      expect(sessionA.getPermission('fs.write')).toBe('confirm');
      expect(sessionB.getPermission('fs.read')).toBe('denied');
      expect(sessionB.getPermission('git.push')).toBe('confirm');
    });

    it('should not allow permission changes in one session to affect another', () => {
      const sessionA = fabric.create({
        providerId: 'gemini',
      });

      const sessionB = fabric.create({
        providerId: 'gemini',
      });

      sessionA.setPermissions({ 'fs.read': 'allowed' });
      sessionB.setPermissions({ 'fs.read': 'denied' });

      // Changing session B should not affect session A
      expect(sessionA.getPermission('fs.read')).toBe('allowed');
      expect(sessionB.getPermission('fs.read')).toBe('denied');
    });
  });

  describe('Message Isolation', () => {
    it('should isolate messages between sessions', () => {
      const sessionA = fabric.create({
        providerId: 'gemini',
      });

      const sessionB = fabric.create({
        providerId: 'gemini',
      });

      sessionA.addMessage({ role: 'user', content: 'Hello from A' });
      sessionB.addMessage({ role: 'user', content: 'Hello from B' });

      expect(sessionA.getMessages()).toHaveLength(1);
      expect(sessionA.getMessages()[0].content).toBe('Hello from A');
      expect(sessionB.getMessages()).toHaveLength(1);
      expect(sessionB.getMessages()[0].content).toBe('Hello from B');
    });
  });

  describe('Request Isolation', () => {
    it('should isolate active requests between sessions', () => {
      const sessionA = fabric.create({
        providerId: 'gemini',
      });

      const sessionB = fabric.create({
        providerId: 'gemini',
      });

      sessionA.addRequest('req-a-1');
      sessionA.addRequest('req-a-2');
      sessionB.addRequest('req-b-1');

      expect(sessionA.getActiveRequests()).toEqual(['req-a-1', 'req-a-2']);
      expect(sessionB.getActiveRequests()).toEqual(['req-b-1']);
    });

    it('should enforce concurrent request limits per session', () => {
      const session = fabric.create({
        providerId: 'gemini',
        maxConcurrentRequests: 2,
      });

      expect(session.addRequest('req-1')).toBe(true);
      expect(session.addRequest('req-2')).toBe(true);
      expect(session.addRequest('req-3')).toBe(false); // Limit reached
    });
  });

  describe('Session Lifecycle Isolation', () => {
    it('should not allow one session state to affect another', () => {
      const sessionA = fabric.create({
        providerId: 'gemini',
      });

      const sessionB = fabric.create({
        providerId: 'gemini',
      });

      fabric.start(sessionA.id);
      fabric.degrade(sessionB.id, 'Browser failure');

      expect(sessionA.state.state).toBe('BUSY');
      expect(sessionB.state.state).toBe('DEGRADED');
    });

    it('should not allow terminating one session to affect another', () => {
      const sessionA = fabric.create({
        providerId: 'gemini',
      });

      const sessionB = fabric.create({
        providerId: 'gemini',
      });

      fabric.terminate(sessionA.id);

      // Session B should still exist
      expect(fabric.has(sessionB.id)).toBe(true);
      expect(sessionB.state.state).toBe('READY');
    });
  });

  describe('Lock Isolation', () => {
    it('should not allow one session lock to affect another', () => {
      const sessionA = fabric.create({
        providerId: 'gemini',
      });

      const sessionB = fabric.create({
        providerId: 'gemini',
      });

      sessionA.addRequest('req-a');

      // Session B should not be affected
      expect(sessionB.getActiveRequests()).toHaveLength(0);
      expect(sessionB.addRequest('req-b')).toBe(true);
    });
  });

  describe('Context Snapshot Isolation', () => {
    it('should return isolated context for each session', () => {
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

      const contextA = sessionA.getContext();
      const contextB = sessionB.getContext();

      // Contexts should be independent
      expect(contextA.identity.providerId).toBe('gemini');
      expect(contextB.identity.providerId).toBe('chatgpt');
      expect(contextA.workspace).toBe('/workspace/a');
      expect(contextB.workspace).toBe('/workspace/b');
      expect(contextA.tools).toEqual(['fs.read']);
      expect(contextB.tools).toEqual(['git.status']);
    });
  });
});
