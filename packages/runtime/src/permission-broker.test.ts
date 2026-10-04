import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '@bab/core';
import type { ToolScope } from '@bab/protocol';
import { PermissionBroker } from './permission-broker.js';

const scope: ToolScope = {
  allowedPaths: ['/tmp'],
  allowedCommands: [],
  deniedCommands: [],
  maxExecutionTime: 30000,
};

function makeBroker(timeoutMs?: number): PermissionBroker {
  return new PermissionBroker(new EventBus(), { timeoutMs });
}

describe('PermissionBroker', () => {
  it('creates a pending request and lists it', () => {
    const broker = makeBroker();
    void broker.request('fs.write', { path: '/tmp/x' }, 'session-1', scope);

    const pending = broker.list();
    expect(pending).toHaveLength(1);
    expect(pending[0].toolName).toBe('fs.write');
    expect(pending[0].params).toEqual({ path: '/tmp/x' });
    expect(pending[0].sessionId).toBe('session-1');
  });

  it('approves a pending request', async () => {
    const broker = makeBroker();
    const decisionPromise = broker.request('fs.write', {}, 'session-1', scope);
    const id = broker.list()[0].id;

    const ok = broker.approve(id, { persist: true, scope });
    expect(ok).toBe(true);

    const decision = await decisionPromise;
    expect(decision.allowed).toBe(true);
    expect(decision.persist).toBe(true);
    expect(broker.list()).toHaveLength(0);
  });

  it('denies a pending request', async () => {
    const broker = makeBroker();
    const decisionPromise = broker.request('shell.exec', { command: 'ls' }, 'session-1', scope);
    const id = broker.list()[0].id;

    const ok = broker.deny(id);
    expect(ok).toBe(true);

    const decision = await decisionPromise;
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('denied_by_user');
    expect(broker.list()).toHaveLength(0);
  });

  it('returns false for unknown ids', () => {
    const broker = makeBroker();
    expect(broker.approve('missing')).toBe(false);
    expect(broker.deny('missing')).toBe(false);
  });

  it('auto-denies after the timeout', async () => {
    vi.useFakeTimers();
    try {
      const broker = makeBroker(1000);
      const decisionPromise = broker.request('fs.write', {}, 'session-1', scope);

      expect(broker.list()).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1000);

      const decision = await decisionPromise;
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('timeout');
      expect(broker.list()).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
