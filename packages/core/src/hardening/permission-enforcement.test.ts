import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventBus } from '../event-bus.js';
import { SessionFabric } from '../session-fabric.js';

/**
 * Hardening Tests - Permission Enforcement
 * 
 * These tests verify that permissions are properly enforced:
 * - Allow mode
 * - Confirm mode
 * - Deny mode
 * - Permission changes during session
 * - Cross-session permission isolation
 */

describe('Permission Enforcement', () => {
  let eventBus: EventBus;
  let fabric: SessionFabric;

  beforeEach(() => {
    eventBus = new EventBus();
    fabric = new SessionFabric(eventBus, { maxSessions: 10 });
  });

  afterEach(() => {
    fabric.terminateAll();
  });

  describe('Permission Modes', () => {
    it('should support allow mode', () => {
      const session = fabric.create({ providerId: 'gemini' });

      session.setPermissions({
        'fs.read': 'allowed',
        'git.status': 'allowed',
      });

      expect(session.getPermission('fs.read')).toBe('allowed');
      expect(session.getPermission('git.status')).toBe('allowed');
    });

    it('should support confirm mode', () => {
      const session = fabric.create({ providerId: 'gemini' });

      session.setPermissions({
        'fs.write': 'confirm',
        'git.commit': 'confirm',
      });

      expect(session.getPermission('fs.write')).toBe('confirm');
      expect(session.getPermission('git.commit')).toBe('confirm');
    });

    it('should support deny mode', () => {
      const session = fabric.create({ providerId: 'gemini' });

      session.setPermissions({
        'shell.exec': 'deny',
        'git.push': 'deny',
      });

      expect(session.getPermission('shell.exec')).toBe('deny');
      expect(session.getPermission('git.push')).toBe('deny');
    });
  });

  describe('Permission Isolation', () => {
    it('should isolate permissions between sessions', () => {
      const sessionA = fabric.create({ providerId: 'gemini' });
      const sessionB = fabric.create({ providerId: 'gemini' });

      sessionA.setPermissions({
        'fs.read': 'allowed',
        'fs.write': 'confirm',
      });

      sessionB.setPermissions({
        'fs.read': 'deny',
        'fs.write': 'allowed',
      });

      // Session A permissions
      expect(sessionA.getPermission('fs.read')).toBe('allowed');
      expect(sessionA.getPermission('fs.write')).toBe('confirm');

      // Session B permissions
      expect(sessionB.getPermission('fs.read')).toBe('deny');
      expect(sessionB.getPermission('fs.write')).toBe('allowed');
    });

    it('should not allow permission changes in one session to affect another', () => {
      const sessionA = fabric.create({ providerId: 'gemini' });
      const sessionB = fabric.create({ providerId: 'gemini' });

      sessionA.setPermissions({ 'fs.read': 'allowed' });
      sessionB.setPermissions({ 'fs.read': 'deny' });

      // Change session A permissions
      sessionA.setPermissions({ 'fs.read': 'confirm' });

      // Session B should be unaffected
      expect(sessionB.getPermission('fs.read')).toBe('deny');
    });
  });

  describe('Permission Changes During Session', () => {
    it('should allow permission changes during active session', () => {
      const session = fabric.create({ providerId: 'gemini' });

      fabric.start(session.id);

      // Initial permissions
      session.setPermissions({ 'fs.read': 'allowed' });
      expect(session.getPermission('fs.read')).toBe('allowed');

      // Change permissions
      session.setPermissions({ 'fs.read': 'deny' });
      expect(session.getPermission('fs.read')).toBe('deny');
    });

    it('should reflect permission changes immediately', () => {
      const session = fabric.create({ providerId: 'gemini' });

      session.setPermissions({ 'git.push': 'confirm' });
      expect(session.getPermission('git.push')).toBe('confirm');

      // Change to deny
      session.setPermissions({ 'git.push': 'deny' });
      expect(session.getPermission('git.push')).toBe('deny');
    });
  });

  describe('Tool Visibility vs Authorization', () => {
    it('should distinguish between tool visibility and authorization', () => {
      const session = fabric.create({ providerId: 'gemini' });

      // Tool is visible (in tools list)
      session.setTools(['fs.read', 'fs.write']);

      // But fs.write requires confirmation
      session.setPermissions({
        'fs.read': 'allowed',
        'fs.write': 'confirm',
      });

      // Tool should be in the list
      expect(session.hasTool('fs.write')).toBe(true);

      // But permission should be confirm
      expect(session.getPermission('fs.write')).toBe('confirm');
    });

    it('should not automatically authorize tools just because they are visible', () => {
      const session = fabric.create({ providerId: 'gemini' });

      session.setTools(['shell.exec']);
      session.setPermissions({ 'shell.exec': 'deny' });

      // Tool is visible but denied
      expect(session.hasTool('shell.exec')).toBe(true);
      expect(session.getPermission('shell.exec')).toBe('deny');
    });
  });

  describe('Permission with Capabilities', () => {
    it('should combine permissions with capabilities', () => {
      const session = fabric.create({ providerId: 'gemini' });

      session.setCapabilities(['streaming', 'files', 'toolCalling']);
      session.setPermissions({
        'fs.read': 'allowed',
        'fs.write': 'confirm',
      });

      // Both should be set independently
      expect(session.hasCapability('files')).toBe(true);
      expect(session.getPermission('fs.read')).toBe('allowed');
    });
  });

  describe('Permission Context', () => {
    it('should include permissions in session context', () => {
      const session = fabric.create({ providerId: 'gemini' });

      session.setPermissions({
        'fs.read': 'allowed',
        'fs.write': 'confirm',
        'git.push': 'deny',
      });

      const context = session.getContext();

      expect(context.permissions['fs.read']).toBe('allowed');
      expect(context.permissions['fs.write']).toBe('confirm');
      expect(context.permissions['git.push']).toBe('deny');
    });

    it('should return isolated permission copy in context', () => {
      const session = fabric.create({ providerId: 'gemini' });

      session.setPermissions({ 'fs.read': 'allowed' });

      const context1 = session.getContext();
      const context2 = session.getContext();

      // Changing one context should not affect the other
      context1.permissions['fs.read'] = 'deny';
      expect(context2.permissions['fs.read']).toBe('allowed');
    });
  });

  describe('Permission Edge Cases', () => {
    it('should handle empty permissions', () => {
      const session = fabric.create({ providerId: 'gemini' });

      session.setPermissions({});

      expect(session.getPermission('fs.read')).toBeUndefined();
      expect(session.getPermissions()).toEqual({});
    });

    it('should handle undefined permissions', () => {
      const session = fabric.create({ providerId: 'gemini' });

      // Don't set any permissions
      expect(session.getPermission('fs.read')).toBeUndefined();
    });

    it('should handle permission overwriting', () => {
      const session = fabric.create({ providerId: 'gemini' });

      session.setPermissions({
        'fs.read': 'allowed',
        'fs.write': 'confirm',
      });

      // Overwrite all permissions
      session.setPermissions({
        'git.status': 'allowed',
      });

      // Old permissions should be gone
      expect(session.getPermission('fs.read')).toBeUndefined();
      expect(session.getPermission('git.status')).toBe('allowed');
    });
  });

  describe('Multi-Session Permission Scenarios', () => {
    it('should handle different permission sets for different providers', () => {
      const geminiSession = fabric.create({ providerId: 'gemini' });
      const chatgptSession = fabric.create({ providerId: 'chatgpt' });

      geminiSession.setPermissions({
        'fs.read': 'allowed',
        'fs.write': 'confirm',
      });

      chatgptSession.setPermissions({
        'fs.read': 'allowed',
        'fs.write': 'allowed',
      });

      expect(geminiSession.getPermission('fs.write')).toBe('confirm');
      expect(chatgptSession.getPermission('fs.write')).toBe('allowed');
    });

    it('should handle permission changes in parallel sessions', () => {
      const sessionA = fabric.create({ providerId: 'gemini' });
      const sessionB = fabric.create({ providerId: 'gemini' });

      // Both start with same permissions
      sessionA.setPermissions({ 'fs.read': 'allowed' });
      sessionB.setPermissions({ 'fs.read': 'allowed' });

      // Change only session A
      sessionA.setPermissions({ 'fs.read': 'deny' });

      // Session B should be unaffected
      expect(sessionA.getPermission('fs.read')).toBe('deny');
      expect(sessionB.getPermission('fs.read')).toBe('allowed');
    });
  });
});
