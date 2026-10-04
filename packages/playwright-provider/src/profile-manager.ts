import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';

export interface BrowserProfile {
  id: string;
  name: string;
  browserType: 'chrome' | 'firefox' | 'edge';
  userDataDir: string;
  executablePath?: string;
  isDefault: boolean;
  createdAt: number;
  lastUsedAt: number;
}

export interface ProfileManagerConfig {
  profilesDir?: string;
}

/**
 * Profile Manager - manages multiple browser profiles
 *
 * Allows users to switch between different browser profiles
 * for different AI providers or accounts.
 */
export class ProfileManager {
  private profilesDir: string;
  private profiles: Map<string, BrowserProfile> = new Map();

  constructor(config?: ProfileManagerConfig) {
    this.profilesDir = config?.profilesDir ?? path.join(
      os.homedir(),
      '.browser-ai-bridge',
      'profiles'
    );

    this.ensureProfilesDir();
    this.loadProfiles();
  }

  private ensureProfilesDir(): void {
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true });
    }
  }

  private loadProfiles(): void {
    const indexPath = path.join(this.profilesDir, 'profiles.json');
    if (!fs.existsSync(indexPath)) return;

    try {
      const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      for (const profile of data) {
        this.profiles.set(profile.id, profile);
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  }

  private saveProfiles(): void {
    const indexPath = path.join(this.profilesDir, 'profiles.json');
    const data = Array.from(this.profiles.values());
    fs.writeFileSync(indexPath, JSON.stringify(data, null, 2));
  }

  /**
   * Create a new profile
   */
  create(options: {
    name: string;
    browserType?: 'chrome' | 'firefox' | 'edge';
    userDataDir?: string;
    executablePath?: string;
    isDefault?: boolean;
  }): BrowserProfile {
    const id = `profile-${randomUUID()}`;
    const browserType = options.browserType ?? 'chrome';

    const profile: BrowserProfile = {
      id,
      name: options.name,
      browserType,
      userDataDir: options.userDataDir ?? this.getDefaultUserDataDir(browserType),
      executablePath: options.executablePath,
      isDefault: options.isDefault ?? false,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    // If this is set as default, unset other defaults
    if (profile.isDefault) {
      for (const p of this.profiles.values()) {
        p.isDefault = false;
      }
    }

    this.profiles.set(id, profile);
    this.saveProfiles();

    return profile;
  }

  /**
   * Get a profile by ID
   */
  get(id: string): BrowserProfile | undefined {
    return this.profiles.get(id);
  }

  /**
   * Get the default profile
   */
  getDefault(): BrowserProfile | undefined {
    for (const profile of this.profiles.values()) {
      if (profile.isDefault) return profile;
    }
    return this.profiles.values().next().value;
  }

  /**
   * List all profiles
   */
  list(): BrowserProfile[] {
    return Array.from(this.profiles.values())
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  }

  /**
   * Update a profile
   */
  update(id: string, updates: Partial<BrowserProfile>): BrowserProfile | undefined {
    const profile = this.profiles.get(id);
    if (!profile) return undefined;

    Object.assign(profile, updates);

    // If this is set as default, unset other defaults
    if (updates.isDefault) {
      for (const p of this.profiles.values()) {
        if (p.id !== id) {
          p.isDefault = false;
        }
      }
    }

    this.saveProfiles();
    return profile;
  }

  /**
   * Delete a profile
   */
  delete(id: string): boolean {
    const profile = this.profiles.get(id);
    if (!profile) return false;

    this.profiles.delete(id);
    this.saveProfiles();

    return true;
  }

  /**
   * Set a profile as default
   */
  setDefault(id: string): boolean {
    const profile = this.profiles.get(id);
    if (!profile) return false;

    for (const p of this.profiles.values()) {
      p.isDefault = p.id === id;
    }

    this.saveProfiles();
    return true;
  }

  /**
   * Mark a profile as used
   */
  markUsed(id: string): void {
    const profile = this.profiles.get(id);
    if (profile) {
      profile.lastUsedAt = Date.now();
      this.saveProfiles();
    }
  }

  /**
   * Get default user data directory for browser type
   */
  private getDefaultUserDataDir(browserType: string): string {
    const platform = os.platform();
    const home = os.homedir();

    const paths: Record<string, Record<string, string>> = {
      chrome: {
        win32: path.join(home, 'AppData', 'Local', 'Google', 'Chrome', 'User Data'),
        darwin: path.join(home, 'Library', 'Application Support', 'Google', 'Chrome'),
        linux: path.join(home, '.config', 'google-chrome'),
      },
      firefox: {
        win32: path.join(home, 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles'),
        darwin: path.join(home, 'Library', 'Application Support', 'Firefox', 'Profiles'),
        linux: path.join(home, '.mozilla', 'firefox'),
      },
      edge: {
        win32: path.join(home, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data'),
        darwin: path.join(home, 'Library', 'Application Support', 'Microsoft Edge'),
        linux: path.join(home, '.config', 'microsoft-edge'),
      },
    };

    return paths[browserType]?.[platform] ?? '';
  }
}
