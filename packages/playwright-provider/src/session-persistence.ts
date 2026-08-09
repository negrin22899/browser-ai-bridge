import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export interface PersistedSession {
  id: string;
  providerId: string;
  url: string;
  cookies?: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
  }>;
  localStorage?: Record<string, string>;
  createdAt: number;
  lastUsedAt: number;
}

export interface SessionPersistenceConfig {
  storageDir?: string;
  maxSessions?: number;
  sessionTTL?: number; // milliseconds
}

/**
 * Session Persistence - saves and restores browser sessions
 *
 * Stores session data (cookies, localStorage) to disk so users
 * don't need to re-login after restarting the application.
 */
export class SessionPersistence {
  private storageDir: string;
  private maxSessions: number;
  private sessionTTL: number;

  constructor(config?: SessionPersistenceConfig) {
    this.storageDir = config?.storageDir ?? path.join(
      os.homedir(),
      '.browser-ai-bridge',
      'sessions'
    );
    this.maxSessions = config?.maxSessions ?? 10;
    this.sessionTTL = config?.sessionTTL ?? 7 * 24 * 60 * 60 * 1000; // 7 days

    this.ensureStorageDir();
  }

  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private getSessionPath(sessionId: string): string {
    return path.join(this.storageDir, `${sessionId}.json`);
  }

  /**
   * Save a session to disk
   */
  async save(session: PersistedSession): Promise<void> {
    const filePath = this.getSessionPath(session.id);
    const data = {
      ...session,
      lastUsedAt: Date.now(),
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    // Clean up old sessions
    await this.cleanup();
  }

  /**
   * Load a session from disk
   */
  async load(sessionId: string): Promise<PersistedSession | null> {
    const filePath = this.getSessionPath(sessionId);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Check if session is expired
      if (Date.now() - data.lastUsedAt > this.sessionTTL) {
        await this.delete(sessionId);
        return null;
      }

      return data as PersistedSession;
    } catch {
      return null;
    }
  }

  /**
   * Delete a session from disk
   */
  async delete(sessionId: string): Promise<void> {
    const filePath = this.getSessionPath(sessionId);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * List all saved sessions
   */
  async list(): Promise<PersistedSession[]> {
    const sessions: PersistedSession[] = [];

    if (!fs.existsSync(this.storageDir)) {
      return sessions;
    }

    const files = fs.readdirSync(this.storageDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const filePath = path.join(this.storageDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Check if session is expired
        if (Date.now() - data.lastUsedAt > this.sessionTTL) {
          fs.unlinkSync(filePath);
          continue;
        }

        sessions.push(data as PersistedSession);
      } catch {
        // Skip invalid files
      }
    }

    return sessions.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  }

  /**
   * Find session by provider and URL
   */
  async findByProviderAndUrl(providerId: string, url: string): Promise<PersistedSession | null> {
    const sessions = await this.list();
    return sessions.find(s => s.providerId === providerId && s.url === url) ?? null;
  }

  /**
   * Clean up expired sessions
   */
  async cleanup(): Promise<void> {
    const sessions = await this.list();

    // Remove expired sessions (already done in list())

    // Remove excess sessions
    if (sessions.length > this.maxSessions) {
      const toRemove = sessions.slice(this.maxSessions);
      for (const session of toRemove) {
        await this.delete(session.id);
      }
    }
  }

  /**
   * Clear all sessions
   */
  async clearAll(): Promise<void> {
    if (!fs.existsSync(this.storageDir)) {
      return;
    }

    const files = fs.readdirSync(this.storageDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(this.storageDir, file));
      }
    }
  }
}
