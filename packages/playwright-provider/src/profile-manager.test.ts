import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileManager } from './profile-manager.js';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';

describe('ProfileManager', () => {
  let manager: ProfileManager;
  const testDir = path.join(os.tmpdir(), 'bab-test-profiles');

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }

    manager = new ProfileManager({ profilesDir: testDir });
  });

  it('should create a profile', () => {
    const profile = manager.create({ name: 'Test Profile' });

    expect(profile.id).toBeDefined();
    expect(profile.name).toBe('Test Profile');
    expect(profile.browserType).toBe('chrome');
  });

  it('should list profiles', () => {
    manager.create({ name: 'Profile 1' });
    manager.create({ name: 'Profile 2' });

    const profiles = manager.list();

    expect(profiles).toHaveLength(2);
  });

  it('should get profile by id', () => {
    const created = manager.create({ name: 'Test Profile' });
    const found = manager.get(created.id);

    expect(found).toBeDefined();
    expect(found?.name).toBe('Test Profile');
  });

  it('should update profile', () => {
    const profile = manager.create({ name: 'Old Name' });
    const updated = manager.update(profile.id, { name: 'New Name' });

    expect(updated?.name).toBe('New Name');
  });

  it('should delete profile', () => {
    const profile = manager.create({ name: 'To Delete' });
    const deleted = manager.delete(profile.id);

    expect(deleted).toBe(true);
    expect(manager.get(profile.id)).toBeUndefined();
  });

  it('should set default profile', () => {
    const profile1 = manager.create({ name: 'Profile 1' });
    const profile2 = manager.create({ name: 'Profile 2', isDefault: true });

    expect(manager.getDefault()?.id).toBe(profile2.id);

    manager.setDefault(profile1.id);

    expect(manager.getDefault()?.id).toBe(profile1.id);
  });

  it('should persist profiles', () => {
    manager.create({ name: 'Persistent Profile' });

    // Create new manager with same directory
    const newManager = new ProfileManager({ profilesDir: testDir });
    const profiles = newManager.list();

    expect(profiles).toHaveLength(1);
    expect(profiles[0].name).toBe('Persistent Profile');
  });
});
