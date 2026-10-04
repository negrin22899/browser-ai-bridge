import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { TeamAuth } from './team-auth.js';

describe('TeamAuth', () => {
  let dir: string;
  let filePath: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bab-team-'));
    filePath = path.join(dir, 'team.json');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('is disabled when no clients exist', () => {
    const auth = new TeamAuth({ filePath });
    expect(auth.enabled).toBe(false);
    expect(auth.authenticate('Bearer whatever')).toBeNull();
  });

  it('authenticates a valid bearer key', () => {
    const auth = new TeamAuth({ filePath, clients: [{ name: 'alice', role: 'member', key: 'bab-secret-1' }] });

    expect(auth.enabled).toBe(true);
    expect(auth.authenticate('Bearer bab-secret-1')).toMatchObject({ name: 'alice', role: 'member' });
  });

  it('rejects missing or invalid keys', () => {
    const auth = new TeamAuth({ filePath, clients: [{ name: 'alice', role: 'admin', key: 'bab-secret-1' }] });

    expect(auth.authenticate(undefined)).toBeNull();
    expect(auth.authenticate('Bearer wrong')).toBeNull();
    expect(auth.authenticate('bab-secret-1')).toBeNull(); // requires Bearer prefix
  });

  it('create returns the raw key once and never stores it plaintext', () => {
    const auth = new TeamAuth({ filePath });
    const { credential, key } = auth.create('bob', 'member');

    expect(key).toMatch(/^bab-/);
    expect(credential.role).toBe('member');
    expect(auth.authenticate(`Bearer ${key}`)).toMatchObject({ name: 'bob' });

    const onDisk = fs.readFileSync(filePath, 'utf-8');
    expect(onDisk).not.toContain(key);
  });

  it('list exposes a keyHint, never the key', () => {
    const auth = new TeamAuth({ filePath });
    auth.create('carol', 'admin');

    const clients = auth.list();
    expect(clients).toHaveLength(1);
    expect(clients[0]).not.toHaveProperty('key');
    expect(clients[0].keyHint).toBeTruthy();
  });

  it('revoke removes a client', () => {
    const auth = new TeamAuth({ filePath, clients: [{ name: 'dave', role: 'member', key: 'bab-k' }] });
    const [client] = auth.list();

    expect(auth.revoke(client.id)).toBe(true);
    expect(auth.enabled).toBe(false);
    expect(auth.revoke(client.id)).toBe(false);
  });

  it('persists clients to disk and reloads them', () => {
    const first = new TeamAuth({ filePath });
    const { key } = first.create('erin', 'admin');

    const second = new TeamAuth({ filePath });
    expect(second.enabled).toBe(true);
    expect(second.authenticate(`Bearer ${key}`)).toMatchObject({ name: 'erin', role: 'admin' });
  });

  it('ensure is idempotent for the same key', () => {
    const auth = new TeamAuth({ filePath });
    const first = auth.ensure('admin', 'admin', 'bab-admin-key');
    const dup = auth.ensure('admin', 'admin', 'bab-admin-key');

    expect(first).not.toBeNull();
    expect(dup).toBeNull();
    expect(auth.list()).toHaveLength(1);
  });
});
