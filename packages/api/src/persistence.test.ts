import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { StatePersistence, type PersistedState } from './persistence.js';
import { SessionManager, EventBus } from '@bab/core';
import type { Message, AuditEntry } from '@bab/protocol';

const tempDirs: string[] = [];

function makeFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'bab-persist-'));
  tempDirs.push(dir);
  return join(dir, 'state.json');
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('StatePersistence', () => {
  it('round-trips state through disk', () => {
    const file = makeFile();
    const store = new StatePersistence(file);

    const state: PersistedState = {
      sessions: [
        {
          id: 's1',
          providerId: 'gemini',
          model: 'gemini',
          createdAt: 123,
          messages: [{ role: 'user', content: 'hi' }],
        },
      ],
      audit: {
        s1: [{ timestamp: 1, sessionId: 's1', toolName: 'fs.read', params: {}, result: 'allowed' }],
      },
      activeSessionId: 's1',
    };

    store.save(state);
    expect(existsSync(file)).toBe(true);

    const loaded = store.load();
    expect(loaded).toEqual(state);
  });

  it('returns null when no state file exists', () => {
    const store = new StatePersistence(makeFile());
    expect(store.load()).toBeNull();
  });
});

describe('SessionManager.restore', () => {
  it('restores a session with its messages and createdAt', () => {
    const manager = new SessionManager(new EventBus());
    const messages: Message[] = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'world' },
    ];

    const session = manager.restore(
      { id: 'restored-1', providerId: 'gemini', model: 'gemini', createdAt: 5000 },
      messages
    );

    expect(session.id).toBe('restored-1');
    expect(session.createdAt).toBe(5000);
    expect(session.getMessages()).toEqual(messages);
    expect(manager.has('restored-1')).toBe(true);
    expect(manager.getActive().id).toBe('restored-1');
  });
});
