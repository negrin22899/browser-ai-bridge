import { describe, it, expect, beforeEach } from 'vitest';
import { SessionPersistence } from './session-persistence.js';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';

describe('SessionPersistence', () => {
  let persistence: SessionPersistence;
  const testDir = path.join(os.tmpdir(), 'bab-test-sessions');

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }

    persistence = new SessionPersistence({ storageDir: testDir });
  });

  it('should save and load session', async () => {
    const session = {
      id: 'test-session',
      providerId: 'gemini',
      url: 'https://gemini.google.com',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    await persistence.save(session);
    const loaded = await persistence.load('test-session');

    expect(loaded).toBeDefined();
    expect(loaded?.id).toBe('test-session');
    expect(loaded?.providerId).toBe('gemini');
  });

  it('should return null for non-existent session', async () => {
    const loaded = await persistence.load('non-existent');

    expect(loaded).toBeNull();
  });

  it('should list sessions', async () => {
    await persistence.save({
      id: 'session-1',
      providerId: 'gemini',
      url: 'https://gemini.google.com',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    });

    await persistence.save({
      id: 'session-2',
      providerId: 'chatgpt',
      url: 'https://chatgpt.com',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    });

    const sessions = await persistence.list();

    expect(sessions).toHaveLength(2);
  });

  it('should delete session', async () => {
    await persistence.save({
      id: 'to-delete',
      providerId: 'gemini',
      url: 'https://gemini.google.com',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    });

    await persistence.delete('to-delete');
    const loaded = await persistence.load('to-delete');

    expect(loaded).toBeNull();
  });

  it('should find session by provider and url', async () => {
    await persistence.save({
      id: 'found-session',
      providerId: 'gemini',
      url: 'https://gemini.google.com',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    });

    const found = await persistence.findByProviderAndUrl('gemini', 'https://gemini.google.com');

    expect(found).toBeDefined();
    expect(found?.id).toBe('found-session');
  });

  it('should persist sessions to disk', async () => {
    await persistence.save({
      id: 'persistent',
      providerId: 'gemini',
      url: 'https://gemini.google.com',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    });

    // Create new persistence with same directory
    const newPersistence = new SessionPersistence({ storageDir: testDir });
    const sessions = await newPersistence.list();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('persistent');
  });
});
