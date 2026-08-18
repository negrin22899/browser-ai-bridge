import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionEngine } from './permission-engine.js';
import { EventBus } from '@bab/core';
import type { ToolScope, PermissionContext } from '@bab/protocol';

describe('PermissionEngine', () => {
  let engine: PermissionEngine;
  let eventBus: EventBus;

  const defaultScope: ToolScope = {
    allowedPaths: ['/home/user/projects'],
    allowedCommands: ['git status', 'git diff'],
    deniedCommands: ['rm -rf', 'sudo'],
    maxExecutionTime: 30000,
  };

  beforeEach(() => {
    eventBus = new EventBus();
    engine = new PermissionEngine(eventBus, {
      mode: 'scope',
      defaultScope,
      dangerousTools: ['dangerous.tool'],
    });
  });

  const createContext = (sessionId: string = 'session-1'): PermissionContext => ({
    sessionId,
    scope: defaultScope,
    auditLog: [],
  });

  describe('Auto-approve rules (read-only operations)', () => {
    it('should auto-approve fs.read', async () => {
      const result = await engine.check('fs.read', { path: '/home/user/projects/test.txt' }, createContext());
      expect(result.allowed).toBe(true);
    });

    it('should auto-approve fs.list', async () => {
      const result = await engine.check('fs.list', { path: '/home/user/projects' }, createContext());
      expect(result.allowed).toBe(true);
    });

    it('should auto-approve git.status', async () => {
      const result = await engine.check('git.status', {}, createContext());
      expect(result.allowed).toBe(true);
    });

    it('should auto-approve git.diff', async () => {
      const result = await engine.check('git.diff', {}, createContext());
      expect(result.allowed).toBe(true);
    });

    it('should auto-approve git.log', async () => {
      const result = await engine.check('git.log', {}, createContext());
      expect(result.allowed).toBe(true);
    });

    it('should auto-approve git.branch', async () => {
      const result = await engine.check('git.branch', {}, createContext());
      expect(result.allowed).toBe(true);
    });
  });

  describe('Confirm rules (write/modify operations)', () => {
    it('should deny fs.write without permission', async () => {
      const result = await engine.check('fs.write', { path: '/test', content: 'data' }, createContext());
      expect(result.allowed).toBe(false);
      expect(result).toHaveProperty('reason', 'not_granted');
    });

    it('should allow fs.write with permission', async () => {
      engine.grant('fs.write', defaultScope, 'session-1');
      const result = await engine.check('fs.write', { path: '/home/user/projects/test.txt', content: 'data' }, createContext());
      expect(result.allowed).toBe(true);
    });

    it('should deny git.commit without permission', async () => {
      const result = await engine.check('git.commit', { message: 'test' }, createContext());
      expect(result.allowed).toBe(false);
    });

    it('should allow git.commit with permission', async () => {
      engine.grant('git.commit', defaultScope, 'session-1');
      const result = await engine.check('git.commit', { message: 'test' }, createContext());
      expect(result.allowed).toBe(true);
    });

    it('should deny git.push without permission', async () => {
      const result = await engine.check('git.push', {}, createContext());
      expect(result.allowed).toBe(false);
    });

    it('should deny shell.exec without permission', async () => {
      const result = await engine.check('shell.exec', { command: 'ls' }, createContext());
      expect(result.allowed).toBe(false);
    });

    it('should allow shell.exec with permission and valid command', async () => {
      engine.grant('shell.exec', defaultScope, 'session-1');
      const result = await engine.check('shell.exec', { command: 'git status' }, createContext());
      expect(result.allowed).toBe(true);
    });
  });

  describe('Deny rules', () => {
    it('should deny sudo commands even with permission', async () => {
      engine.grant('shell.exec', defaultScope, 'session-1');
      const result = await engine.check('shell.exec', { command: 'sudo ls' }, createContext());
      expect(result.allowed).toBe(false);
      expect(result).toHaveProperty('reason', 'denied_by_rule');
    });

    it('should deny format commands', async () => {
      engine.grant('shell.exec', defaultScope, 'session-1');
      const result = await engine.check('shell.exec', { command: 'format C:' }, createContext());
      expect(result.allowed).toBe(false);
    });

    it('should deny rm commands', async () => {
      engine.grant('shell.exec', defaultScope, 'session-1');
      const result = await engine.check('shell.exec', { command: 'rm -rf /' }, createContext());
      expect(result.allowed).toBe(false);
    });
  });

  describe('Dangerous tools', () => {
    it('should always deny dangerous tools', async () => {
      engine.grant('dangerous.tool', defaultScope, 'session-1');
      const result = await engine.check('dangerous.tool', {}, createContext());
      expect(result.allowed).toBe(false);
      expect(result).toHaveProperty('reason', 'dangerous');
    });
  });

  describe('Scope validation', () => {
    it('deny fs.read outside allowed paths', async () => {
      // fs.read is auto-approved, but scope validation still applies
      const result = await engine.check('fs.read', { path: '/etc/passwd' }, createContext());
      expect(result.allowed).toBe(false);
      expect(result).toHaveProperty('reason', 'scope_violation');
    });

    it('allow fs.read inside allowed paths', async () => {
      const result = await engine.check('fs.read', { path: '/home/user/projects/file.txt' }, createContext());
      expect(result.allowed).toBe(true);
    });

    it('deny shell.exec with denied commands in scope', async () => {
      engine.grant('shell.exec', defaultScope, 'session-1');
      const result = await engine.check('shell.exec', { command: 'rm -rf /' }, createContext());
      expect(result.allowed).toBe(false);
    });
  });

  describe('Permission management', () => {
    it('should grant and revoke permissions', () => {
      engine.grant('fs.write', defaultScope, 'session-1');
      expect(engine.getScope('fs.write', 'session-1')).toBeDefined();

      engine.revoke('fs.write', 'session-1');
      expect(engine.getScope('fs.write', 'session-1')).toBeUndefined();
    });

    it('should clear all permissions for session', () => {
      engine.grant('fs.write', defaultScope, 'session-1');
      engine.grant('git.commit', defaultScope, 'session-1');

      engine.clear('session-1');

      expect(engine.getScope('fs.write', 'session-1')).toBeUndefined();
      expect(engine.getScope('git.commit', 'session-1')).toBeUndefined();
    });
  });

  describe('Rules management', () => {
    it('should get rules', () => {
      const rules = engine.getRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should add custom rule', () => {
      const initialCount = engine.getRules().length;

      engine.addRule({
        toolPattern: 'custom.tool',
        mode: 'auto',
      });

      expect(engine.getRules().length).toBe(initialCount + 1);
    });
  });

  describe('getMode', () => {
    it('returns auto for read-only tools', () => {
      expect(engine.getMode('fs.read')).toBe('auto');
      expect(engine.getMode('fs.exists')).toBe('auto');
      expect(engine.getMode('fs.glob')).toBe('auto');
      expect(engine.getMode('fs.search')).toBe('auto');
      expect(engine.getMode('git.status')).toBe('auto');
      expect(engine.getMode('git.branch')).toBe('auto');
    });

    it('returns confirm for write tools', () => {
      expect(engine.getMode('fs.write')).toBe('confirm');
      expect(engine.getMode('fs.edit')).toBe('confirm');
      expect(engine.getMode('fs.delete')).toBe('confirm');
      expect(engine.getMode('git.commit')).toBe('confirm');
      expect(engine.getMode('shell.exec')).toBe('confirm');
    });

    it('returns deny for dangerous tools', () => {
      expect(engine.getMode('dangerous.tool')).toBe('deny');
    });

    it('returns confirm for unknown tools (default require permission)', () => {
      expect(engine.getMode('unknown.tool')).toBe('confirm');
    });
  });
});
